import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { google } from "googleapis";
import { z } from "zod";

import { db } from "@/db";
import { applications, emails, gmailAccounts } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { getGmailAuthUrl, getOAuthClient, isGmailConfigured } from "@/lib/gmail";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const mailRouter = createTRPCRouter({
  isConfigured: protectedProcedure.query(async () => {
    return { configured: isGmailConfigured() };
  }),

  getAuthUrl: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isGmailConfigured()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Gmail integration is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment.",
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
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)))
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(emails)
        .where(eq(emails.applicationId, input.applicationId))
        .orderBy(emails.internalDate);
    }),

  sync: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [application] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)))
        .limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const accounts = await db
        .select()
        .from(gmailAccounts)
        .where(eq(gmailAccounts.userId, ctx.user.id));

      if (accounts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connect a Gmail account first.",
        });
      }

      const query = application.mailSearchQuery || `"${application.company}"`;
      const inserted: typeof emails.$inferSelect[] = [];

      for (const account of accounts) {
        try {
          const oauth2Client = getOAuthClient();
          oauth2Client.setCredentials({
            refresh_token: decrypt(account.refreshToken),
          });

          const gmail = google.gmail({ version: "v1", auth: oauth2Client });
          const res = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100,
          });

          const messages = res.data.messages ?? [];
          for (const message of messages) {
            if (!message.id) continue;
            const detail = await gmail.users.messages.get({ userId: "me", id: message.id, format: "metadata", metadataHeaders: ["Subject", "From", "To"] });
            const headers = detail.data.payload?.headers ?? [];
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

            const internalDate = detail.data.internalDate ? new Date(Number(detail.data.internalDate)) : null;

            const [existing] = await db
              .select({ id: emails.id })
              .from(emails)
              .where(eq(emails.gmailMessageId, message.id))
              .limit(1);

            if (existing) continue;

            const [email] = await db
              .insert(emails)
              .values({
                applicationId: application.id,
                gmailAccountId: account.id,
                gmailMessageId: message.id,
                threadId: detail.data.threadId ?? null,
                subject: getHeader("Subject") ?? null,
                fromEmail: getHeader("From") ?? null,
                toEmail: getHeader("To") ?? null,
                snippet: detail.data.snippet ?? null,
                internalDate,
              })
              .onConflictDoNothing()
              .returning();

            if (email) inserted.push(email);
          }
        } catch (err) {
          console.error("Gmail sync error", err);
        }
      }

      return { insertedCount: inserted.length };
    }),
});
