import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { EditResumePage } from "@/modules/resumes/ui/edit-resume-page";

export default async function EditResumeRoute({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { resumeId } = await params;

  prefetch(trpc.resumes.getOne.queryOptions({ id: resumeId }));

  return (
    <HydrateClient>
      <EditResumePage resumeId={resumeId} />
    </HydrateClient>
  );
}
