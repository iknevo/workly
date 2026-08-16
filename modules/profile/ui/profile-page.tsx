"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

import { normalizeSkills } from "@/db/schema";

import { ProfileForm } from "@/modules/profile/ui/profile-form";

export function ProfilePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const meQuery = useQuery(trpc.users.getMe.queryOptions());

  const me = meQuery.data;
  const profile = me
    ? {
        name: me.name,
        email: me.email,
        headline: me.headline,
        phone: me.phone,
        location: me.location,
        summary: me.summary,
        skills: normalizeSkills(me.skills),
        experience: me.experience ?? [],
        education: me.education ?? [],
        projects: me.projects ?? [],
        links: me.links ?? [],
      }
    : null;

  const updateProfile = useMutation(
    trpc.users.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Profile saved" });
        queryClient.invalidateQueries({ queryKey: trpc.users.getMe.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to save", description: error.message }),
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your personal data. Applications stay focused on the job; the AI builds your tailored
          resumes from this profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal data</CardTitle>
          <CardDescription>
            Organized into tabs so each section stays clean. Only what&apos;s filled in is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meQuery.isLoading || !profile ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ProfileForm
              profile={profile}
              onSave={(next) => updateProfile.mutate(next)}
              submitting={updateProfile.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
