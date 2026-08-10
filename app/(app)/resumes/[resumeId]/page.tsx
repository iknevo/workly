import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ResumeViewPage } from "@/modules/resumes/ui/resume-view-page";

export default async function ResumeViewRoute({
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
      <ResumeViewPage resumeId={resumeId} />
    </HydrateClient>
  );
}
