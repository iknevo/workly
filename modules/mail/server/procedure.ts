import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { google } from "googleapis";
import { z } from "zod";

import { db } from "@/db";
import { applications, emails, gmailAccounts } from "@/db/schema";
import {
  buildSearchQueries,
  companyPhrase,
  evaluateEmail,
  isJunkLabels,
  parseEmailAddress,
  type ScoreContext,
} from "@/lib/email-matching";
import { decrypt } from "@/lib/encryption";
import { getGmailAuthUrl, getOAuthClient, isGmailConfigured } from "@/lib/gmail";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const PER_QUERY_EVAL_BUDGET = 100;
const TOTAL_LIST_CAP = 2000;

async function performSync(userId: string, applicationId: string) {
  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
    .limit(1);
  if (!application) throw new TRPCError({ code: "NOT_FOUND" });

  const accounts = await db.select().from(gmailAccounts).where(eq(gmailAccounts.userId, userId));
  if (accounts.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Connect a Gmail account first." });
  }

  const keywords = (application.mailKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  const exclusions = (application.mailExclusions ?? []).map((e) => e.trim()).filter(Boolean);
  const queries = buildSearchQueries({
    company: application.company,
    keywords,
    exclusions,
  });

  const context: ScoreContext = {
    companyPhrase: companyPhrase(application.company),
    keywords,
  };

  const inserted: typeof emails.$inferSelect[] = [];
  let removedCount = 0;

  for (const account of accounts) {
    try {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ refresh_token: decrypt(account.refreshToken) });
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const processed = new Set<string>();
      let totalListed = 0;

      for (const query of queries) {
        let evaluatedThisQuery = 0;
        let pageToken: string | undefined;
        let exhausted = false;

        while (
          !exhausted &&
          evaluatedThisQuery < PER_QUERY_EVAL_BUDGET &&
          totalListed < TOTAL_LIST_CAP
        ) {
          const res = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100,
            pageToken,
            fields: "messages(id,threadId,labelIds),nextPageToken",
          });

          const messages = (res.data.messages ?? []).filter(
            (m): m is { id: string; threadId?: string | null; labelIds?: string[] | null } =>
              Boolean(m.id)
          );
          totalListed += messages.length;

          const ids = messages.map((m) => m.id);
          const knownRows =
            ids.length > 0
              ? await db
                  .select({ gmailMessageId: emails.gmailMessageId })
                  .from(emails)
                  .where(
                    and(
                      eq(emails.gmailAccountId, account.id),
                      inArray(emails.gmailMessageId, ids)
                    )
                  )
              : [];
          const known = new Set(knownRows.map((r) => r.gmailMessageId));

          for (const message of messages) {
            if (evaluatedThisQuery >= PER_QUERY_EVAL_BUDGET) break;
            if (processed.has(message.id) || known.has(message.id)) continue;
            processed.add(message.id);

            if (isJunkLabels(message.labelIds ?? [])) continue;
            evaluatedThisQuery += 1;

            const detail = await gmail.users.messages.get({
              userId: "me",
              id: message.id,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "To"],
            });
            const headers = detail.data.payload?.headers ?? [];
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

            const from = getHeader("From") ?? "";
            const subject = getHeader("Subject") ?? "";
            const internalDate = detail.data.internalDate
              ? new Date(Number(detail.data.internalDate))
              : null;

            const { include, score, reasons } = evaluateEmail({
              from,
              subject,
              snippet: detail.data.snippet ?? "",
              context,
            });
            if (!include) continue;

            const [email] = await db
              .insert(emails)
              .values({
                applicationId: application.id,
                gmailAccountId: account.id,
                gmailMessageId: message.id,
                threadId: detail.data.threadId ?? null,
                subject: subject || null,
                fromEmail: from || null,
                toEmail: getHeader("To") ?? null,
                senderEmail: parseEmailAddress(from) || null,
                snippet: detail.data.snippet ?? null,
                relevanceScore: score,
                matchReasons: reasons,
                internalDate,
              })
              .onConflictDoNothing()
              .returning();

            if (email) inserted.push(email);
          }

          pageToken = res.data.nextPageToken ?? undefined;
          exhausted = !pageToken;
        }
      }
    } catch (err) {
      console.error("Gmail sync error", err);
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
    return { configured: isGmailConfigured() };
  }),

  getAuthUrl: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isGmailConfigured()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Gmail integration is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment.",
      });
    }
    return getGmailAuthUrl(ctx.user.id);
  }),

  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({ id: gmailAccounts.id, email: gmailAccounts.email, createdAt: gmailAccounts.createdAt })
      .from(gmailAccounts)
      .where(eq(gmailAccounts.userId, ctx.user.id));
  }),

  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(gmailAccounts)
        .where(and(eq(gmailAccounts.id, input.accountId), eq(gmailAccounts.userId, ctx.user.id)))
        .returning({ id: gmailAccounts.id });
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
