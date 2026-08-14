"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Loader2, Mail, RefreshCw, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
    toEmail: string | null;
    senderEmail: string | null;
    snippet: string | null;
    bodyText: string | null;
    internalDate: Date | null;
    relevanceScore: number | null;
    matchReasons: string[] | null;
    isHidden: boolean;
  }>;
};

type Email = SearchConfig["emails"][number];

function initials(from: string | null): string {
  if (!from) return "?";
  const name = from.split("<")[0].trim();
  const local = from.match(/<([^>]+)>/)?.[1] ?? name;
  const base = name || local;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase() || "?";
}

export function EmailsTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const accountsQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const emailsQuery = useQuery(trpc.mail.getForApplication.queryOptions({ applicationId }));

  const accounts = accountsQuery.data ?? [];
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

  if (accountsQuery.isLoading || emailsQuery.isLoading) {
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
              <EmptyTitle>Connect your email</EmptyTitle>
              <EmptyDescription>
                Connect an email account in Settings to automatically pull emails matching this
                application.
              </EmptyDescription>
            </EmptyHeader>
            <Link href="/settings" className={buttonVariants()}>
              <Mail />
              Connect email
            </Link>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const busy = sync.isPending || rematch.isPending || updateKeywords.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Emails</h2>
          <p className="text-sm text-muted-foreground">
            {visibleEmails.length} email{visibleEmails.length === 1 ? "" : "s"} matched to this
            application.
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
            {updateKeywords.isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
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
        <div className="flex min-w-0 flex-col divide-y overflow-hidden rounded-lg border bg-card">
          {visibleEmails.map((email) => (
            <div
              key={email.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedEmail(email)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedEmail(email);
                }
              }}
              className="group flex min-w-0 w-full cursor-pointer items-center gap-3 p-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {initials(email.fromEmail)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {email.subject || "(no subject)"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {email.fromEmail}
                  {email.internalDate ? ` · ${email.internalDate.toLocaleDateString()}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {email.relevanceScore != null && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {email.relevanceScore}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    hideEmail.mutate({ emailId: email.id });
                  }}
                  title="Hide email"
                  className="opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                >
                  <EyeOff className="size-4" />
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      {hiddenEmails.length > 0 && (
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger
            render={<Button variant="ghost" size="sm" className="w-full text-muted-foreground" />}
          >
            Hidden ({hiddenEmails.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col divide-y overflow-hidden rounded-lg border border-dashed bg-muted/30">
            {hiddenEmails.map((email) => (
              <div
                key={email.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEmail(email)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedEmail(email);
                  }
                }}
                className="group flex min-w-0 w-full cursor-pointer items-center gap-3 p-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {initials(email.fromEmail)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{email.subject || "(no subject)"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email.fromEmail}
                    {email.internalDate ? ` · ${email.internalDate.toLocaleDateString()}` : ""}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    unhideEmail.mutate({ emailId: email.id });
                  }}
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

      <Sheet
        open={!!selectedEmail}
        onOpenChange={(open) => {
          if (!open) setSelectedEmail(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          {selectedEmail && (
            <EmailDetail
              email={selectedEmail}
              applicationId={applicationId}
              pending={hideEmail.isPending || unhideEmail.isPending}
              onHide={() => {
                hideEmail.mutate({ emailId: selectedEmail.id });
                setSelectedEmail(null);
              }}
              onRestore={() => {
                unhideEmail.mutate({ emailId: selectedEmail.id });
                setSelectedEmail(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmailDetail({
  email,
  applicationId,
  pending,
  onHide,
  onRestore,
}: {
  email: Email;
  applicationId: string;
  pending: boolean;
  onHide: () => void;
  onRestore: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getForApplicationKey = trpc.mail.getForApplication.queryKey({ applicationId });

  const bodyQuery = useQuery({
    ...trpc.mail.getEmail.queryOptions({ emailId: email.id }),
    enabled: !email.bodyText,
  });

  useEffect(() => {
    if (bodyQuery.data?.bodyText && !email.bodyText) {
      queryClient.setQueryData<SearchConfig>(getForApplicationKey, (old) =>
        old
          ? {
              ...old,
              emails: old.emails.map((row) =>
                row.id === email.id ? { ...row, bodyText: bodyQuery.data?.bodyText ?? null } : row
              ),
            }
          : old
      );
    }
  }, [bodyQuery.data, email.id, email.bodyText, getForApplicationKey, queryClient]);

  const body =
    email.bodyText ??
    bodyQuery.data?.bodyText ??
    (bodyQuery.isFetching ? "" : (email.snippet ?? ""));

  return (
    <>
      <SheetHeader>
        <SheetTitle className="break-words">{email.subject || "(no subject)"}</SheetTitle>
        <SheetDescription className="break-words">
          {email.fromEmail}
          {email.toEmail ? ` → ${email.toEmail}` : ""}
          {email.internalDate ? ` · ${email.internalDate.toLocaleString()}` : ""}
        </SheetDescription>
      </SheetHeader>

      {email.matchReasons && email.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4">
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

      <div className="min-w-0 flex-1 overflow-y-auto border-t px-4 py-3">
        {bodyQuery.isFetching && !email.bodyText ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : body ? (
          <p className="whitespace-pre-wrap break-words text-sm">{body}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {bodyQuery.isError
              ? "Could not fetch the full email body. Reconnect your account and sync to refresh it."
              : "This email has no readable body."}
          </p>
        )}
      </div>

      <SheetFooter>
        {email.isHidden ? (
          <Button variant="ghost" onClick={onRestore} disabled={pending}>
            <Undo2 />
            Restore
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={onHide}
            disabled={pending}
            className="text-muted-foreground"
          >
            <EyeOff />
            Hide
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
