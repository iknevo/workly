"use client";

import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApplicationForm } from "./application-form";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function EditApplication({ applicationId }: { applicationId: string }) {
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
              onSubmit={(data) => update.mutate({ id: applicationId, ...(data as object) })}
              submitLabel="Save changes"
              submitting={update.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
