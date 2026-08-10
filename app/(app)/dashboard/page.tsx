import { auth } from "@clerk/nextjs/server";

import { Dashboard } from "@/modules/dashboard/ui/dashboard";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function DashboardPage() {
  await auth.protect();

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
