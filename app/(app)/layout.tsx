import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/modules/home/ui/layouts/app-shell";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <AppShell>{children}</AppShell>;
}
