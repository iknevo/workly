"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Mail, Plus, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

export function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const accountsQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const configuredQuery = useQuery(trpc.mail.isConfigured.queryOptions());

  const accounts = accountsQuery.data ?? [];
  const configured = configuredQuery.data?.configured ?? false;

  const gmailError = searchParams.get("gmail") === "error" ? searchParams.get("reason") : null;
  const gmailSuccess = searchParams.get("gmail") === "success";

  useEffect(() => {
    if (gmailSuccess) {
      toast.add({
        type: "success",
        title: "Gmail connected",
        description: "Email tracking is ready.",
      });
    }
  }, [gmailSuccess]);

  const getAuthUrl = useMutation(
    trpc.mail.getAuthUrl.mutationOptions({
      onSuccess: (url) => {
        window.location.assign(url);
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to connect", description: error.message }),
    })
  );

  const disconnect = useMutation(
    trpc.mail.disconnect.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Account disconnected" });
        queryClient.invalidateQueries({ queryKey: trpc.mail.getAccounts.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to disconnect", description: error.message }),
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your profile and connected accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            All your personal data lives on your profile. Applications and the AI pull from it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Basics, skills, experience, education, projects, and links.
          </p>
          <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <UserRound />
            Edit profile
          </Link>
        </CardContent>
      </Card>

      {gmailError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gmail connection failed</AlertTitle>
          <AlertDescription className="break-all">
            {gmailError || "Unknown error"}{" "}
            <span className="text-muted-foreground">
              — make sure the exact redirect URI
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">
                /api/gmail/callback
              </code>
              is registered in Google Cloud Console.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <CardDescription>
            Connect a Gmail account so recruiter emails auto-sync to each application.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {accountsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Gmail account connected yet.</p>
          ) : (
            <div className="flex flex-col divide-y rounded-lg border">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{account.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect.mutate({ accountId: account.id })}
                    disabled={disconnect.isPending}
                  >
                    <Trash2 />
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Recruiter email tracking</span>
              <span className="text-xs text-muted-foreground">
                {configured
                  ? "Read-only Gmail access to match emails to each application."
                  : "Not configured — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment."}
              </span>
            </div>
            {!configured ? (
              <Badge className="bg-muted text-muted-foreground">Unconfigured</Badge>
            ) : accounts.length === 0 ? (
              <Button onClick={() => getAuthUrl.mutate()} disabled={getAuthUrl.isPending}>
                <Plus />
                Connect Gmail
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
