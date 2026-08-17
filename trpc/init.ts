import { auth } from "@clerk/nextjs/server";
import { TRPCError, initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";

import { checkRateLimit, generalRateLimit } from "@/lib/rate-limit";

import { db } from "@/db";
import { users } from "@/db/schema";

export const createTRPCContext = async () => {
  const { userId } = await auth();
  return { clerkUserId: userId };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;

  if (!ctx.clerkUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const [user] = await db.select().from(users).where(eq(users.clerkId, ctx.clerkUserId)).limit(1);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const rateLimit = await checkRateLimit(`general:${user.id}`, generalRateLimit);
  if (!rateLimit.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please try again later.",
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      user,
    },
  });
});
