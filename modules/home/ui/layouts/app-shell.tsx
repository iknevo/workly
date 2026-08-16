"use client";

import { UserButton } from "@clerk/nextjs";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: ListChecks },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/dashboard" />} className="gap-2">
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-xl font-semibold">Workly</span>
                  <span className="text-xs text-muted-foreground">Job application tracker</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-end gap-2">
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  href="/dashboard"
                  labelIcon={<LayoutDashboard className="size-4" />}
                />
                <UserButton.Link
                  label="Applications"
                  href="/applications"
                  labelIcon={<ListChecks className="size-4" />}
                />
                <UserButton.Link
                  label="Resumes"
                  href="/resumes"
                  labelIcon={<FileText className="size-4" />}
                />
                <UserButton.Link
                  label="Calendar"
                  href="/calendar"
                  labelIcon={<CalendarDays className="size-4" />}
                />
                <UserButton.Link
                  label="My profile"
                  href="/profile"
                  labelIcon={<UserRound className="size-4" />}
                />

                <UserButton.Link
                  label="Settings"
                  href="/settings"
                  labelIcon={<Settings className="size-4" />}
                />

                <UserButton.Action label="manageAccount" />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-x-clip p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
