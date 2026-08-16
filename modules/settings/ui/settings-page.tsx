"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Info, KeyRound, Mail, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { SubmitEventHandler, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  yahoo: "Yahoo",
  icloud: "iCloud",
  imap: "Custom IMAP",
};

const PROVIDER_GUIDES: Record<
  string,
  { title: string; steps: string[]; url?: string; urlLabel?: string }
> = {
  gmail: {
    title: "Connect Gmail",
    steps: [
      "Turn on 2-Step Verification at myaccount.google.com/security.",
      "Go to myaccount.google.com/apppasswords (you may need to sign in again).",
      'Under "Select app", pick Mail, or "Other (custom name)" and type Workly.',
      "Click Generate. Google shows a 16-character code.",
      "Paste that code into the App password field below.",
    ],
    url: "https://myaccount.google.com/apppasswords",
    urlLabel: "Open Gmail app passwords",
  },
  imap: {
    title: "Connect Custom IMAP",
    steps: [
      "Find your mail provider's IMAP host and port (check their support or help pages).",
      "If your provider supports app passwords, create one for this account, otherwise your regular password may work.",
      "Fill in the IMAP host and port in the fields below (993 is the standard TLS port this app uses).",
      "Paste your app or account password into the App password field.",
      "If it fails, check that IMAP access is enabled in your provider's settings.",
    ],
  },
};

export function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const configuredQuery = useQuery(trpc.mail.isConfigured.queryOptions());

  const accounts = accountsQuery.data ?? [];
  const configured = configuredQuery.data?.configured ?? false;

  const [provider, setProvider] = useState("gmail");
  const [guideProvider, setGuideProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("993");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeGuide = guideProvider ?? (PROVIDER_GUIDES[provider] ? provider : "gmail");
  const guide = PROVIDER_GUIDES[activeGuide];

  const connect = useMutation(
    trpc.mail.connect.mutationOptions({
      onSuccess: () => {
        toast.add({
          type: "success",
          title: "Email connected",
          description: "Email tracking is ready.",
        });
        setEmail("");
        setAppPassword("");
        setProvider("gmail");
        queryClient.invalidateQueries({ queryKey: trpc.mail.getAccounts.queryKey() });
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

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!email || !appPassword) return;
    connect.mutate({
      provider: provider as "gmail" | "yahoo" | "icloud" | "imap",
      email,
      appPassword,
      host: host.trim() || undefined,
      port: port ? Number(port) : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile and connected accounts.</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Connect one or more email accounts so recruiter emails auto-sync to each application.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {accountsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No email account connected yet.</p>
          ) : (
            <div className="flex flex-col divide-y rounded-lg border">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{account.email}</span>
                    <Badge variant="secondary">
                      {PROVIDER_LABELS[account.provider] ?? account.provider}
                    </Badge>
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

          {!configured ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Email tracking</span>
              <span className="text-xs text-muted-foreground">
                Not configured — add ENCRYPTION_KEY to your environment to connect email accounts.
              </span>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider" className="min-h-5">
                    Provider
                    <Popover>
                      <PopoverTrigger
                        aria-label="How to connect this provider"
                        className="ml-auto inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Info className="size-3.5" />
                      </PopoverTrigger>
                      <PopoverContent className="max-h-[70vh] w-80 overflow-auto sm:w-96">
                        <div className="flex flex-wrap items-center gap-1">
                          {(["gmail", "imap"] as const).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setGuideProvider(key)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                activeGuide === key
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {PROVIDER_LABELS[key]}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-semibold">{guide.title}</span>
                          <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
                            {guide.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                          {guide.url ? (
                            <a
                              href={guide.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                            >
                              {guide.urlLabel}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </Label>
                  <Select
                    value={provider}
                    onValueChange={(v) => {
                      setProvider(v ?? "gmail");
                      setGuideProvider(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="imap">Custom IMAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="min-h-5">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appPassword">App password</Label>
                <Input
                  id="appPassword"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="16-character app password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  An app password lets an app read your inbox without your regular password.
                </p>
              </div>

              {provider === "imap" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="host">IMAP host</Label>
                    <Input
                      id="host"
                      required
                      placeholder="imap.example.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Preset server for {PROVIDER_LABELS[provider]} will be used.
                    <button
                      type="button"
                      className="ml-1 underline underline-offset-2 hover:text-foreground"
                      onClick={() => setShowAdvanced((v) => !v)}
                    >
                      {showAdvanced ? "Hide" : "Advanced"}
                    </button>
                  </span>
                  {showAdvanced ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="host">IMAP host</Label>
                        <Input
                          id="host"
                          placeholder="Override server host"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          min={1}
                          max={65535}
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Email tracking</span>
                  <span className="text-xs text-muted-foreground">
                    Read-only inbox access to match emails to each application.
                  </span>
                </div>
                <Button type="submit" disabled={connect.isPending}>
                  <KeyRound />
                  {connect.isPending
                    ? "Connecting…"
                    : accounts.length === 0
                      ? "Connect email"
                      : "Add email account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
