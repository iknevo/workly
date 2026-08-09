import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { updateUserSchema } from "@/db/schema";
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

      return updated;
    }),
});

import { users } from "@/db/schema";
