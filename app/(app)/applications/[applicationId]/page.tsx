import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ApplicationDetail } from "@/modules/applications/ui/application-detail";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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
