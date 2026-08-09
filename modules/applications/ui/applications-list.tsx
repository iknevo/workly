"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";

import { Plus, Search } from "lucide-react";

const FILTERS = ["all", "applied", "interviewing", "offer", "rejected", "draft"] as const;

export function ApplicationsList() {
  const trpc = useTRPC();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());

  const applications = applicationsQuery.data ?? [];

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchesFilter = filter === "all" || app.status === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        app.company.toLowerCase().includes(query) ||
        app.position.toLowerCase().includes(query) ||
        (app.location ?? "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, search]);

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
            placeholder="Search by company, position, or location..."
            className="pl-9"
          />
        </div>

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

      {applicationsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
                      <Badge className={cn(config.className)}>{config.label}</Badge>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{app.location ?? "No location"}</span>
                      <span className="shrink-0">
                        {app.appliedAt
                          ? app.appliedAt.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "Not applied"}
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
