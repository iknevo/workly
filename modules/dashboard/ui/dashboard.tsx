"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";
import type { applicationStatus } from "@/db/schema";
import { useUser } from "@clerk/nextjs";

type Status = (typeof applicationStatus.enumValues)[number];

export function Dashboard() {
  const trpc = useTRPC();
  const { user } = useUser();

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const eventsQuery = useQuery(
    trpc.events.getManyForMonth.queryOptions({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
    })
  );

  const applications = applicationsQuery.data ?? [];
  const resumes = resumesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const now = useState(() => Date.now())[0];

  const stats = useMemo(() => {
    const byStatus = applications.reduce<Record<string, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] ?? 0) + 1;
      return acc;
    }, {});
    const upcoming = events.filter((e) => e.startTime.getTime() >= now);
    return {
      total: applications.length,
      active: applications.filter((a) => ["applied", "interviewing"].includes(a.status)).length,
      interviews: applications.filter((a) => a.status === "interviewing").length,
      offers: applications.filter((a) => a.status === "offer").length,
      byStatus,
      upcomingCount: upcoming.length,
      resumeCount: resumes.length,
    };
  }, [applications, events, resumes, now]);

  const upcomingEvents = events
    .filter((e) => e.startTime.getTime() >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s where your job hunt stands today.
          </p>
        </div>
        <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
          Add application
        </Link>
      </div>

      {applicationsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total applications" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Interviews" value={stats.interviews} />
          <StatCard label="Offers" value={stats.offers} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>Your latest applications across all companies.</CardDescription>
          </CardHeader>
          <CardContent>
            {applicationsQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No applications yet</EmptyTitle>
                  <EmptyDescription>
                    Track your job applications and tailor resumes with AI. Start by adding your
                    first application.
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
                  Add application
                </Link>
              </Empty>
            ) : (
              <div className="flex flex-col divide-y">
                {applications.slice(0, 6).map((app) => {
                  const config = APPLICATION_STATUS_CONFIG[app.status];
                  return (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{app.position}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {app.company}
                          {app.location ? ` · ${app.location}` : ""}
                        </span>
                      </div>
                      <Badge className={cn(config.className)}>
                        {config.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Next events on your calendar.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing scheduled yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md border bg-muted/50">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          {event.startTime.toLocaleDateString(undefined, { month: "short" })}
                        </span>
                        <span className="text-sm font-semibold leading-none">
                          {event.startTime.getDate()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.startTime.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your resumes</CardTitle>
              <CardDescription>Base resumes used for AI tailoring.</CardDescription>
            </CardHeader>
            <CardContent>
              {resumes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No resumes yet.{" "}
                  <Link href="/resumes" className="text-primary underline-offset-4 hover:underline">
                    Create one
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {resumes.slice(0, 3).map((resume) => (
                    <Link
                      key={resume.id}
                      href="/resumes"
                      className="flex items-center justify-between gap-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate text-sm font-medium">{resume.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {resume.updatedAt.toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
      </CardContent>
    </Card>
  );
}
