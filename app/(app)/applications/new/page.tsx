import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { NewApplication } from "@/modules/applications/ui/new-application";

export default async function NewApplicationPage() {
  await auth.protect();

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <NewApplication />
    </HydrateClient>
  );
}
