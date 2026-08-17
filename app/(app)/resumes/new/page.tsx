import { auth } from "@clerk/nextjs/server";

import { NewResumePage } from "@/modules/resumes/ui/new-resume-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function NewResumeRoute() {
  await auth.protect();

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <NewResumePage />
    </HydrateClient>
  );
}
