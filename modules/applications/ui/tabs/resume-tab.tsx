"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

import { useConfirm } from "@/hooks/use-confirm";
import { ResumeCodeViewer } from "@/modules/resumes/ui/resume-code-viewer";
import { useTRPC } from "@/trpc/client";

export function ResumeTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [ConfirmationDialog, confirm] = useConfirm();
  const [selectedBaseResume, setSelectedBaseResume] = useState("");
  const [viewResumeId, setViewResumeId] = useState<string | null>(null);

  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const profileQuery = useQuery(trpc.users.getMe.queryOptions());
  const applicationResumesQuery = useQuery(
    trpc.applications.getResumes.queryOptions({ applicationId })
  );

  const resumes = resumesQuery.data ?? [];
  const formattedResumes = resumes.map((c) => ({
    value: c.id,
    label: c.title,
  }));
  const applicationResumes = applicationResumesQuery.data ?? [];

  const profile = profileQuery.data;
  const profileHasData = Boolean(
    profile?.experience?.length ||
    profile?.skills?.length ||
    profile?.projects?.length ||
    profile?.education?.length
  );
  const hasBaseResume = Boolean(selectedBaseResume);

  const generate = useMutation(
    trpc.applications.generateResume.mutationOptions({
      onSuccess: () => {
        toast.add({
          type: "success",
          title: "Resume tailored",
          description: "Your AI resume is ready.",
        });
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

  async function handleDelete(resumeId: string) {
    const ok = await confirm({
      title: "Delete tailored resume",
      message: "This tailored resume will be permanently deleted. This can't be undone.",
    });
    if (ok) remove.mutate({ resumeId });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Tailor your resume
          </CardTitle>
          <CardDescription>
            Pick a base resume and the AI will rewrite it to match this job&apos;s description — or
            skip it and generate straight from your profile. Add the job description on the Overview
            tab first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-56 flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Base resume</span>
              <Select
                value={selectedBaseResume || "none"}
                onValueChange={(v) => setSelectedBaseResume(v === "none" ? "" : (v ?? ""))}
                items={formattedResumes}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="none">None</SelectItem>
                  {formattedResumes.map((resume) => (
                    <SelectItem key={resume.value} value={resume.value}>
                      {resume.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                generate.mutate({
                  applicationId,
                  baseResumeId: selectedBaseResume || undefined,
                })
              }
              disabled={generate.isPending}
            >
              {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {hasBaseResume ? "Generate tailored resume" : "Generate from my profile"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {hasBaseResume
              ? `The AI will rewrite "${formattedResumes.find((r) => r.value === selectedBaseResume)?.label ?? ""}" to match this job.`
              : profileHasData
                ? "No base resume selected — the AI builds from your profile."
                : "Your profile is empty. Add experience or skills on the Profile page, or select a base resume."}
          </p>
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
                    onClick={() => handleDelete(resume.id)}
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

      <ConfirmationDialog />
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
    <Sheet open={resumeId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Tailored resume</SheetTitle>
          <SheetDescription>
            Generated {resume?.createdAt?.toLocaleString() ?? ""} · PDF preview or LaTeX source.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {resumeQuery.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : resume ? (
            <Tabs defaultValue="preview" className="gap-3">
              <TabsList variant="line">
                <TabsTrigger value="preview">PDF preview</TabsTrigger>
                <TabsTrigger value="source">LaTeX source</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <ResumePdfPreview key={resume.id} content={resume.content} />
              </TabsContent>
              <TabsContent value="source">
                <ResumeCodeViewer content={resume.content} />
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResumePdfPreview({ content }: { content: string }) {
  const trpc = useTRPC();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const compile = useMutation(trpc.resumes.compile.mutationOptions());

  useEffect(() => {
    if (!content.trim()) return;
    compile.mutate({ content }, {
      onSuccess: (result) => {
        const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setPreviewUrl(url);
        setError(null);
      },
      onError: (compileError) => {
        setError(compileError.message.slice(0, 300));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  if (compile.isPending) {
    return (
      <div className="flex h-[calc(100vh-16rem)] items-center justify-center rounded-lg border bg-white text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Compiling PDF…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="max-h-64 overflow-auto rounded-lg bg-destructive/10 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
          {error}
        </p>
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t compile a PDF preview. Switch to the LaTeX source tab to view the code.
        </p>
      </div>
    );
  }

  if (!previewUrl) return null;

  return (
    <iframe
      src={previewUrl}
      className="h-[calc(100vh-16rem)] w-full rounded-lg border bg-white"
      title="PDF preview"
    />
  );
}
