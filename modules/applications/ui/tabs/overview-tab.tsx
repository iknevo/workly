"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { applications } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";
import { ApplicationForm } from "@/modules/applications/ui/application-form";

import { ExternalLink, Pencil } from "lucide-react";

type Application = typeof applications.$inferSelect;

export function OverviewTab({ application }: { application: Application }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const update = useMutation(
    trpc.applications.update.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Application updated" });
        setEditOpen(false);
        queryClient.invalidateQueries({ queryKey: trpc.applications.getOne.queryKey({ id: application.id }) });
        queryClient.invalidateQueries({ queryKey: trpc.applications.getMany.queryKey() });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Failed to update", description: error.message });
      },
    })
  );

  const statusConfig = APPLICATION_STATUS_CONFIG[application.status];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Details</CardTitle>
            <CardDescription>Everything you know about this application.</CardDescription>
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<button className={buttonVariants({ variant: "outline", size: "sm" })} />}>
              <Pencil />
              Edit
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit application</DialogTitle>
                <DialogDescription>Update the details for {application.company}.</DialogDescription>
              </DialogHeader>
              <ApplicationForm
                initial={application}
                onSubmit={(data) => update.mutate({ id: application.id, ...(data as object) })}
                submitLabel="Save changes"
                submitting={update.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Detail label="Company" value={application.company} />
            <Detail label="Position" value={application.position} />
            <Detail label="Location" value={application.location} />
            <Detail label="Salary" value={application.salary} />
            <Detail
              label="Status"
              value={
                <Badge className={cn(statusConfig.className)}>{statusConfig.label}</Badge>
              }
            />
            <Detail
              label="Applied on"
              value={application.appliedAt ? application.appliedAt.toLocaleDateString(undefined, { dateStyle: "medium" }) : "Not yet"}
            />
            <Detail
              label="Posting"
              value={
                application.url ? (
                  <Link
                    href={application.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    View posting <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Detail
              label="Gmail search"
              value={application.mailSearchQuery ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{application.mailSearchQuery}</code> : "—"}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job description</CardTitle>
            <CardDescription>Used by the AI to tailor your resume.</CardDescription>
          </CardHeader>
          <CardContent>
            {application.jobDescription ? (
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-4 font-sans text-sm whitespace-pre-wrap text-muted-foreground">
                {application.jobDescription}
              </pre>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No job description added yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Recruiter contacts, referrals, interview prep.</CardDescription>
          </CardHeader>
          <CardContent>
            {application.notes ? (
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-4 font-sans text-sm whitespace-pre-wrap text-muted-foreground">
                {application.notes}
              </pre>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No notes yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}
