import { auth } from "@clerk/nextjs/server";

import { CalendarPage } from "@/modules/events/ui/calendar-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function CalendarRoute() {
  await auth.protect();

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  prefetch(trpc.events.getManyForMonth.queryOptions({ start, end }));
  prefetch(trpc.applications.getMany.queryOptions());

  return (
    <HydrateClient>
      <CalendarPage />
    </HydrateClient>
  );
}
