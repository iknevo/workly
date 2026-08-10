import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { EditApplication } from "@/modules/applications/ui/edit-application";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { applicationId } = await params;

  prefetch(trpc.applications.getOne.queryOptions({ id: applicationId }));
  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <EditApplication applicationId={applicationId} />
    </HydrateClient>
  );
}
