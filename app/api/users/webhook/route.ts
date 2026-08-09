import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created") {
      const { data } = evt;
      await db.insert(users).values({
        clerkId: data.id,
        name: `${data.first_name} ${data.last_name}`,
      });
    }

    if (evt.type === "user.deleted") {
      const { data } = evt;
      if (!data.id) {
        return new Response("Missing user id", { status: 400 });
      }
      await db.delete(users).where(eq(users.clerkId, data.id));
    }

    if (evt.type === "user.updated") {
      const { data } = evt;
      await db
        .update(users)
        .set({
          name: `${data.first_name} ${data.last_name}`,
        })
        .where(eq(users.clerkId, data.id));
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
