"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Download, LoaderCircle, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { cn } from "@/lib/utils";

import { ErrorFallback } from "@/components/error-fallback";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

import {
  APPLICATIONS_PAGE_SIZE,
  APPLICATION_STATUS_CONFIG,
  JOB_SOURCES,
} from "@/modules/applications/constants";
import { exportToPdf } from "@/modules/applications/lib/export";
import { useTRPC } from "@/trpc/client";

const FILTERS = ["all", "applied", "interviewing", "offer", "rejected", "draft"] as const;

function getPageNumbers(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const pages: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) pages.push("ellipsis");
    pages.push(p);
    previous = p;
  }
  return pages;
}

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
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <ApplicationsListSuspense />
      </ErrorBoundary>
    </Suspense>
  );
}

function ApplicationsListSuspense() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (value: string) => {
    setFilter(value as (typeof FILTERS)[number]);
    setPage(1);
  };

  const handleSourceChange = (value: string | null) => {
    setSourceFilter(value ?? "all");
    setPage(1);
  };

  const applicationsQuery = useQuery({
    ...trpc.applications.getPaginated.queryOptions({
      page,
      pageSize: APPLICATIONS_PAGE_SIZE,
      status: filter === "all" ? undefined : filter,
      source: sourceFilter === "all" ? undefined : sourceFilter,
      search: search || undefined,
    }),
    placeholderData: keepPreviousData,
  });
  const applicationsQuerySources = useQuery(trpc.applications.getSources.queryOptions());

  const applications = useMemo(() => applicationsQuery.data?.items ?? [], [applicationsQuery.data]);
  const total = applicationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / APPLICATIONS_PAGE_SIZE));

  const availableSources = useMemo(() => {
    const sources = applicationsQuerySources.data ?? [];
    const preset = JOB_SOURCES.filter((s) => sources.includes(s));
    const custom = sources.filter((s) => !JOB_SOURCES.includes(s as (typeof JOB_SOURCES)[number]));
    return [...preset, ...custom];
  }, [applicationsQuerySources.data]);

  const hasActiveFilters = filter !== "all" || sourceFilter !== "all" || search.length > 0;

  const formatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const apps = await queryClient.fetchQuery(
        trpc.applications.getFiltered.queryOptions({
          status: filter === "all" ? undefined : filter,
          source: sourceFilter === "all" ? undefined : sourceFilter,
          search: search || undefined,
        })
      );
      if (apps.length === 0) {
        toast.add({
          type: "warning",
          title: "Nothing to export",
          description: "No applications match your current filters.",
        });
        return;
      }
      await exportToPdf(apps);
      toast.add({
        type: "success",
        title: `Exported ${apps.length} application${apps.length === 1 ? "" : "s"}`,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setExporting(false);
    }
  }

  if (applicationsQuery.isPending) {
    return <ApplicationsListSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications ({total})</h1>
          <p className="text-sm text-muted-foreground">Track every job you&apos;ve applied to.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
            Export
          </Button>
          <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
            <Plus />
            New application
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search applications..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={filter} onValueChange={handleFilterChange}>
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
            <Select value={sourceFilter} onValueChange={handleSourceChange}>
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

      {total === 0 ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{!hasActiveFilters ? "No applications yet" : "No matches"}</EmptyTitle>
                <EmptyDescription>
                  {!hasActiveFilters
                    ? "Start tracking your job search by adding your first application."
                    : "Try adjusting your search or filters."}
                </EmptyDescription>
              </EmptyHeader>
              {!hasActiveFilters && (
                <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
                  Add application
                </Link>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
              applicationsQuery.isPlaceholderData && "pointer-events-none opacity-60"
            )}
          >
            {applications.map((app) => {
              const config = APPLICATION_STATUS_CONFIG[app.status];
              return (
                <Link key={app.id} href={`/applications/${app.id}`} className="min-w-0">
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
                          <Badge className={cn(config.className, "rounded-xs")}>
                            {config.label}
                          </Badge>
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

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page === 1}
                    className={cn(page === 1 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page === totalPages}
                    className={cn(page === totalPages && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
