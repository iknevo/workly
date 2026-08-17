import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { EditResumePage } from "@/modules/resumes/ui/edit-resume-page";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}): Promise<Metadata> {
  const { resumeId } = await params;
  try {
    const resume = await caller.resumes.getOne({ id: resumeId });
    return { title: `Edit ${resume.title}` };
  } catch {
    return { title: "Edit Resume" };
  }
}

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
