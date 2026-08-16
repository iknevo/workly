"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Loader2, Mail, RefreshCw, Undo2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  EmailPreviewDrawer,
  type MailEmail,
  type MailSearchData,
  mailInitials,
} from "@/modules/mail/ui/email-preview";
import { TagsEditor } from "@/modules/profile/ui/editors";
import { useTRPC } from "@/trpc/client";

export function EmailsTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<MailEmail | null>(null);

  const accountsQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const emailsQuery = useQuery(trpc.mail.getForApplication.queryOptions({ applicationId }));

  const accounts = accountsQuery.data ?? [];
  const accountEmailById = new Map(accounts.map((account) => [account.id, account.email]));
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

  const patchEmail = useCallback(
    (emailId: string, patch: Partial<MailEmail>) => {
      queryClient.setQueryData<MailSearchData>(getForApplicationKey, (old) =>
        old
          ? {
              ...old,
              emails: old.emails.map((email) =>
                email.id === emailId ? { ...email, ...patch } : email
              ),
            }
          : old
      );
    },
    [queryClient, getForApplicationKey]
  );

  const markRead = useMutation(trpc.mail.markRead.mutationOptions({}));
  const lastReadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedEmail || selectedEmail.isRead || lastReadRef.current === selectedEmail.id) return;
    lastReadRef.current = selectedEmail.id;
    patchEmail(selectedEmail.id, { isRead: true });
    markRead.mutate({ emailId: selectedEmail.id });
  }, [selectedEmail, markRead, patchEmail]);

  const currentIndex = selectedEmail
    ? visibleEmails.findIndex((email) => email.id === selectedEmail.id)
    : -1;

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

  const [autoSyncing, setAutoSyncing] = useState(false);

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
        if (result.needsSync && !autoSyncing && !sync.isPending) {
          setAutoSyncing(true);
          sync.mutate(
            { applicationId },
            {
              onSettled: () => setAutoSyncing(false),
            }
          );
        }
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" onClick={handleRematch} disabled={busy} />
              }
            >
              <RefreshCw className={rematch.isPending ? "animate-spin" : ""} />
              Re-match
            </TooltipTrigger>
            <TooltipContent>
              Reset and re-run the matcher from scratch. Clears all current matches (including
              hidden ones) and re-scans your inbox against the current keywords.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sync.mutate({ applicationId })}
                  disabled={busy}
                />
              }
            >
              <RefreshCw className={sync.isPending ? "animate-spin" : ""} />
              Sync
            </TooltipTrigger>
            <TooltipContent>
              Scan your inbox for new emails matching this application. Adds new matches and
              removes ones that no longer match, without clearing your current matches.
            </TooltipContent>
          </Tooltip>
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
            {(updateKeywords.isPending || autoSyncing) && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <TagsEditor
            value={searchConfig?.keywords ?? []}
            onChange={handleKeywordsChange}
            placeholder="e.g. acme.com, recruiter"
            addLabel="Add keyword"
            disabled={updateKeywords.isPending}
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
          {visibleEmails.map((email) => {
            const accountEmail = accountEmailById.get(email.mailAccountId);
            return (
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
                className="group flex w-full min-w-0 cursor-pointer items-center gap-3 p-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {mailInitials(email.fromEmail)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    {!email.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    )}
                    <span
                      className={`truncate ${email.isRead ? "font-medium text-muted-foreground" : "font-semibold"}`}
                    >
                      {email.subject || "(no subject)"}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs text-muted-foreground">{email.fromEmail}</span>
                    {accountEmail ? (
                      <Badge
                        variant="outline"
                        title={`Received in ${accountEmail}`}
                        className="shrink-0 text-[10px] font-normal text-muted-foreground"
                      >
                        {accountEmail}
                      </Badge>
                    ) : null}
                    {email.internalDate ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {email.internalDate.toLocaleDateString()}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      hideEmail.mutate({ emailId: email.id, applicationId });
                    }}
                    title="Hide email"
                    className="opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                  >
                    <EyeOff className="size-4" />
                  </Button>
                </span>
              </div>
            );
          })}
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
            {hiddenEmails.map((email) => {
              const accountEmail = accountEmailById.get(email.mailAccountId);
              return (
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
                  className="group flex w-full min-w-0 cursor-pointer items-center gap-3 p-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {mailInitials(email.fromEmail)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{email.subject || "(no subject)"}</span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs text-muted-foreground">{email.fromEmail}</span>
                      {accountEmail ? (
                        <Badge
                          variant="outline"
                          title={`Received in ${accountEmail}`}
                          className="shrink-0 text-[10px] font-normal text-muted-foreground"
                        >
                          {accountEmail}
                        </Badge>
                      ) : null}
                      {email.internalDate ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {email.internalDate.toLocaleDateString()}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      unhideEmail.mutate({ emailId: email.id, applicationId });
                    }}
                    className="shrink-0 text-muted-foreground"
                  >
                    <Undo2 />
                    Restore
                  </Button>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      <EmailPreviewDrawer
        email={selectedEmail}
        applicationId={applicationId}
        accountEmail={
          selectedEmail ? accountEmailById.get(selectedEmail.mailAccountId) : undefined
        }
        onOpenChange={(open) => {
          if (!open) setSelectedEmail(null);
        }}
        onPrev={currentIndex > 0 ? () => setSelectedEmail(visibleEmails[currentIndex - 1]) : null}
        onNext={
          currentIndex >= 0 && currentIndex < visibleEmails.length - 1
            ? () => setSelectedEmail(visibleEmails[currentIndex + 1])
            : null
        }
        pending={hideEmail.isPending || unhideEmail.isPending}
        onHide={() => {
          if (!selectedEmail) return;
          hideEmail.mutate({ emailId: selectedEmail.id, applicationId });
          setSelectedEmail(null);
        }}
        onRestore={() => {
          if (!selectedEmail) return;
          unhideEmail.mutate({ emailId: selectedEmail.id, applicationId });
          setSelectedEmail(null);
        }}
      />
    </div>
  );
}
