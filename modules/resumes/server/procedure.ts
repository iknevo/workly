import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { insertResumeSchema, resumes, updateResumeSchema } from "@/db/schema";
import { compileLatex } from "@/lib/latex";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const resumesRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    return db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.updatedAt));
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      const [resume] = await db
        .select()
        .from(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, user.id)))
        .limit(1);

      if (!resume) throw new TRPCError({ code: "NOT_FOUND" });
      return resume;
    }),

  create: protectedProcedure
    .input(insertResumeSchema.omit({ userId: true }))
    .mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    const [resume] = await db
      .insert(resumes)
      .values({
        userId: user.id,
        title: input.title,
        content: input.content,
      })
      .returning();

    return resume;
  }),

  update: protectedProcedure
    .input(updateResumeSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    const [updated] = await db
      .update(resumes)
      .set({
        title: input.title,
        content: input.content,
        updatedAt: new Date(),
      })
      .where(and(eq(resumes.id, input.id), eq(resumes.userId, user.id)))
      .returning();

    if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
    return updated;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [deleted] = await db
        .delete(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, user.id)))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),

  compile: protectedProcedure
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await compileLatex(input.content);
      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error,
        });
      }
      return { pdfBase64: result.pdfBase64, log: result.log };
    }),
});
