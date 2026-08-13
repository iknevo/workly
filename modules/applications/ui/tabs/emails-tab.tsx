"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Loader2, Mail, RefreshCw, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { TagsEditor } from "@/modules/profile/ui/editors";
import { useTRPC } from "@/trpc/client";

type SearchConfig = {
  company: string;
  keywords: string[];
  emails: Array<{
    id: string;
    subject: string | null;
    fromEmail: string | null;
    senderEmail: string | null;
    snippet: string | null;
    internalDate: Date | null;
    relevanceScore: number | null;
    matchReasons: string[] | null;
    isHidden: boolean;
  }>;
};

export function EmailsTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const gmailQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const emailsQuery = useQuery(trpc.mail.getForApplication.queryOptions({ applicationId }));

  const accounts = gmailQuery.data ?? [];
  const searchConfig = emailsQuery.data;
  const emails = searchConfig?.emails ?? [];
  const visibleEmails = emails
    .filter((email) => !email.isHidden)
    .sort((a, b) => {
      const byScore = (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1);
      if (byScore !== 0) return byScore;
      return (b.internalDate?.getTime() ?? 0) - (a.internalDate?.getTime() ?? 0);
    });
  const hiddenEmails = emails.filter((email) => email.isHidden);

  const getForApplicationKey = trpc.mail.getForApplication.queryKey({ applicationId });

  const patchEmail = (emailId: string, patch: Partial<SearchConfig["emails"][number]>) => {
    queryClient.setQueryData<SearchConfig>(getForApplicationKey, (old) =>
      old
        ? {
            ...old,
            emails: old.emails.map((email) =>
              email.id === emailId ? { ...email, ...patch } : email
            ),
          }
        : old
    );
  };

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
          description: `${result.insertedCount} new email${
            result.insertedCount === 1 ? "" : "s"
          } found${result.removedCount > 0 ? `, ${result.removedCount} no longer match` : ""}.`,
        });
        queryClient.invalidateQueries({ queryKey: getForApplicationKey });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Sync failed", description: error.message });
      },
    })
  );

  const updateKeywords = useMutation(
    trpc.mail.updateKeywords.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getForApplicationKey });
        toast.add({
          type: "success",
          title: "Keywords applied",
          description: `${result.insertedCount} new email${result.insertedCount === 1 ? "" : "s"} found${
            result.removedCount > 0 ? `, ${result.removedCount} no longer match` : ""
          }.`,
        });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Could not save keywords", description: error.message });
      },
    })
  );

  const hideEmail = useMutation(
    trpc.mail.hideEmail.mutationOptions({
      onMutate: async ({ emailId }) => {
        await queryClient.cancelQueries({ queryKey: getForApplicationKey });
        patchEmail(emailId, { isHidden: true });
      },
      onError: (error) => {
        queryClient.invalidateQueries({ queryKey: getForApplicationKey });
        toast.add({ type: "error", title: "Could not hide email", description: error.message });
      },
    })
  );

  const unhideEmail = useMutation(
    trpc.mail.unhideEmail.mutationOptions({
      onMutate: async ({ emailId }) => {
        await queryClient.cancelQueries({ queryKey: getForApplicationKey });
        patchEmail(emailId, { isHidden: false });
      },
      onError: (error) => {
        queryClient.invalidateQueries({ queryKey: getForApplicationKey });
        toast.add({ type: "error", title: "Could not restore email", description: error.message });
      },
    })
  );

  const rematch = useMutation(
    trpc.mail.rematch.mutationOptions({
      onSuccess: (result) => {
        toast.add({
          type: "success",
          title: "Re-match complete",
          description: `${result.insertedCount} email${result.insertedCount === 1 ? "" : "s"} matched${
            result.removedCount > 0 ? `, ${result.removedCount} no longer match` : ""
          }.`,
        });
        queryClient.invalidateQueries({ queryKey: getForApplicationKey });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Re-match failed", description: error.message });
      },
    })
  );

  const handleKeywordsChange = (next: string[]) => {
    updateKeywords.mutate({ applicationId, keywords: next });
  };

  const handleRematch = () => {
    rematch.mutate({ applicationId });
  };

  if (gmailQuery.isLoading || emailsQuery.isLoading) {
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

  const busy = sync.isPending || rematch.isPending || updateKeywords.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Emails</h2>
          <p className="text-sm text-muted-foreground">
            {visibleEmails.length} email{visibleEmails.length === 1 ? "" : "s"} matched to this application.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRematch}
            disabled={busy}
            title="Clear and re-run the smart matcher"
          >
            <RefreshCw className={rematch.isPending ? "animate-spin" : ""} />
            Re-match
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate({ applicationId })}
            disabled={busy}
          >
            <RefreshCw className={sync.isPending ? "animate-spin" : ""} />
            Sync
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Searching by:</span>
            <Badge variant="secondary">{`"${searchConfig?.company ?? ""}"`}</Badge>
            {(searchConfig?.keywords ?? []).map((keyword) => (
              <Badge key={keyword} variant="secondary">
                {keyword}
              </Badge>
            ))}
            {updateKeywords.isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          <TagsEditor
            value={searchConfig?.keywords ?? []}
            onChange={handleKeywordsChange}
            placeholder="e.g. acme.com, recruiter"
            addLabel="Add keyword"
            disabled={busy}
          />
        </CardContent>
      </Card>

      {emailsQuery.isFetching ? (
        <Skeleton className="h-64 w-full" />
      ) : visibleEmails.length === 0 ? (
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
          {visibleEmails.map((email) => (
            <div key={email.id} className="flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{email.subject || "(no subject)"}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {email.relevanceScore != null && (
                    <span className="text-xs text-muted-foreground">{email.relevanceScore}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {email.internalDate?.toLocaleString() ?? ""}
                  </span>
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{email.fromEmail}</span>
              {email.matchReasons && email.matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {email.matchReasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
              {email.snippet && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{email.snippet}</p>
              )}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => hideEmail.mutate({ emailId: email.id })}
                  className="text-muted-foreground"
                >
                  <EyeOff />
                  Hide
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hiddenEmails.length > 0 && (
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger
            render={
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" />
            }
          >
            Hidden ({hiddenEmails.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col divide-y rounded-lg border border-dashed bg-muted/30">
            {hiddenEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{email.subject || "(no subject)"}</p>
                  <p className="truncate text-xs text-muted-foreground">{email.fromEmail}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unhideEmail.mutate({ emailId: email.id })}
                  className="shrink-0 text-muted-foreground"
                >
                  <Undo2 />
                  Restore
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
