import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { SettingsPage } from "@/modules/settings/ui/settings-page";

export default async function SettingsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.users.getMe.queryOptions());
  prefetch(trpc.mail.getAccounts.queryOptions());
  prefetch(trpc.mail.isConfigured.queryOptions());

  return (
    <HydrateClient>
      <SettingsPage />
    </HydrateClient>
  );
}
