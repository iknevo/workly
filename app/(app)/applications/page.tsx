import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ApplicationsList } from "@/modules/applications/ui/applications-list";

export default async function ApplicationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.applications.getMany.queryOptions());

  return (
    <HydrateClient>
      <ApplicationsList />
    </HydrateClient>
  );
}
