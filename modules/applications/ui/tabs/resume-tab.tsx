"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { toast } from "@/components/ui/toast";

import { normalizeSkills } from "@/db/schema";
import { useConfirm } from "@/hooks/use-confirm";
import { useTRPC } from "@/trpc/client";

export function ResumeTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [ConfirmationDialog, confirm] = useConfirm();
  const [selectedBaseResume, setSelectedBaseResume] = useState("");
  const [viewResumeId, setViewResumeId] = useState<string | null>(null);

  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const profileQuery = useQuery(trpc.users.getMe.queryOptions());
  const apiKeyQuery = useQuery(trpc.users.getApiKeyStatus.queryOptions());
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
    normalizeSkills(profile?.skills).some((g) => g.items.length) ||
    profile?.projects?.length ||
    profile?.education?.length
  );
  const hasBaseResume = Boolean(selectedBaseResume);
  const hasApiKey = apiKeyQuery.data?.hasKey ?? false;

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
            Pick a base resume and the AI will rewrite it to match this job&apos;s description - or
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
              disabled={generate.isPending || !hasApiKey}
            >
              {generate.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {hasBaseResume ? "Generate tailored resume" : "Generate from my profile"}
            </Button>
          </div>
          {!hasApiKey && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Settings className="size-3.5" />
              <Link
                href="/settings"
                className="font-medium text-primary underline underline-offset-2"
              >
                Add your Groq API key
              </Link>{" "}
              in Settings to enable AI resume tailoring.
            </p>
          )}
          {hasApiKey && (
            <p className="mt-3 text-xs text-muted-foreground">
              {hasBaseResume
                ? `The AI will rewrite "${formattedResumes.find((r) => r.value === selectedBaseResume)?.label ?? ""}" to match this job.`
                : profileHasData
                  ? "No base resume selected - the AI builds from your profile."
                  : "Your profile is empty. Add experience or skills on the Profile page, or select a base resume."}
            </p>
          )}
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
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-full"
      >
        <SheetHeader>
          <SheetTitle>Tailored resume</SheetTitle>
          <SheetDescription>
            {resume?.createdAt?.toLocaleString() ?? ""} - Edit the LaTeX and preview changes live.
          </SheetDescription>
        </SheetHeader>
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 px-4 pb-4">
          {resumeQuery.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : resume ? (
            <ResumeEditorInner key={resume.id} resume={resume} applicationId={applicationId} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResumeEditorInner({
  resume,
  applicationId,
}: {
  resume: { id: string; content: string; createdAt: Date };
  applicationId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [content, setContent] = useState(resume.content);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compileStatus, setCompileStatus] = useState<"idle" | "compiling" | "success" | "error">(
    "idle"
  );
  const [compileError, setCompileError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompiledRef = useRef<string | null>(null);

  const compile = useMutation(trpc.resumes.compile.mutationOptions());
  const compileMutateRef = useRef(compile.mutate);
  useEffect(() => {
    compileMutateRef.current = compile.mutate;
  }, [compile.mutate]);

  const save = useMutation(
    trpc.applications.updateResume.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume saved" });
        queryClient.invalidateQueries({
          queryKey: trpc.applications.getResumes.queryKey({ applicationId }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.applications.getResume.queryKey({ resumeId: resume.id, applicationId }),
        });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to save", description: error.message }),
    })
  );

  const compileTex = useCallback((tex: string) => {
    if (!tex.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++requestIdRef.current;
    setCompileStatus("compiling");
    setCompileError(null);
    compileMutateRef.current(
      { content: tex },
      {
        onSuccess: (result) => {
          if (id !== requestIdRef.current) return;
          lastCompiledRef.current = tex;
          const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreviewUrl(url);
          setCompileStatus("success");
        },
        onError: (error) => {
          if (id !== requestIdRef.current) return;
          setCompileError(error.message.slice(0, 300));
          setCompileStatus("error");
        },
      }
    );
  }, []);

  useEffect(() => {
    if (content.trim() === "" || content === lastCompiledRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => compileTex(content), 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, compileTex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">LaTeX source</span>
            <span className="text-xs text-muted-foreground">
              {content.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-0 flex-1 resize-none rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed focus:ring-1 focus:ring-ring focus:outline-none"
            spellCheck={false}
          />
        </div>
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">PDF preview</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {compileStatus === "compiling" && (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Compiling…
                </>
              )}
              {compileStatus === "success" && <span>Compiled</span>}
              {compileStatus === "error" && <span className="text-destructive">Failed</span>}
              {compileStatus === "idle" && <span>Waiting…</span>}
            </span>
          </div>
          {compileStatus === "error" && compileError && (
            <p className="max-h-24 overflow-auto rounded-lg bg-destructive/10 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
              {compileError}
            </p>
          )}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-white">
            {previewUrl ? (
              <iframe src={previewUrl} className="size-full" title="PDF preview" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {compileStatus === "compiling" ? "Compiling…" : "Preview will appear here"}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => compileTex(content)}
          disabled={compile.isPending || !content.trim()}
        >
          {compile.isPending && <Loader2 className="animate-spin" />}
          Recompile
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            save.mutate({
              resumeId: resume.id,
              applicationId,
              content,
            })
          }
          disabled={save.isPending || !content.trim()}
        >
          {save.isPending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </>
  );
}
