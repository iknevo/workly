"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ResumeEditor } from "./resume-editor";
import { useTRPC } from "@/trpc/client";

function EditResumePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7" />
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function EditResumePage({ resumeId }: { resumeId: string }) {
  return (
    <Suspense fallback={<EditResumePageSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <EditResumePageContent resumeId={resumeId} />
      </ErrorBoundary>
    </Suspense>
  );
}

function EditResumePageContent({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const trpc = useTRPC();

  const resumeQuery = useQuery(trpc.resumes.getOne.queryOptions({ id: resumeId }));
  const resume = resumeQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href={"/resumes"} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit resume</h1>
          <p className="text-sm text-muted-foreground">
            Update the LaTeX source of this base resume.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>LaTeX source</CardTitle>
          <CardDescription>Preview the PDF as you edit, then save your changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {resumeQuery.isLoading || !resume ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ResumeEditor resume={resume} onDone={() => router.push(`/resumes/${resumeId}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
