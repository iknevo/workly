import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { EditApplication } from "@/modules/applications/ui/edit-application";
import { HydrateClient, caller, prefetch, trpc } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}): Promise<Metadata> {
  const { applicationId } = await params;
  try {
    const app = await caller.applications.getOne({ id: applicationId });
    return { title: `Edit ${app.position}` };
  } catch {
    return { title: "Edit Application" };
  }
}

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
