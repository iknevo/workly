import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { generateTailoredResume } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildResumeLatex, hasResumeData } from "@/lib/resume";

import { db } from "@/db";
import {
  applicationResumes,
  applications,
  events,
  insertApplicationSchema,
  resumes,
  updateApplicationSchema,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const applicationsRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    return db
      .select()
      .from(applications)
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.updatedAt));
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
    .input(z.object({ applicationId: z.string().uuid() }))
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
    .input(z.object({ resumeId: z.string().uuid(), applicationId: z.string().uuid() }))
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
          jobDescription: input.jobDescription || null,
          notes: input.notes || null,
          baseResumeId: input.baseResumeId || null,
          mailKeywords: (input.mailKeywords as string[] | undefined) ?? [],
        })
        .returning();

      return application;
    }),

  update: protectedProcedure
    .input(updateApplicationSchema.extend({ id: z.string().uuid() }))
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
        jobDescription?: string | null;
        notes?: string | null;
        baseResumeId?: string | null;
        mailKeywords?: string[];
        updatedAt: Date;
      } = {
        company: input.company,
        position: input.position,
        location: input.location || null,
        url: input.url || null,
        status: input.status,
        salary: input.salary || null,
        appliedAt: input.appliedAt || null,
        jobDescription: input.jobDescription || null,
        notes: input.notes || null,
        baseResumeId: input.baseResumeId || null,
        updatedAt: new Date(),
      };

      if (input.mailKeywords !== undefined) {
        set.mailKeywords = (input.mailKeywords as string[] | undefined) ?? [];
      }

      const [updated] = await db
        .update(applications)
        .set(set)
        .where(and(eq(applications.id, input.id), eq(applications.userId, user.id)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
        applicationId: z.string().uuid(),
        baseResumeId: z.string().uuid().optional(),
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

      const content = await generateTailoredResume({
        baseResume: baseContent,
        jobDescription: application.jobDescription,
        company: application.company,
        position: application.position,
      });

      const [applicationResume] = await db
        .insert(applicationResumes)
        .values({
          applicationId: application.id,
          baseResumeId,
          content,
          model: "llama-3.3-70b-versatile",
          jobDescriptionSnapshot: application.jobDescription,
        })
        .returning();

      return applicationResume;
    }),

  deleteResume: protectedProcedure
    .input(z.object({ resumeId: z.string().uuid() }))
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
