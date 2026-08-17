import { auth } from "@clerk/nextjs/server";

import { ResumesPage } from "@/modules/resumes/ui/resumes-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function ResumesRoute() {
  await auth.protect();

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <ResumesPage />
    </HydrateClient>
  );
}
