import { TRPCError } from "@trpc/server";
import { type SQLWrapper, and, asc, count, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { z } from "zod";

import { generateTailoredResume } from "@/lib/ai";
import { decrypt } from "@/lib/encryption";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildResumeLatex, hasResumeData } from "@/lib/resume";

import { env } from "@/config/env";
import { db } from "@/db";
import {
  applicationResumes,
  applicationStatus,
  applications,
  insertApplicationSchema,
  resumes,
  updateApplicationSchema,
  users,
} from "@/db/schema";
import { APPLICATIONS_PAGE_SIZE } from "@/modules/applications/constants";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export const applicationsRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    return db
      .select()
      .from(applications)
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.appliedAt), desc(applications.createdAt));
  }),

  getPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(APPLICATIONS_PAGE_SIZE),
        status: z.enum(applicationStatus.enumValues).optional(),
        source: z.string().min(1).optional(),
        search: z.string().trim().max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      const conditions: (SQLWrapper | undefined)[] = [eq(applications.userId, user.id)];
      if (input.status) conditions.push(eq(applications.status, input.status));
      if (input.source) conditions.push(eq(applications.source, input.source));
      if (input.search) {
        const term = `%${escapeLike(input.search)}%`;
        conditions.push(
          or(
            ilike(applications.company, term),
            ilike(applications.position, term),
            ilike(applications.location, term),
            ilike(applications.source, term)
          )
        );
      }
      const where = and(...conditions);

      const [items, totals] = await Promise.all([
        db
          .select()
          .from(applications)
          .where(where)
          .orderBy(desc(applications.appliedAt), desc(applications.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ total: count() }).from(applications).where(where),
      ]);

      return { items, total: totals[0]?.total ?? 0 };
    }),

  getSources: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .selectDistinct({ source: applications.source })
      .from(applications)
      .where(and(eq(applications.userId, ctx.user.id), isNotNull(applications.source)))
      .orderBy(asc(applications.source));

    return rows.map((row) => row.source).filter((source): source is string => source !== null);
  }),

  getOne: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const { user } = ctx;

    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, input.id), eq(applications.userId, user.id)))
      .limit(1);

    if (!application) throw new TRPCError({ code: "NOT_FOUND" });
    return application;
  }),

  getResumes: protectedProcedure
    .input(z.object({ applicationId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      const [application] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(applicationResumes)
        .where(eq(applicationResumes.applicationId, input.applicationId))
        .orderBy(desc(applicationResumes.createdAt));
    }),

  getResume: protectedProcedure
    .input(z.object({ resumeId: z.uuid(), applicationId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      const [application] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const [resume] = await db
        .select()
        .from(applicationResumes)
        .where(
          and(
            eq(applicationResumes.id, input.resumeId),
            eq(applicationResumes.applicationId, input.applicationId)
          )
        )
        .limit(1);

      if (!resume) throw new TRPCError({ code: "NOT_FOUND" });
      return resume;
    }),

  create: protectedProcedure
    .input(insertApplicationSchema.omit({ userId: true }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [application] = await db
        .insert(applications)
        .values({
          userId: user.id,
          company: input.company,
          position: input.position,
          location: input.location || null,
          url: input.url || null,
          status: input.status ?? "draft",
          salary: input.salary || null,
          appliedAt: input.appliedAt || null,
          source: input.source || null,
          jobDescription: input.jobDescription || null,
          notes: input.notes || null,
          baseResumeId: input.baseResumeId || null,
          mailKeywords: (input.mailKeywords as string[] | undefined) ?? [],
          mailExclusions: (input.mailExclusions as string[] | undefined) ?? [],
        })
        .returning();

      return application;
    }),

  update: protectedProcedure
    .input(updateApplicationSchema.extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const set: {
        company?: string;
        position?: string;
        location?: string | null;
        url?: string | null;
        status?: typeof applications.$inferSelect.status;
        salary?: string | null;
        appliedAt?: Date | null;
        source?: string | null;
        jobDescription?: string | null;
        notes?: string | null;
        baseResumeId?: string | null;
        mailKeywords?: string[];
        mailExclusions?: string[];
        updatedAt: Date;
      } = {
        company: input.company,
        position: input.position,
        location: input.location || null,
        url: input.url || null,
        status: input.status,
        salary: input.salary || null,
        appliedAt: input.appliedAt || null,
        source: input.source || null,
        jobDescription: input.jobDescription || null,
        notes: input.notes || null,
        baseResumeId: input.baseResumeId || null,
        updatedAt: new Date(),
      };

      if (input.mailKeywords !== undefined) {
        set.mailKeywords = (input.mailKeywords as string[] | undefined) ?? [];
      }

      if (input.mailExclusions !== undefined) {
        set.mailExclusions = (input.mailExclusions as string[] | undefined) ?? [];
      }

      const [updated] = await db
        .update(applications)
        .set(set)
        .where(and(eq(applications.id, input.id), eq(applications.userId, user.id)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  remove: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    const [deleted] = await db
      .delete(applications)
      .where(and(eq(applications.id, input.id), eq(applications.userId, user.id)))
      .returning();

    if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
    return deleted;
  }),

  generateResume: protectedProcedure
    .input(
      z.object({
        applicationId: z.uuid(),
        baseResumeId: z.uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const limit = await checkRateLimit(`ai:${user.id}`);
      if (!limit.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "AI generation rate limit exceeded. Please try again later.",
        });
      }

      const [application] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      let baseContent: string;
      let baseResumeId: string | null = null;

      if (input.baseResumeId) {
        const [baseResume] = await db
          .select()
          .from(resumes)
          .where(and(eq(resumes.id, input.baseResumeId), eq(resumes.userId, user.id)))
          .limit(1);

        if (!baseResume) throw new TRPCError({ code: "NOT_FOUND" });

        baseContent = baseResume.content;
        baseResumeId = baseResume.id;
      } else {
        if (!hasResumeData(user)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Your profile needs some content first. Add your experience, skills, or projects on the Profile page.",
          });
        }
        baseContent = buildResumeLatex(user);
      }

      if (!application.jobDescription) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add a job description to the application before generating a resume.",
        });
      }

      const [userRow] = await db
        .select({ aiApiKey: users.aiApiKey })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const userApiKey = userRow?.aiApiKey ? decrypt(userRow.aiApiKey) : null;

      if (!userApiKey && !env.GROQ_API_KEY) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Add your Groq API key in Settings to use AI resume tailoring.",
        });
      }

      const content = await generateTailoredResume(
        {
          baseResume: baseContent,
          jobDescription: application.jobDescription,
          company: application.company,
          position: application.position,
        },
        userApiKey ?? undefined
      );

      const [applicationResume] = await db
        .insert(applicationResumes)
        .values({
          applicationId: application.id,
          baseResumeId,
          content,
          model: "openai/gpt-oss-120b",
          jobDescriptionSnapshot: application.jobDescription,
        })
        .returning();

      return applicationResume;
    }),

  updateResume: protectedProcedure
    .input(
      z.object({
        resumeId: z.uuid(),
        applicationId: z.uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(applicationResumes)
        .set({ content: input.content, updatedAt: new Date() })
        .where(
          and(
            eq(applicationResumes.id, input.resumeId),
            eq(applicationResumes.applicationId, input.applicationId)
          )
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  deleteResume: protectedProcedure
    .input(z.object({ resumeId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [resume] = await db
        .select({ id: applicationResumes.id, applicationId: applicationResumes.applicationId })
        .from(applicationResumes)
        .where(eq(applicationResumes.id, input.resumeId))
        .limit(1);

      if (!resume) throw new TRPCError({ code: "NOT_FOUND" });

      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, resume.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const [deleted] = await db
        .delete(applicationResumes)
        .where(eq(applicationResumes.id, input.resumeId))
        .returning();

      return deleted;
    }),
});

export type { applicationResumes };
