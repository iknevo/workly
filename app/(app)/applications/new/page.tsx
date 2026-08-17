import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { NewApplication } from "@/modules/applications/ui/new-application";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "New Application" };

export default async function NewApplicationPage() {
  await auth.protect();

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <NewApplication />
    </HydrateClient>
  );
}
