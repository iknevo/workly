import { TRPCError } from "@trpc/server";
import type { SearchObject } from "imapflow";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/config/env";
import { db } from "@/db";
import { applications, emailApplications, emails, mailAccounts } from "@/db/schema";
import {
  buildImapSearchQueries,
  companyPhrase,
  evaluateEmail,
  isJunkLabels,
  parseEmailAddress,
  type ScoreContext,
} from "@/lib/email-matching";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  formatEnvelopeAddress,
  ImapSession,
  makeSnippet,
  parseBodyText,
  resolveImapConfig,
  verifyConnection,
  type MailProvider,
} from "@/lib/imap";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const PER_QUERY_EVAL_BUDGET = 100;
const TOTAL_LIST_CAP = 2000;

function friendlyImapError(err: unknown, provider: MailProvider): string {
  const error = err as
    | (Error & {
        authenticationFailed?: boolean;
        serverResponseCode?: string;
        responseText?: string;
        responseStatus?: string;
      })
    | undefined;
  const message = error?.message ?? String(err);
  const responseText = error?.responseText ?? "";
  const lower = `${message} ${responseText}`.toLowerCase();

  if (
    error?.authenticationFailed ||
    error?.serverResponseCode === "AUTHENTICATIONFAILED" ||
    lower.includes("invalid credentials") ||
    lower.includes("authentication failed")
  ) {
    return `Sign-in failed for ${provider}. Check the email and app password, and make sure 2-Step Verification is enabled for the account.`;
  }
  if (
    lower.includes("imap") &&
    (lower.includes("disabled") || lower.includes("not enabled") || lower.includes("permission"))
  ) {
    return "IMAP access is disabled for this account. Enable it: Gmail Settings → Forwarding and POP/IMAP → Enable IMAP.";
  }
  return `Could not connect to ${provider}: ${message}`;
}

async function performSync(userId: string, applicationId: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
    .limit(1);
  if (!application) throw new TRPCError({ code: "NOT_FOUND" });

  const accounts = await db.select().from(mailAccounts).where(eq(mailAccounts.userId, userId));
  if (accounts.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Connect an email account first." });
  }

  const keywords = (application.mailKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  const exclusions = (application.mailExclusions ?? []).map((e) => e.trim()).filter(Boolean);

  const context: ScoreContext = {
    companyPhrase: companyPhrase(application.company),
    keywords,
  };

  let insertedCount = 0;
  let removedCount = 0;

  for (const account of accounts) {
    const config = resolveImapConfig({
      provider: account.provider as MailProvider,
      email: account.email,
      appPassword: decrypt(account.appPassword),
      host: account.host,
      port: account.port,
      folder: account.folder,
    });

    const session = new ImapSession(config);
    try {
      await session.connect();
      const folder = await session.resolveFolder();
      await session.open(folder);

      const queries = buildImapSearchQueries({
        company: application.company,
        keywords,
        exclusions,
        gmail: account.provider === "gmail",
      });

      const processed = new Set<number>();
      let totalListed = 0;

      for (const query of queries) {
        let fetchedThisQuery = 0;

        const uids = await session.search(query as SearchObject);
        totalListed += uids.length;
        if (totalListed > TOTAL_LIST_CAP) uids.length = Math.max(0, TOTAL_LIST_CAP - (totalListed - uids.length));

        const existingRows =
          uids.length > 0
            ? await db
                .select({
                  id: emails.id,
                  messageUid: emails.messageUid,
                  fromEmail: emails.fromEmail,
                  subject: emails.subject,
                  snippet: emails.snippet,
                })
                .from(emails)
                .where(
                  and(eq(emails.mailAccountId, account.id), inArray(emails.messageUid, uids))
                )
            : [];
        const byUid = new Map(existingRows.map((r) => [r.messageUid, r]));

        for (const uid of uids) {
          if (processed.has(uid)) continue;
          processed.add(uid);

          let existing = byUid.get(uid);
          let from = existing?.fromEmail ?? "";
          let subject = existing?.subject ?? "";
          let snippet = existing?.snippet ?? "";

          if (!existing) {
            if (fetchedThisQuery >= PER_QUERY_EVAL_BUDGET) break;
            fetchedThisQuery += 1;

            const fetched = await session.fetch(uid);
            if (!fetched) continue;
            if (isJunkLabels(fetched.labels)) continue;

            from = formatEnvelopeAddress(fetched.envelope.from);
            subject = fetched.envelope.subject ?? "";
            snippet = await makeSnippet(fetched.source);
            const bodyText = await parseBodyText(fetched.source);

            const [email] = await db
              .insert(emails)
              .values({
                userId,
                mailAccountId: account.id,
                messageUid: uid,
                threadId: null,
                subject: subject || null,
                fromEmail: from || null,
                toEmail: formatEnvelopeAddress(fetched.envelope.to) || null,
                senderEmail: parseEmailAddress(from) || null,
                snippet: snippet || null,
                bodyText: bodyText || null,
                internalDate: fetched.internalDate ?? fetched.envelope.date ?? null,
                isRead: fetched.flags.has("\\Seen"),
              })
              .onConflictDoNothing()
              .returning({ id: emails.id });

            if (email) {
              existing = { id: email.id, messageUid: uid, fromEmail: from, subject, snippet };
            } else {
              const [row] = await db
                .select({
                  id: emails.id,
                  messageUid: emails.messageUid,
                  fromEmail: emails.fromEmail,
                  subject: emails.subject,
                  snippet: emails.snippet,
                })
                .from(emails)
                .where(
                  and(eq(emails.mailAccountId, account.id), eq(emails.messageUid, uid))
                )
                .limit(1);
              existing = row ?? undefined;
            }
          }

          if (!existing) continue;

          const { include, score, reasons } = evaluateEmail({
            from,
            subject,
            snippet,
            context,
          });
          if (!include) continue;

          const [link] = await db
            .insert(emailApplications)
            .values({
              emailId: existing.id,
              applicationId: application.id,
              relevanceScore: score,
              matchReasons: reasons,
            })
            .onConflictDoNothing()
            .returning({ id: emailApplications.id });

          if (link) insertedCount += 1;
        }
      }
    } catch (err) {
      console.error("IMAP sync error", err);
    } finally {
      session.release();
      await session.close();
    }
  }

  const links = await db
    .select({
      id: emailApplications.id,
      fromEmail: emails.fromEmail,
      subject: emails.subject,
      snippet: emails.snippet,
    })
    .from(emailApplications)
    .innerJoin(emails, eq(emailApplications.emailId, emails.id))
    .where(eq(emailApplications.applicationId, applicationId));

  const stale: string[] = [];
  for (const link of links) {
    const { include } = evaluateEmail({
      from: link.fromEmail ?? "",
      subject: link.subject ?? "",
      snippet: link.snippet ?? "",
      context,
    });
    if (!include) stale.push(link.id);
  }

  if (stale.length > 0) {
    const deleted = await db
      .delete(emailApplications)
      .where(inArray(emailApplications.id, stale))
      .returning({ id: emailApplications.id });
    removedCount = deleted.length;
  }

  return { insertedCount, removedCount };
}

const LINK_CHUNK_SIZE = 500;

async function reevaluateStoredEmails(
  userId: string,
  applicationId: string,
  context: ScoreContext
) {
  const stored = await db
    .select({
      id: emails.id,
      fromEmail: emails.fromEmail,
      subject: emails.subject,
      snippet: emails.snippet,
    })
    .from(emails)
    .where(eq(emails.userId, userId));

  const links = await db
    .select({ id: emailApplications.id, emailId: emailApplications.emailId })
    .from(emailApplications)
    .where(eq(emailApplications.applicationId, applicationId));

  const linkByEmailId = new Map(links.map((link) => [link.emailId, link]));
  const keepLinkIds = new Set<string>();

  const inserts: {
    emailId: string;
    applicationId: string;
    relevanceScore: number;
    matchReasons: string[];
  }[] = [];

  for (const row of stored) {
    const { include, score, reasons } = evaluateEmail({
      from: row.fromEmail ?? "",
      subject: row.subject ?? "",
      snippet: row.snippet ?? "",
      context,
    });
    if (!include) continue;

    const link = linkByEmailId.get(row.id);
    if (link) {
      keepLinkIds.add(link.id);
    } else {
      inserts.push({
        emailId: row.id,
        applicationId,
        relevanceScore: score,
        matchReasons: reasons,
      });
    }
  }

  let insertedCount = 0;
  for (let i = 0; i < inserts.length; i += LINK_CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + LINK_CHUNK_SIZE);
    const created = await db
      .insert(emailApplications)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: emailApplications.id });
    insertedCount += created.length;
  }

  const staleIds = links.filter((link) => !keepLinkIds.has(link.id)).map((link) => link.id);
  let removedCount = 0;
  for (let i = 0; i < staleIds.length; i += LINK_CHUNK_SIZE) {
    const chunk = staleIds.slice(i, i + LINK_CHUNK_SIZE);
    const deleted = await db
      .delete(emailApplications)
      .where(inArray(emailApplications.id, chunk))
      .returning({ id: emailApplications.id });
    removedCount += deleted.length;
  }

  return { insertedCount, removedCount };
}

export const mailRouter = createTRPCRouter({
  isConfigured: protectedProcedure.query(async () => {
    return { configured: Boolean(env.ENCRYPTION_KEY) };
  }),

  connect: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        appPassword: z.string().min(1, "App password is required"),
        provider: z.enum(["gmail", "outlook", "yahoo", "icloud", "imap"]),
        host: z.string().trim().optional(),
        port: z.number().int().min(1).max(65535).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.ENCRYPTION_KEY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Email integration is not configured. Add ENCRYPTION_KEY to your environment.",
        });
      }

      const config = resolveImapConfig(input);
      if (input.provider === "imap" && !config.host) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom IMAP requires a server host.",
        });
      }

      let verified;
      try {
        verified = await verifyConnection(config);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: friendlyImapError(err, config.provider),
        });
      }

      const folder =
        config.provider === "gmail"
          ? verified.allMailPath ?? "[Gmail]/All Mail"
          : config.folder;

      const [account] = await db
        .insert(mailAccounts)
        .values({
          userId: ctx.user.id,
          email: config.email,
          provider: config.provider,
          host: config.host,
          port: config.port,
          appPassword: encrypt(config.appPassword),
          folder,
        })
        .onConflictDoUpdate({
          target: [mailAccounts.userId, mailAccounts.email],
          set: {
            provider: config.provider,
            host: config.host,
            port: config.port,
            appPassword: encrypt(config.appPassword),
            folder,
            updatedAt: new Date(),
          },
        })
        .returning({ id: mailAccounts.id, email: mailAccounts.email, provider: mailAccounts.provider });

      return account;
    }),

  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: mailAccounts.id,
        email: mailAccounts.email,
        provider: mailAccounts.provider,
        createdAt: mailAccounts.createdAt,
      })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, ctx.user.id));
  }),

  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(mailAccounts)
        .where(and(eq(mailAccounts.id, input.accountId), eq(mailAccounts.userId, ctx.user.id)))
        .returning({ id: mailAccounts.id });
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),

  getForApplication: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [application] = await db
        .select({
          id: applications.id,
          company: applications.company,
          mailKeywords: applications.mailKeywords,
        })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)))
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const emailRows = await db
        .select({
          id: emails.id,
          mailAccountId: emails.mailAccountId,
          messageUid: emails.messageUid,
          threadId: emails.threadId,
          subject: emails.subject,
          fromEmail: emails.fromEmail,
          toEmail: emails.toEmail,
          senderEmail: emails.senderEmail,
          snippet: emails.snippet,
          bodyText: emails.bodyText,
          internalDate: emails.internalDate,
          isRead: emails.isRead,
          relevanceScore: emailApplications.relevanceScore,
          matchReasons: emailApplications.matchReasons,
          isHidden: emailApplications.isHidden,
        })
        .from(emailApplications)
        .innerJoin(emails, eq(emailApplications.emailId, emails.id))
        .where(eq(emailApplications.applicationId, input.applicationId))
        .orderBy(emails.internalDate);

      return {
        company: application.company,
        keywords: application.mailKeywords ?? [],
        emails: emailRows,
      };
    }),

  getEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [email] = await db
        .select({
          id: emails.id,
          userId: emails.userId,
          messageUid: emails.messageUid,
          bodyText: emails.bodyText,
          account: {
            id: mailAccounts.id,
            provider: mailAccounts.provider,
            email: mailAccounts.email,
            appPassword: mailAccounts.appPassword,
            host: mailAccounts.host,
            port: mailAccounts.port,
            folder: mailAccounts.folder,
          },
        })
        .from(emails)
        .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
        .where(eq(emails.id, input.emailId))
        .limit(1);
      if (!email) throw new TRPCError({ code: "NOT_FOUND" });

      if (email.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      if (email.bodyText) return { bodyText: email.bodyText };

      const config = resolveImapConfig({
        provider: email.account.provider as MailProvider,
        email: email.account.email,
        appPassword: decrypt(email.account.appPassword),
        host: email.account.host,
        port: email.account.port,
        folder: email.account.folder,
      });

      const session = new ImapSession(config);
      try {
        await session.connect();
        const folder = await session.resolveFolder();
        await session.open(folder);
        const fetched = await session.fetch(email.messageUid, { sourceMaxLength: 1_000_000 });
        const bodyText = fetched ? await parseBodyText(fetched.source) : "";
        if (bodyText) {
          await db.update(emails).set({ bodyText, updatedAt: new Date() }).where(eq(emails.id, email.id));
        }
        return { bodyText: bodyText || null };
      } catch (err) {
        console.error("IMAP email fetch error", err);
        return { bodyText: null };
      } finally {
        session.release();
        await session.close();
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(emails)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(eq(emails.id, input.emailId), eq(emails.userId, ctx.user.id)))
        .returning({ id: emails.id });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  updateKeywords: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid(), keywords: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const seen = new Set<string>();
      const keywords: string[] = [];
      for (const raw of input.keywords) {
        const keyword = raw.trim();
        if (!keyword) continue;
        const key = keyword.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        keywords.push(keyword);
      }

      const [updated] = await db
        .update(applications)
        .set({ mailKeywords: keywords, updatedAt: new Date() })
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)))
        .returning({ id: applications.id, company: applications.company });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await reevaluateStoredEmails(ctx.user.id, input.applicationId, {
        companyPhrase: companyPhrase(updated.company),
        keywords,
      });
      return { ...updated, ...result, needsSync: true };
    }),

  sync: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return performSync(ctx.user.id, input.applicationId);
    }),

  rematch: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)))
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(emailApplications).where(eq(emailApplications.applicationId, input.applicationId));
      return performSync(ctx.user.id, input.applicationId);
    }),

  hideEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid(), applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [application] = await db
        .select({ id: applications.id, mailExclusions: applications.mailExclusions })
        .from(applications)
        .where(
          and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id))
        )
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const [link] = await db
        .select({
          id: emailApplications.id,
          emailId: emailApplications.emailId,
          senderEmail: emails.senderEmail,
        })
        .from(emailApplications)
        .innerJoin(emails, eq(emailApplications.emailId, emails.id))
        .where(
          and(
            eq(emailApplications.emailId, input.emailId),
            eq(emailApplications.applicationId, input.applicationId)
          )
        )
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(emailApplications)
        .set({ isHidden: true, updatedAt: new Date() })
        .where(eq(emailApplications.id, link.id));

      const senderEmail = link.senderEmail?.trim().toLowerCase();
      if (senderEmail) {
        const exclusions = application.mailExclusions ?? [];
        if (!exclusions.includes(senderEmail)) {
          await db
            .update(applications)
            .set({ mailExclusions: [...exclusions, senderEmail], updatedAt: new Date() })
            .where(eq(applications.id, application.id));
        }
      }

      return { ok: true };
    }),

  unhideEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid(), applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [application] = await db
        .select({ id: applications.id, mailExclusions: applications.mailExclusions })
        .from(applications)
        .where(
          and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id))
        )
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const [link] = await db
        .select({
          id: emailApplications.id,
          emailId: emailApplications.emailId,
          senderEmail: emails.senderEmail,
        })
        .from(emailApplications)
        .innerJoin(emails, eq(emailApplications.emailId, emails.id))
        .where(
          and(
            eq(emailApplications.emailId, input.emailId),
            eq(emailApplications.applicationId, input.applicationId)
          )
        )
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(emailApplications)
        .set({ isHidden: false, updatedAt: new Date() })
        .where(eq(emailApplications.id, link.id));

      const senderEmail = link.senderEmail?.trim().toLowerCase();
      if (senderEmail) {
        const exclusions = application.mailExclusions ?? [];
        const next = exclusions.filter((e) => e.trim().toLowerCase() !== senderEmail);
        if (next.length !== exclusions.length) {
          await db
            .update(applications)
            .set({ mailExclusions: next, updatedAt: new Date() })
            .where(eq(applications.id, application.id));
        }
      }

      return { ok: true };
    }),
});
