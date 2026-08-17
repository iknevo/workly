import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { ApplicationDetail } from "@/modules/applications/ui/application-detail";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}): Promise<Metadata> {
  const { applicationId } = await params;
  try {
    const app = await caller.applications.getOne({ id: applicationId });
    return { title: `${app.position} at ${app.company}` };
  } catch {
    return { title: "Application" };
  }
}

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await auth.protect();

  const { applicationId } = await params;

  prefetch(trpc.applications.getOne.queryOptions({ id: applicationId }));
  prefetch(trpc.applications.getResumes.queryOptions({ applicationId }));
  prefetch(trpc.events.getManyForApplication.queryOptions({ applicationId }));
  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <ApplicationDetail applicationId={applicationId} />
    </HydrateClient>
  );
}
