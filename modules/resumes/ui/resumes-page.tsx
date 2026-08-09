"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { ResumeCodeViewer } from "@/modules/resumes/ui/resume-code-viewer";
import { useTRPC } from "@/trpc/client";

export function ResumesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const resumes = resumesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            Base resumes in LaTeX. The AI rewrites these to match each job.
          </p>
        </div>
        <ResumeDialog />
      </div>

      {resumesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No resumes yet</EmptyTitle>
                <EmptyDescription>
                  Create a base resume in LaTeX. Workly ships a starter template you can build on.
                </EmptyDescription>
              </EmptyHeader>
              <ResumeDialog />
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  resume,
}: {
  resume: { id: string; title: string; content: string; updatedAt: Date; createdAt: Date };
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const remove = useMutation(
    trpc.resumes.remove.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume deleted" });
        queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to delete", description: error.message }),
    })
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{resume.title}</span>
              <span className="text-xs text-muted-foreground">
                Updated {resume.updatedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
            View
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate({ id: resume.id })}>
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{resume.title}</DialogTitle>
            <DialogDescription>LaTeX source for this base resume.</DialogDescription>
          </DialogHeader>
          <ResumeCodeViewer content={resume.content} />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit resume</DialogTitle>
            <DialogDescription>Update the LaTeX source of this resume.</DialogDescription>
          </DialogHeader>
          <ResumeEditor
            resume={resume}
            onDone={() => {
              setEditOpen(false);
              queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ResumeDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const create = useMutation(
    trpc.resumes.create.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume created" });
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to create", description: error.message }),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New resume
      </DialogTrigger>
      <DialogContent className="max-w-5xl!">
        <DialogHeader>
          <DialogTitle>New resume</DialogTitle>
          <DialogDescription>Start from the starter template.</DialogDescription>
        </DialogHeader>
        <ResumeEditor
          onDone={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

const STARTER_TEMPLATE = `\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{left=1.2cm, right=1.2cm, top=1.2cm, bottom=1.2cm}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\hypersetup{colorlinks=true, urlcolor=blue}

\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\vspace{-0.4em}\\rule{\\textwidth}{0.4pt}]
\\titlespacing*{\\section}{0pt}{0.8em}{0.4em}

\\pagestyle{empty}

\\begin{document}

\\begin{center}
    \\LARGE\\textbf{Your Name}\\\\[0.2em]
    \\normalsize email@example.com $\\mid$ (555) 555-5555 $\\mid$ City, State\\\[0.2em]
    \\normalsize \\href{https://github.com/yourusername}{github.com/yourusername} $\\mid$ \\href{https://linkedin.com/in/yourusername}{linkedin.com/in/yourusername}
\\end{center}

\\section{Summary}
Motivated software engineer with experience building production web applications.

\\section{Experience}
\\textbf{Software Engineer} \\hfill Company \\\\[-0.3em]
\\textit{Jan 2022 --- Present}
\\begin{itemize}[leftmargin=1em, itemsep=0pt]
    \\item Built and shipped features used by millions of users.
    \\item Improved performance and reliability of core services.
\\end{itemize}

\\section{Education}
\\textbf{B.S. in Computer Science} \\hfill University \\\\[-0.3em]
\\textit{2016 --- 2020}

\\section{Skills}
\\textbf{Languages:} TypeScript, Python \\\\
\\textbf{Frameworks:} React, Next.js \\\\
\\textbf{Tools:} PostgreSQL, Docker

\\end{document}
`;

function ResumeEditor({
  resume,
  onDone,
}: {
  resume?: { id: string; title: string; content: string };
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(resume?.title ?? "");
  const [content, setContent] = useState(resume?.content ?? STARTER_TEMPLATE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const update = useMutation(
    trpc.resumes.update.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume saved" });
        queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
        onDone();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to save", description: error.message }),
    })
  );

  const create = useMutation(
    trpc.resumes.create.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Resume created" });
        queryClient.invalidateQueries({ queryKey: trpc.resumes.getMany.queryKey() });
        onDone();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to create", description: error.message }),
    })
  );

  const compile = useMutation(
    trpc.resumes.compile.mutationOptions({
      onSuccess: (result) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
        setPreviewUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      },
      onError: (error) =>
        toast.add({
          type: "error",
          title: "Compile failed",
          description: error.message.slice(0, 300),
        }),
    })
  );

  const pending = update.isPending || create.isPending;
  const valid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="resume-title">Title</Label>
        <Input
          id="resume-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="General / Software Engineer"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="resume-content">LaTeX source</Label>
          <span className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} chars
          </span>
        </div>
        <Textarea
          id="resume-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="font-mono text-xs leading-relaxed"
        />
      </div>
      {previewUrl && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>PDF preview</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              Close
            </Button>
          </div>
          <iframe
            src={previewUrl}
            className="h-[420px] w-full rounded-lg border bg-white"
            title="PDF preview"
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => compile.mutate({ content })}
          disabled={compile.isPending}
        >
          {compile.isPending && <Loader2 className="animate-spin" />}
          {previewUrl ? "Recompile" : "Preview PDF"}
        </Button>
        <Button
          onClick={() =>
            resume
              ? update.mutate({ id: resume.id, title, content })
              : create.mutate({ title, content })
          }
          disabled={pending || !valid}
        >
          {pending && <Loader2 className="animate-spin" />}
          {resume ? "Save changes" : "Create resume"}
        </Button>
      </div>
    </div>
  );
}
