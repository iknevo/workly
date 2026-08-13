"use client";

import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

import { ApplicationForm } from "./application-form";

export function NewApplication() {
  const router = useRouter();
  const trpc = useTRPC();

  const create = useMutation(
    trpc.applications.create.mutationOptions({
      onSuccess: (application) => {
        toast.add({ type: "success", title: "Application created", description: "Good luck!" });
        router.push(`/applications/${application.id}`);
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Failed to create application", description: error.message });
      },
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New application</h1>
        <p className="text-sm text-muted-foreground">
          Add a job you&apos;re applying to and paste the description for AI-powered resume tailoring.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
          <CardDescription>Fill in what you know about this application.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm
            onSubmit={(data) => create.mutate(data)}
            submitLabel="Create application"
            submitting={create.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
