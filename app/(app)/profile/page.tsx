import { auth } from "@clerk/nextjs/server";

import { ProfilePage } from "@/modules/profile/ui/profile-page";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function ProfileRoute() {
  await auth.protect();

  prefetch(trpc.users.getMe.queryOptions());

  return (
    <HydrateClient>
      <ProfilePage />
    </HydrateClient>
  );
}
