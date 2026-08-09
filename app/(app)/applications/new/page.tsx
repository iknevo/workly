import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { NewApplication } from "@/modules/applications/ui/new-application";

export default async function NewApplicationPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <NewApplication />
    </HydrateClient>
  );
}
