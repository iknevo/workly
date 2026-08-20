"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Info, KeyRound, Mail, Trash2, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { type SubmitEventHandler, useState } from "react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
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

function ApiKeySection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const statusQuery = useQuery(trpc.users.getApiKeyStatus.queryOptions());
  const hasKey = statusQuery.data?.hasKey ?? false;

  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const saveMutation = useMutation(
    trpc.users.updateApiKey.mutationOptions({
      onSuccess: () => {
        setKey("");
        queryClient.invalidateQueries({ queryKey: trpc.users.getApiKeyStatus.queryKey() });
        toast.add({ title: "API key saved" });
      },
    })
  );

  const handleSave = () => {
    if (!key.trim()) return;
    setSaving(true);
    saveMutation.mutate({ apiKey: key.trim() }, { onSettled: () => setSaving(false) });
  };

  const handleClear = () => {
    setSaving(true);
    saveMutation.mutate({ apiKey: "" }, { onSettled: () => setSaving(false) });
  };

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Groq API Key</span>
        <span className="text-xs text-muted-foreground">
          Your Groq API key for AI resume tailoring. Get one free at console.groq.com.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={hasKey ? "••••••••••••••••" : "gsk_..."}
            autoComplete="off"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={!key.trim() || saving}>
          Save
        </Button>
        {hasKey && (
          <Button size="sm" variant="outline" onClick={handleClear} disabled={saving}>
            Clear
          </Button>
        )}
      </div>

      {hasKey && !key && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          Key saved
        </div>
      )}

      <Popover>
        <PopoverTrigger className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Info className="size-3.5" />
          How to get a Groq API key
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Get a Groq API key</span>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  console.groq.com
                </a>
              </li>
              <li>Sign up or log in (free, no credit card required).</li>
              <li>Click &quot;API Keys&quot; in the left sidebar.</li>
              <li>Click &quot;Create API Key&quot;.</li>
              <li>Copy the key (it starts with gsk_).</li>
              <li>Paste it above and click Save.</li>
            </ol>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              Open Groq Console
              <ExternalLink className="size-3" />
            </a>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Card>
        <CardContent className="flex flex-col divide-y">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9" />
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <SettingsPageContent />
      </ErrorBoundary>
    </Suspense>
  );
}

function SettingsPageContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();

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
        <p className="text-sm text-muted-foreground">Appearance, profile, and email accounts.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Dark mode</span>
              <span className="text-xs text-muted-foreground">
                Follows your device until you switch.
              </span>
            </div>
            <Switch
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Profile</span>
              <span className="text-xs text-muted-foreground">
                Basics, skills, experience, education, projects, and links.
              </span>
            </div>
            <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <UserRound />
              Edit profile
            </Link>
          </div>

          <ApiKeySection />

          <div className="flex flex-col gap-4 py-4 last:pb-0">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Email</span>
              <span className="text-xs text-muted-foreground">
                Connect one or more email accounts so recruiter emails auto-sync to each
                application.
              </span>
            </div>
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
                  Not configured - add ENCRYPTION_KEY to your environment to connect email accounts.
                </span>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
                                rel="noopener noreferrer"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
