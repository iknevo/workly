import { TRPCError } from "@trpc/server";
import type { SearchObject } from "imapflow";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/config/env";
import { db } from "@/db";
import { applications, emails, mailAccounts } from "@/db/schema";
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

  const inserted: typeof emails.$inferSelect[] = [];
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
        let evaluatedThisQuery = 0;

        const uids = await session.search(query as SearchObject);
        totalListed += uids.length;
        if (totalListed > TOTAL_LIST_CAP) uids.length = Math.max(0, TOTAL_LIST_CAP - (totalListed - uids.length));

        const knownRows =
          uids.length > 0
            ? await db
                .select({ messageUid: emails.messageUid })
                .from(emails)
                .where(
                  and(eq(emails.mailAccountId, account.id), inArray(emails.messageUid, uids))
                )
            : [];
        const known = new Set(knownRows.map((r) => r.messageUid));

        for (const uid of uids) {
          if (evaluatedThisQuery >= PER_QUERY_EVAL_BUDGET) break;
          if (processed.has(uid) || known.has(uid)) continue;
          processed.add(uid);
          evaluatedThisQuery += 1;

          const fetched = await session.fetch(uid);
          if (!fetched) continue;
          if (isJunkLabels(fetched.labels)) continue;

          const from = formatEnvelopeAddress(fetched.envelope.from);
          const subject = fetched.envelope.subject ?? "";
          const snippet = await makeSnippet(fetched.source);
          const bodyText = await parseBodyText(fetched.source);

          const { include, score, reasons } = evaluateEmail({
            from,
            subject,
            snippet,
            context,
          });
          if (!include) continue;

          const [email] = await db
            .insert(emails)
            .values({
              applicationId: application.id,
              mailAccountId: account.id,
              messageUid: uid,
              threadId: null,
              subject: subject || null,
              fromEmail: from || null,
              toEmail: formatEnvelopeAddress(fetched.envelope.to) || null,
              senderEmail: parseEmailAddress(from) || null,
              snippet: snippet || null,
              bodyText: bodyText || null,
              relevanceScore: score,
              matchReasons: reasons,
              internalDate: fetched.internalDate ?? fetched.envelope.date ?? null,
              isRead: fetched.flags.has("\\Seen"),
            })
            .onConflictDoNothing()
            .returning();

          if (email) inserted.push(email);
        }
      }
    } catch (err) {
      console.error("IMAP sync error", err);
    } finally {
      session.release();
      await session.close();
    }
  }

  const existing = await db
    .select({
      id: emails.id,
      fromEmail: emails.fromEmail,
      subject: emails.subject,
      snippet: emails.snippet,
    })
    .from(emails)
    .where(eq(emails.applicationId, applicationId));

  const stale: string[] = [];
  for (const email of existing) {
    const { include } = evaluateEmail({
      from: email.fromEmail ?? "",
      subject: email.subject ?? "",
      snippet: email.snippet ?? "",
      context,
    });
    if (!include) stale.push(email.id);
  }

  if (stale.length > 0) {
    const deleted = await db
      .delete(emails)
      .where(inArray(emails.id, stale))
      .returning({ id: emails.id });
    removedCount = deleted.length;
  }

  return { insertedCount: inserted.length, removedCount };
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
        .select()
        .from(emails)
        .where(eq(emails.applicationId, input.applicationId))
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
          applicationId: emails.applicationId,
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

      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(eq(applications.id, email.applicationId), eq(applications.userId, ctx.user.id))
        )
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

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
        .returning({ id: applications.id });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await performSync(ctx.user.id, input.applicationId);
      return { ...updated, ...result };
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

      await db.delete(emails).where(eq(emails.applicationId, input.applicationId));
      return performSync(ctx.user.id, input.applicationId);
    }),

  hideEmail: protectedProcedure
    .input(z.object({ emailId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [email] = await db
        .select({
          id: emails.id,
          applicationId: emails.applicationId,
          senderEmail: emails.senderEmail,
        })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);
      if (!email) throw new TRPCError({ code: "NOT_FOUND" });

      const [application] = await db
        .select({ id: applications.id, mailExclusions: applications.mailExclusions })
        .from(applications)
        .where(
          and(eq(applications.id, email.applicationId), eq(applications.userId, ctx.user.id))
        )
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(emails).set({ isHidden: true }).where(eq(emails.id, email.id));

      const senderEmail = email.senderEmail?.trim().toLowerCase();
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
    .input(z.object({ emailId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [email] = await db
        .select({
          id: emails.id,
          applicationId: emails.applicationId,
          senderEmail: emails.senderEmail,
        })
        .from(emails)
        .where(eq(emails.id, input.emailId))
        .limit(1);
      if (!email) throw new TRPCError({ code: "NOT_FOUND" });

      const [application] = await db
        .select({ id: applications.id, mailExclusions: applications.mailExclusions })
        .from(applications)
        .where(
          and(eq(applications.id, email.applicationId), eq(applications.userId, ctx.user.id))
        )
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(emails).set({ isHidden: false }).where(eq(emails.id, email.id));

      const senderEmail = email.senderEmail?.trim().toLowerCase();
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
