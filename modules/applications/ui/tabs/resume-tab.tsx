"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ResumeCodeViewer } from "@/modules/resumes/ui/resume-code-viewer";

import { Loader2, Sparkles, Trash2 } from "lucide-react";

export function ResumeTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedBaseResume, setSelectedBaseResume] = useState("");
  const [viewResumeId, setViewResumeId] = useState<string | null>(null);

  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const applicationResumesQuery = useQuery(
    trpc.applications.getResumes.queryOptions({ applicationId })
  );

  const resumes = resumesQuery.data ?? [];
  const applicationResumes = applicationResumesQuery.data ?? [];

  const generate = useMutation(
    trpc.applications.generateResume.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume tailored", description: "Your AI resume is ready." });
        setSelectedBaseResume("");
        queryClient.invalidateQueries({
          queryKey: trpc.applications.getResumes.queryKey({ applicationId }),
        });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Generation failed", description: error.message });
      },
    })
  );

  const remove = useMutation(
    trpc.applications.deleteResume.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume deleted" });
        queryClient.invalidateQueries({
          queryKey: trpc.applications.getResumes.queryKey({ applicationId }),
        });
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Failed to delete", description: error.message });
      },
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Tailor your resume
          </CardTitle>
          <CardDescription>
            Pick a base resume and the AI will rewrite it to match this job&apos;s description. Add
            the job description on the Overview tab first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-56 flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Base resume</span>
              <Select value={selectedBaseResume} onValueChange={(v) => setSelectedBaseResume(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => generate.mutate({ applicationId, baseResumeId: selectedBaseResume })}
              disabled={generate.isPending || !selectedBaseResume || resumes.length === 0}
            >
              {generate.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Generate tailored resume
            </Button>
          </div>
        </CardContent>
      </Card>

      {applicationResumesQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : applicationResumes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No tailored resumes yet</EmptyTitle>
            <EmptyDescription>
              Generate a resume tailored to this specific job posting using AI.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {applicationResumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      Tailored resume #{applicationResumes.indexOf(resume) + 1}
                    </span>
                    {resume.model && (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {resume.model}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Generated {resume.createdAt.toLocaleString()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewResumeId(resume.id)}>
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove.mutate({ resumeId: resume.id })}
                    disabled={remove.isPending}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResumeViewerDialog
        applicationId={applicationId}
        resumeId={viewResumeId}
        onClose={() => setViewResumeId(null)}
      />
    </div>
  );
}

function ResumeViewerDialog({
  applicationId,
  resumeId,
  onClose,
}: {
  applicationId: string;
  resumeId: string | null;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const resumeQuery = useQuery({
    ...trpc.applications.getResume.queryOptions({ resumeId: resumeId ?? "", applicationId }),
    enabled: resumeId !== null,
  });

  const resume = resumeQuery.data;

  return (
    <Dialog open={resumeId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Tailored resume</DialogTitle>
          <DialogDescription>
            Generated {resume?.createdAt?.toLocaleString() ?? ""} · view or copy the LaTeX source.
          </DialogDescription>
        </DialogHeader>
        {resumeQuery.isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : resume ? (
          <ResumeCodeViewer content={resume.content} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
