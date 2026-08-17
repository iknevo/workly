import { auth } from "@clerk/nextjs/server";

import { EditResumePage } from "@/modules/resumes/ui/edit-resume-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function EditResumeRoute({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  await auth.protect();

  const { resumeId } = await params;

  prefetch(trpc.resumes.getOne.queryOptions({ id: resumeId }));

  return (
    <HydrateClient>
      <EditResumePage resumeId={resumeId} />
    </HydrateClient>
  );
}
