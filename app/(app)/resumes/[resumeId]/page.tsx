import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ResumeViewPage } from "@/modules/resumes/ui/resume-view-page";

export default async function ResumeViewRoute({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  await auth.protect();

  const { resumeId } = await params;

  prefetch(trpc.resumes.getOne.queryOptions({ id: resumeId }));

  return (
    <HydrateClient>
      <ResumeViewPage resumeId={resumeId} />
    </HydrateClient>
  );
}
