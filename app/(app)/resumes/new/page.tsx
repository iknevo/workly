import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";

import { NewResumePage } from "@/modules/resumes/ui/new-resume-page";

export default async function NewResumeRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  prefetch(trpc.resumes.getMany.queryOptions());

  return (
    <HydrateClient>
      <NewResumePage />
    </HydrateClient>
  );
}
