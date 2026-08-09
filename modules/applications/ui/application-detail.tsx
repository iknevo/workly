"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";
import { OverviewTab } from "@/modules/applications/ui/tabs/overview-tab";
import { ResumeTab } from "@/modules/applications/ui/tabs/resume-tab";
import { TimelineTab } from "@/modules/applications/ui/tabs/timeline-tab";
import { EmailsTab } from "@/modules/applications/ui/tabs/emails-tab";

import { ArrowLeft, ExternalLink } from "lucide-react";

export function ApplicationDetail({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const [tab, setTab] = useState("overview");

  const applicationQuery = useQuery(trpc.applications.getOne.queryOptions({ id: applicationId }));
  const application = applicationQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/applications" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <ArrowLeft />
        </Link>
        {applicationQuery.isLoading ? (
          <Skeleton className="h-8 w-72" />
        ) : application ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{application.position}</h1>
              <Badge className={cn(APPLICATION_STATUS_CONFIG[application.status].className)}>
                {APPLICATION_STATUS_CONFIG[application.status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {application.company}
              {application.location ? ` · ${application.location}` : ""}
              {application.url ? (
                <>
                  {" · "}
                  <Link
                    href={application.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    posting <ExternalLink className="size-3" />
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          {application ? <OverviewTab application={application} /> : <Card><CardContent className="py-10"><Skeleton className="h-40 w-full" /></CardContent></Card>}
        </TabsContent>
        <TabsContent value="resume" className="pt-4">
          <ResumeTab applicationId={applicationId} />
        </TabsContent>
        <TabsContent value="timeline" className="pt-4">
          <TimelineTab applicationId={applicationId} />
        </TabsContent>
        <TabsContent value="emails" className="pt-4">
          <EmailsTab applicationId={applicationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
