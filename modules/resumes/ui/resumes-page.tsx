"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

function ResumesPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ResumesPage() {
  return (
    <Suspense fallback={<ResumesPageSkeleton />}>
      <ErrorBoundary
        fallback={<p className="text-sm text-muted-foreground">Failed to load resumes.</p>}
      >
        <ResumesPageSuspense />
      </ErrorBoundary>
    </Suspense>
  );
}

function ResumesPageSuspense() {
  const trpc = useTRPC();

  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const resumes = resumesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Base resumes in LaTeX. The AI rewrites these to match each job.
          </p>
        </div>
        <Link href="/resumes/new" className={buttonVariants({ size: "sm" })}>
          <Plus />
          New resume
        </Link>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No resumes yet</EmptyTitle>
                <EmptyDescription>
                  Create a base resume in LaTeX. Workly ships a starter template you can build on.
                </EmptyDescription>
              </EmptyHeader>
              <Link href="/resumes/new" className={buttonVariants({ size: "sm" })}>
                <Plus />
                New resume
              </Link>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  resume,
}: {
  resume: { id: string; title: string; content: string; updatedAt: Date; createdAt: Date };
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const remove = useMutation(
    trpc.resumes.remove.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume deleted" });
        queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to delete", description: error.message }),
    })
  );

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/resumes/${resume.id}`}
            className="truncate text-sm font-semibold hover:underline"
          >
            {resume.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            Updated {resume.updatedAt.toLocaleDateString()}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/resumes/${resume.id}`} />}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/resumes/${resume.id}/edit`} />}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => remove.mutate({ id: resume.id })}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
