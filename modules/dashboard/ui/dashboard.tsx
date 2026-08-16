"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  ListChecks,
  Radio,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import type { applicationStatus } from "@/db/schema";
import { normalizeSkills } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG, EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

type Status = (typeof applicationStatus.enumValues)[number];

const STATUS_ORDER: Status[] = [
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

const SEGMENT_BG: Record<Status, string> = {
  draft: "bg-muted-foreground/25",
  applied: "bg-blue-500",
  interviewing: "bg-amber-500",
  offer: "bg-emerald-500",
  rejected: "bg-destructive/70",
  withdrawn: "bg-muted-foreground/40",
};

const PROFILE_SECTIONS = [
  { key: "headline", label: "Headline" },
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "links", label: "Links" },
] as const;

function isProfileSectionFilled(key: string, value: unknown): boolean {
  if (key === "skills") {
    return normalizeSkills(value as Parameters<typeof normalizeSkills>[0]).some(
      (g) => g.items.length
    );
  }
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function Dashboard() {
  const trpc = useTRPC();
  const { user } = useUser();
  const now = useState(() => Date.now())[0];

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const eventsQuery = useQuery(
    trpc.events.getManyForMonth.queryOptions({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
    })
  );
  const meQuery = useQuery(trpc.users.getMe.queryOptions());

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const me = meQuery.data;

  const byStatus = useMemo(() => {
    return applications.reduce<Record<Status, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] ?? 0) + 1;
      return acc;
    }, {} as Record<Status, number>);
  }, [applications]);

  const total = applications.length;
  const active = applications.filter((a) => ["applied", "interviewing"].includes(a.status)).length;
  const interviewing = applications.filter((a) => a.status === "interviewing").length;
  const offers = applications.filter((a) => a.status === "offer").length;

  const nextEvent = useMemo(() => {
    return events
      .filter((e) => e.startTime.getTime() >= now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  }, [events, now]);

  const nextApplication = nextEvent
    ? applications.find((a) => a.id === nextEvent.applicationId)
    : undefined;

  const profileScore = useMemo(() => {
    if (!me) return 0;
    const filled = PROFILE_SECTIONS.filter(({ key }) => {
      const value = me[key];
      return isProfileSectionFilled(key, value);
    }).length;
    return Math.round((filled / PROFILE_SECTIONS.length) * 100);
  }, [me]);

  const greeting = useMemo(() => {
    const hour = new Date(now).getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-56 rounded-full bg-[radial-gradient(50%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_7%,transparent),transparent)]"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}
              {user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(now).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
            Add application
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ListChecks}
          label="Total applications"
          value={applicationsQuery.isLoading ? null : total}
          hint="across your hunt"
        />
        <StatCard
          icon={Radio}
          label="Active"
          value={applicationsQuery.isLoading ? null : active}
          hint="applied or interviewing"
        />
        <StatCard
          icon={CalendarClock}
          label="Interviews"
          value={applicationsQuery.isLoading ? null : interviewing}
          hint="currently interviewing"
        />
        <StatCard
          icon={BadgeCheck}
          label="Offers"
          value={applicationsQuery.isLoading ? null : offers}
          hint="in hand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Where every application stands.</CardDescription>
          </CardHeader>
          <CardContent>
            {applicationsQuery.isLoading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : total === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No applications yet</EmptyTitle>
                  <EmptyDescription>
                    Add your first application to see your pipeline take shape.
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
                  Add application
                </Link>
              </Empty>
            ) : (
              <div className="flex flex-col gap-5">
                <div
                  className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
                  aria-label="Applications by status"
                >
                  {STATUS_ORDER.filter((s) => (byStatus[s] ?? 0) > 0).map((status) => (
                    <div
                      key={status}
                      className={cn("h-full", SEGMENT_BG[status])}
                      style={{ width: `${((byStatus[status] ?? 0) / total) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STATUS_ORDER.map((status) => {
                    const config = APPLICATION_STATUS_CONFIG[status];
                    const count = byStatus[status] ?? 0;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <Link
                        key={status}
                        href="/applications"
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={cn("size-2 shrink-0 rounded-full", SEGMENT_BG[status])} />
                          <span className="truncate text-sm">{config.label}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 tabular-nums">
                          {count > 0 ? (
                            <span className="text-sm font-medium">{count}</span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            <CardDescription>What&apos;s coming next on your calendar.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextEvent ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border bg-muted/50">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {nextEvent.startTime.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-xl leading-tight font-semibold">
                      {nextEvent.startTime.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Badge className={cn(EVENT_TYPE_CONFIG[nextEvent.type].className)}>
                      {EVENT_TYPE_CONFIG[nextEvent.type].label}
                    </Badge>
                    <p className="mt-1.5 truncate text-sm font-medium">{nextEvent.title}</p>
                    {nextApplication ? (
                      <Link
                        href={`/applications/${nextApplication.id}`}
                        className="mt-0.5 block truncate text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {nextApplication.company} · {nextApplication.position}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Starts</span>
                    <span className="text-sm font-medium">
                      {nextEvent.startTime.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In</span>
                    <span className="text-sm font-medium tabular-nums">
                      {countdown(nextEvent.startTime.getTime(), now)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/calendar"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open calendar
                </Link>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nothing scheduled</EmptyTitle>
                  <EmptyDescription>
                    Add interviews, follow-ups, and deadlines to your calendar.
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/calendar" className={buttonVariants({ size: "sm" })}>
                  Open calendar
                </Link>
              </Empty>
            )}
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile strength</CardTitle>
          <CardDescription>
            The AI builds your tailored resumes from this profile. A complete profile means better
            matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <Progress value={profileScore} className="flex-1 [&_[data-slot=progress-track]]:h-2" />
                <span className="shrink-0 text-sm font-medium tabular-nums">{profileScore}%</span>
                <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <UserRound />
                  Complete profile
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PROFILE_SECTIONS.map(({ key, label }) => {
                  const value = me?.[key];
                  const filled = isProfileSectionFilled(key, value);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        filled ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {filled ? (
                        <Check className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Sparkles className="size-4 shrink-0 text-muted-foreground/60" />
                      )}
                      {label}
                    </div>
                  );
                })}
              </div>
              {profileScore < 100 && (
                <p className="text-xs text-muted-foreground">
                  {PROFILE_SECTIONS.length - Math.round((profileScore / 100) * PROFILE_SECTIONS.length)} section
                  {PROFILE_SECTIONS.length - Math.round((profileScore / 100) * PROFILE_SECTIONS.length) === 1
                    ? ""
                    : "s"}{" "}
                  to fill in to reach a full profile.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Target;
  label: string;
  value: number | null;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <div className="flex flex-col">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function countdown(target: number, now: number) {
  const days = Math.max(0, Math.ceil((target - now) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days} days`;
}
