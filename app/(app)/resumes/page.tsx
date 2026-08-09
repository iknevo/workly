import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { ResumesPage } from "@/modules/resumes/ui/resumes-page";

export default async function ResumesRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <ResumesPage />
    </HydrateClient>
  );
}
