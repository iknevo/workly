import { AppShell } from "@/modules/home/ui/layouts/app-shell";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
