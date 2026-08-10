"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

export function ResumesPage() {
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

      {resumesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
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
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-4" />
            </div>
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
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/resumes/${resume.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={`/resumes/${resume.id}/edit`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Pencil />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove.mutate({ id: resume.id })}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
