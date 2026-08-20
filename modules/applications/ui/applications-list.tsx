"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { APPLICATION_STATUS_CONFIG, JOB_SOURCES } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

const FILTERS = ["all", "applied", "interviewing", "offer", "rejected", "draft"] as const;

function ApplicationsListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ApplicationsList() {
  return (
    <Suspense fallback={<ApplicationsListSkeleton />}>
      <ErrorBoundary
        fallback={<p className="text-sm text-muted-foreground">Failed to load applications.</p>}
      >
        <ApplicationsListSuspense />
      </ErrorBoundary>
    </Suspense>
  );
}

function ApplicationsListSuspense() {
  const trpc = useTRPC();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    for (const app of applications) {
      if (app.source) sources.add(app.source);
    }
    const preset = JOB_SOURCES.filter((s) => sources.has(s));
    const custom = [...sources]
      .filter((s) => !JOB_SOURCES.includes(s as (typeof JOB_SOURCES)[number]))
      .sort();
    return [...preset, ...custom];
  }, [applications]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchesFilter = filter === "all" || app.status === filter;
      const matchesSource = sourceFilter === "all" || app.source === sourceFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        (app.company ?? "").toLowerCase().includes(query) ||
        (app.position ?? "").toLowerCase().includes(query) ||
        (app.location ?? "").toLowerCase().includes(query) ||
        (app.source ?? "").toLowerCase().includes(query);
      return matchesFilter && matchesSource && matchesSearch;
    });
  }, [applications, filter, sourceFilter, search]);

  const formatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">Track every job you&apos;ve applied to.</p>
        </div>
        <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
          <Plus />
          New application
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
              <TabsList className="w-fit">
                {FILTERS.map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {f === "all" ? "All" : APPLICATION_STATUS_CONFIG[f].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {availableSources.length > 0 && (
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v ?? "all")}>
              <SelectTrigger size="sm" className="w-auto">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="all">All sources</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {applications.length === 0 ? "No applications yet" : "No matches"}
                </EmptyTitle>
                <EmptyDescription>
                  {applications.length === 0
                    ? "Start tracking your job search by adding your first application."
                    : "Try adjusting your search or filters."}
                </EmptyDescription>
              </EmptyHeader>
              {applications.length === 0 && (
                <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
                  Add application
                </Link>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => {
            const config = APPLICATION_STATUS_CONFIG[app.status];
            return (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">{app.position}</span>
                        <span className="truncate text-sm text-muted-foreground">
                          {app.company}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {app.source && (
                          <Badge variant="outline" className="rounded-xs text-xs">
                            {app.source}
                          </Badge>
                        )}
                        <Badge className={cn(config.className, "rounded-xs")}>{config.label}</Badge>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{app.location ?? "No location"}</span>
                      <span className="shrink-0">
                        {app.appliedAt ? formatDate(app.appliedAt) : "Not applied"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
