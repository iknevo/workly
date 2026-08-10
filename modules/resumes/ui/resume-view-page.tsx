"use client";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { ResumeCodeViewer } from "./resume-code-viewer";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

export function ResumeViewPage({ resumeId }: { resumeId: string }) {
  const trpc = useTRPC();

  const resumeQuery = useQuery(trpc.resumes.getOne.queryOptions({ id: resumeId }));
  const resume = resumeQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/resumes" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {resume?.title ?? "Resume"}
            </h1>
            <p className="text-sm text-muted-foreground">LaTeX source for this base resume.</p>
          </div>
        </div>
        {resume && (
          <Link
            href={`/resumes/${resume.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil />
            Edit
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {resumeQuery.isLoading || !resume ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ResumeCodeViewer content={resume.content} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
