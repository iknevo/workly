"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Mail, RefreshCw } from "lucide-react";

export function EmailsTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const gmailQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const emailsQuery = useQuery(trpc.mail.getForApplication.queryOptions({ applicationId }));

  const accounts = gmailQuery.data ?? [];
  const emails = emailsQuery.data ?? [];

  const getAuthUrl = useMutation(
    trpc.mail.getAuthUrl.mutationOptions({
      onSuccess: (url) => {
        window.location.assign(url);
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Gmail not configured", description: error.message });
      },
    })
  );

  const sync = useMutation(
    trpc.mail.sync.mutationOptions({
      onSuccess: (result) => {
        toast.add({
          type: "success",
          title: "Sync complete",
          description: `${result.insertedCount} new email${result.insertedCount === 1 ? "" : "s"} found.`,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.mail.getForApplication.queryKey({ applicationId }),
        });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Sync failed", description: error.message });
      },
    })
  );

  if (gmailQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email tracking</CardTitle>
          <CardDescription>Follow recruiter emails for this application.</CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Connect your Gmail</EmptyTitle>
              <EmptyDescription>
                Connect a Gmail account to automatically pull emails matching this application.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => getAuthUrl.mutate()} disabled={getAuthUrl.isPending}>
              <Mail />
              Connect Gmail
            </Button>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Emails</h2>
          <p className="text-sm text-muted-foreground">
            {emails.length} email{emails.length === 1 ? "" : "s"} matched to this application.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => sync.mutate({ applicationId })} disabled={sync.isPending}>
          <RefreshCw className={sync.isPending ? "animate-spin" : ""} />
          Sync
        </Button>
      </div>

      {emailsQuery.isFetching ? (
        <Skeleton className="h-64 w-full" />
      ) : emails.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No emails yet</EmptyTitle>
                <EmptyDescription>
                  Emails matching this application will appear here after you sync.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border bg-card">
          {emails.map((email) => (
            <div key={email.id} className="flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{email.subject || "(no subject)"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {email.internalDate?.toLocaleString() ?? ""}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{email.fromEmail}</span>
              {email.snippet && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{email.snippet}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
