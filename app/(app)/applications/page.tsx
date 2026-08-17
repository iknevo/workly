import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { ApplicationsList } from "@/modules/applications/ui/applications-list";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  await auth.protect();

  prefetch(trpc.applications.getMany.queryOptions());

  return (
    <HydrateClient>
      <ApplicationsList />
    </HydrateClient>
  );
}
