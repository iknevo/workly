import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ApplicationsList } from "@/modules/applications/ui/applications-list";

export default async function ApplicationsPage() {
  await auth.protect();

  prefetch(trpc.applications.getMany.queryOptions());

  return (
    <HydrateClient>
      <ApplicationsList />
    </HydrateClient>
  );
}
