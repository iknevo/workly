"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import type { applications } from "@/db/schema";
import { useConfirm } from "@/hooks/use-confirm";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

type Application = typeof applications.$inferSelect;

export function OverviewTab({ application }: { application: Application }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [ConfirmationDialog, confirm] = useConfirm();
  const statusConfig = APPLICATION_STATUS_CONFIG[application.status];

  const remove = useMutation(
    trpc.applications.remove.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Application deleted" });
        queryClient.invalidateQueries({ queryKey: trpc.applications.getMany.queryKey() });
        router.push("/applications");
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to delete", description: error.message }),
    })
  );

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete application",
      message: `Permanently delete ${application.company} · ${application.position}? Its events and generated resumes will be removed; matched emails are unlinked but stay stored.`,
    });
    if (ok) remove.mutate({ id: application.id });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Details</CardTitle>
            <CardDescription>Everything you know about this application.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/applications/${application.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil />
              Edit
            </Link>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Detail label="Company" value={application.company} />
            <Detail label="Position" value={application.position} />
            <Detail label="Location" value={application.location} />
            <Detail label="Salary" value={application.salary} />
            <Detail label="Source" value={application.source} />
            <Detail
              label="Status"
              value={<Badge className={cn(statusConfig.className)}>{statusConfig.label}</Badge>}
            />
            <Detail
              label="Applied on"
              value={
                application.appliedAt
                  ? application.appliedAt.toLocaleDateString(undefined, { dateStyle: "medium" })
                  : "Not yet"
              }
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
                  "-"
                )
              }
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
              <p className="py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "-"}</dd>
    </div>
  );
}
