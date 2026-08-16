"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Copy, EyeOff, Reply, Undo2, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmailBody } from "@/modules/mail/ui/email-body";
import { useTRPC } from "@/trpc/client";

export type MailEmail = {
  id: string;
  mailAccountId: string;
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
  isRead: boolean;
};

export type MailSearchData = {
  company: string;
  keywords: string[];
  emails: MailEmail[];
};

export function mailInitials(from: string | null): string {
  if (!from) return "?";
  const name = from.split("<")[0].trim();
  const local = from.match(/<([^>]+)>/)?.[1] ?? name;
  const base = name || local;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase() || "?";
}

type EmailPreviewDrawerProps = {
  email: MailEmail | null;
  applicationId: string;
  accountEmail?: string | null;
  onOpenChange: (open: boolean) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  pending: boolean;
  onHide: () => void;
  onRestore: () => void;
};

export function EmailPreviewDrawer({
  email,
  applicationId,
  accountEmail,
  onOpenChange,
  onPrev,
  onNext,
  pending,
  onHide,
  onRestore,
}: EmailPreviewDrawerProps) {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const getForApplicationKey = trpc.mail.getForApplication.queryKey({ applicationId });

  const bodyQuery = useQuery({
    ...trpc.mail.getEmail.queryOptions({ emailId: email?.id ?? "" }),
    enabled: !!email && !email.bodyText,
  });

  useEffect(() => {
    if (email && bodyQuery.data?.bodyText && !email.bodyText) {
      queryClient.setQueryData<MailSearchData>(getForApplicationKey, (old) =>
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
  }, [bodyQuery.data, email, getForApplicationKey, queryClient]);

  const copyAddress = async () => {
    const address = email?.senderEmail;
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.add({ type: "success", title: "Email address copied" });
  };

  const replyHref = email?.senderEmail
    ? `mailto:${email.senderEmail}?subject=${encodeURIComponent(`Re: ${email.subject ?? ""}`)}`
    : null;

  const body = email
    ? email.bodyText ?? bodyQuery.data?.bodyText ?? (bodyQuery.isFetching ? "" : (email.snippet ?? ""))
    : "";

  return (
    <Drawer
      open={!!email}
      onOpenChange={onOpenChange}
      modal
      swipeDirection={isMobile ? "down" : "right"}
      snapPoints={isMobile ? [0.55, 1] : undefined}
      showSwipeHandle={isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:38rem]">
        {email ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onPrev ?? undefined}
                  disabled={!onPrev}
                  title="Previous email"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onNext ?? undefined}
                  disabled={!onNext}
                  title="Next email"
                >
                  <ChevronRight />
                </Button>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} title="Close">
                <X />
              </Button>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>{mailInitials(email.fromEmail)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {email.fromEmail ?? "(unknown sender)"}
                      </span>
                      {!email.isRead && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{email.fromEmail}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {email.internalDate ? (
                    <span className="text-xs text-muted-foreground">
                      {format(email.internalDate, "EEE, MMM d · h:mm a")}
                    </span>
                  ) : null}
                  {email.relevanceScore != null ? (
                    <Badge variant="secondary">Score {email.relevanceScore}</Badge>
                  ) : null}
                </div>
              </div>

              <h2 className="break-words text-base font-semibold leading-snug">
                {email.subject || "(no subject)"}
              </h2>

              {email.toEmail ? (
                <p className="break-words text-xs text-muted-foreground">To: {email.toEmail}</p>
              ) : null}

              {accountEmail ? (
                <p className="break-words text-xs text-muted-foreground">Via: {accountEmail}</p>
              ) : null}

              {(email.matchReasons?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {email.matchReasons?.map((reason) => (
                    <span
                      key={reason}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}

              {email.isHidden ? (
                <Badge variant="secondary" className="w-fit">
                  Hidden
                </Badge>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {bodyQuery.isFetching && !email.bodyText ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : body ? (
                <EmailBody text={body} className="mx-auto max-w-[65ch]" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {bodyQuery.isError
                    ? "Could not fetch the full email body. Reconnect your account and sync to refresh it."
                    : "This email has no readable body."}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
              <div className="flex items-center gap-1">
                {replyHref ? (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<a href={replyHref} />}
                    title="Reply"
                  >
                    <Reply />
                    Reply
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled title="Reply">
                    <Reply />
                    Reply
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={copyAddress} title="Copy email address">
                  <Copy />
                  Copy
                </Button>
              </div>
              {email.isHidden ? (
                <Button variant="ghost" size="sm" onClick={onRestore} disabled={pending}>
                  <Undo2 />
                  Restore
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHide}
                  disabled={pending}
                  className="text-muted-foreground"
                >
                  <EyeOff />
                  Hide
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
