"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorFallback } from "@/components/error-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { ApplicationForm } from "./application-form";
import { useTRPC } from "@/trpc/client";

function EditApplicationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function EditApplication({ applicationId }: { applicationId: string }) {
  return (
    <Suspense fallback={<EditApplicationSkeleton />}>
      <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />}>
        <EditApplicationContent applicationId={applicationId} />
      </ErrorBoundary>
    </Suspense>
  );
}

function EditApplicationContent({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const trpc = useTRPC();

  const applicationQuery = useQuery(trpc.applications.getOne.queryOptions({ id: applicationId }));
  const application = applicationQuery.data;

  const update = useMutation(
    trpc.applications.update.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Application updated" });
        router.push(`/applications/${applicationId}`);
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Failed to update", description: error.message });
      },
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/applications/${applicationId}`}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit application</h1>
          <p className="text-sm text-muted-foreground">
            Update the details for {application ? application.company : "this application"}.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
          <CardDescription>Update anything you know about this application.</CardDescription>
        </CardHeader>
        <CardContent>
          {applicationQuery.isLoading || !application ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <ApplicationForm
              initial={application}
              onSubmit={(data) => update.mutate({ id: applicationId, ...data })}
              submitLabel="Save changes"
              submitting={update.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
