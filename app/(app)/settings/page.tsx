import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { SettingsPage } from "@/modules/settings/ui/settings-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsRoute() {
  await auth.protect();

  prefetch(trpc.mail.getAccounts.queryOptions());
  prefetch(trpc.mail.isConfigured.queryOptions());

  return (
    <HydrateClient>
      <SettingsPage />
    </HydrateClient>
  );
}
