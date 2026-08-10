import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ProfilePage } from "@/modules/profile/ui/profile-page";

export default async function ProfileRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.users.getMe.queryOptions());

  return (
    <HydrateClient>
      <ProfilePage />
    </HydrateClient>
  );
}
