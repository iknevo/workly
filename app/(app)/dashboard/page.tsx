import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { Dashboard } from "@/modules/dashboard/ui/dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.applications.getMany.queryOptions());
  prefetch(trpc.events.getManyForMonth.queryOptions({ start: startOfMonth(), end: endOfMonth() }));
  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <Dashboard />
    </HydrateClient>
  );
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}
