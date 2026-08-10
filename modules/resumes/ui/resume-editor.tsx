"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/client";

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
    \\normalsize email@example.com $\\mid$ (555) 555-5555 $\\mid$ City, State\\\\[0.2em]
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

const COMPILE_DEBOUNCE_MS = 600;

type CompileStatus = "idle" | "compiling" | "success" | "error";

export function ResumeEditor({
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
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [compileError, setCompileError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompiledRef = useRef<string | null>(null);

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

  const compile = useMutation(trpc.resumes.compile.mutationOptions());
  const compileMutateRef = useRef(compile.mutate);
  useEffect(() => {
    compileMutateRef.current = compile.mutate;
  }, [compile.mutate]);

  const compileTex = useCallback((tex: string) => {
    if (!tex.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++requestIdRef.current;
    setStatus("compiling");
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
          setStatus("success");
        },
        onError: (error) => {
          if (id !== requestIdRef.current) return;
          setCompileError(error.message.slice(0, 300));
          setStatus("error");
        },
      }
    );
  }, []);

  useEffect(() => {
    if (content.trim() === "" || content === lastCompiledRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => compileTex(content), COMPILE_DEBOUNCE_MS);
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

  const pending = update.isPending || create.isPending;
  const valid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="resume-title">Title</Label>
            <Input
              id="resume-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="General / Software Engineer"
            />
          </div>
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
            className="h-[420px] min-h-[420px] resize-none font-mono text-xs leading-relaxed lg:h-[calc(100vh-260px)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pdf-preview">PDF preview</Label>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {status === "compiling" && (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Compiling…
                </>
              )}
              {status === "success" && <span>Compiled</span>}
              {status === "error" && <span className="text-destructive">Failed</span>}
              {status === "idle" && <span>Waiting…</span>}
            </span>
          </div>
          {status === "error" && compileError && (
            <p className="max-h-24 overflow-auto rounded-lg bg-destructive/10 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
              {compileError}
            </p>
          )}
          <div
            id="pdf-preview"
            className="flex h-105 min-h-105 items-center justify-center overflow-hidden rounded-lg border bg-white lg:h-[calc(100vh-200px)]"
          >
            {previewUrl ? (
              <iframe src={previewUrl} className="size-full" title="PDF preview" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {status === "compiling" ? "Compiling…" : "Preview will appear here"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => compileTex(content)}
          disabled={compile.isPending || !content.trim()}
        >
          {compile.isPending && <Loader2 className="animate-spin" />}
          Recompile
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
