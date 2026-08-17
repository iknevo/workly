import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { applications, events, insertEventSchema, updateEventSchema } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const eventsRouter = createTRPCRouter({
  getManyForMonth: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      return db
        .select()
        .from(events)
        .where(
          and(
            eq(events.userId, user.id),
            gte(events.startTime, input.start),
            lte(events.startTime, input.end)
          )
        )
        .orderBy(asc(events.startTime));
    }),

  getManyForApplication: protectedProcedure
    .input(z.object({ applicationId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;

      const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(events)
        .where(eq(events.applicationId, input.applicationId))
        .orderBy(asc(events.startTime));
    }),

  create: protectedProcedure
    .input(insertEventSchema.omit({ userId: true }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      if (input.applicationId) {
        const [application] = await db
          .select({ id: applications.id })
          .from(applications)
          .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
          .limit(1);

        if (!application) throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [event] = await db
        .insert(events)
        .values({
          userId: user.id,
          applicationId: input.applicationId ?? null,
          title: input.title,
          description: input.description ?? null,
          startTime: input.startTime,
          endTime: input.endTime ?? null,
          type: input.type ?? "other",
        })
        .returning();

      return event;
    }),

  update: protectedProcedure
    .input(updateEventSchema.omit({ userId: true }).extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      if (input.applicationId) {
        const [application] = await db
          .select({ id: applications.id })
          .from(applications)
          .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
          .limit(1);

        if (!application) throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await db
        .update(events)
        .set({
          applicationId: input.applicationId,
          title: input.title,
          description: input.description,
          startTime: input.startTime,
          endTime: input.endTime,
          type: input.type,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, input.id), eq(events.userId, user.id)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  remove: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const { user } = ctx;

    const [deleted] = await db
      .delete(events)
      .where(and(eq(events.id, input.id), eq(events.userId, user.id)))
      .returning();

    if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
    return deleted;
  }),
});
