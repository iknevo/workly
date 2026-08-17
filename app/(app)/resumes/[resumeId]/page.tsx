import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { ResumeViewPage } from "@/modules/resumes/ui/resume-view-page";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resumeId: string }>;
}): Promise<Metadata> {
  const { resumeId } = await params;
  try {
    const resume = await caller.resumes.getOne({ id: resumeId });
    return { title: resume.title };
  } catch {
    return { title: "Resume" };
  }
}

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
