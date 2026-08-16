import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ResumesPage } from "@/modules/resumes/ui/resumes-page";

export default async function ResumesRoute() {
  await auth.protect();

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <ResumesPage />
    </HydrateClient>
  );
}
