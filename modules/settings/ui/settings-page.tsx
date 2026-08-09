"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import type { users as usersTable } from "@/db/schema";
import { useTRPC } from "@/trpc/client";

type Me = typeof usersTable.$inferSelect;

export function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const meQuery = useQuery(trpc.users.getMe.queryOptions());
  const accountsQuery = useQuery(trpc.mail.getAccounts.queryOptions());
  const configuredQuery = useQuery(trpc.mail.isConfigured.queryOptions());

  const me = meQuery.data;
  const accounts = accountsQuery.data ?? [];
  const configured = configuredQuery.data?.configured ?? false;

  useEffect(() => {
    const gmail = searchParams.get("gmail");
    if (gmail === "success") {
      toast.add({
        type: "success",
        title: "Gmail connected",
        description: "Email tracking is ready.",
      });
    } else if (gmail === "error") {
      toast.add({
        type: "error",
        title: "Gmail connection failed",
        description: "Please try again.",
      });
    }
  }, [searchParams]);

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
          Your profile, resume defaults, and connected accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>These details feed your base resumes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {meQuery.isLoading || !me ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ProfileForm me={me} />
          )}
        </CardContent>
      </Card>

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

function ProfileForm({ me }: { me: Me }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: me.name ?? "",
    email: me.email ?? "",
    headline: me.headline ?? "",
    phone: me.phone ?? "",
    location: me.location ?? "",
  });

  const updateMe = useMutation(
    trpc.users.updateMe.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Profile updated" });
        queryClient.invalidateQueries({ queryKey: trpc.users.getMe.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to update", description: error.message }),
    })
  );

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={form.name} onChange={set("name")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={form.headline}
            onChange={set("headline")}
            placeholder="Senior Software Engineer, 8 years experience"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={set("location")}
            placeholder="Remote / New York, NY"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() =>
            updateMe.mutate({
              name: form.name,
              email: form.email || null,
              headline: form.headline || null,
              phone: form.phone || null,
              location: form.location || null,
            })
          }
          disabled={updateMe.isPending || form.name.trim().length === 0}
        >
          {updateMe.isPending && <Loader2 className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}
