import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { EditApplication } from "@/modules/applications/ui/edit-application";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await auth.protect();

  const { applicationId } = await params;

  prefetch(trpc.applications.getOne.queryOptions({ id: applicationId }));
  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <EditApplication applicationId={applicationId} />
    </HydrateClient>
  );
}
