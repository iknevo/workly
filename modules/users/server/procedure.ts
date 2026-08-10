import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profileUpdateSchema, updateUserSchema, users } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usersRouter = createTRPCRouter({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    return user;
  }),

  updateMe: protectedProcedure
    .input(
      updateUserSchema.pick({
        name: true,
        email: true,
        headline: true,
        phone: true,
        location: true,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [updated] = await db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  updateProfile: protectedProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const [updated] = await db
        .update(users)
        .set({
          name: input.name,
          email: input.email ?? null,
          headline: input.headline ?? null,
          phone: input.phone ?? null,
          location: input.location ?? null,
          summary: input.summary ?? null,
          skills: input.skills,
          experience: input.experience,
          education: input.education,
          projects: input.projects,
          links: input.links,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
