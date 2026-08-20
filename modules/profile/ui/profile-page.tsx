"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { normalizeSkills } from "@/db/schema";
import { ProfileForm } from "@/modules/profile/ui/profile-form";
import { useTRPC } from "@/trpc/client";

function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <ProfilePageSuspense />
      </ErrorBoundary>
    </Suspense>
  );
}

function ProfilePageSuspense() {
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
          {!profile ? (
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
