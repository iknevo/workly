import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { APPLICATIONS_PAGE_SIZE } from "@/modules/applications/constants";
import { ApplicationsList } from "@/modules/applications/ui/applications-list";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  await auth.protect();

  prefetch(
    trpc.applications.getPaginated.queryOptions({ page: 1, pageSize: APPLICATIONS_PAGE_SIZE })
  );
  prefetch(trpc.applications.getSources.queryOptions());

  return (
    <HydrateClient>
      <ApplicationsList />
    </HydrateClient>
  );
}
