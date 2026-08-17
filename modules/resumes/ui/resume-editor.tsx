"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { insertResumeSchema } from "@/db/schema";
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

const resumeFormSchema = insertResumeSchema.omit({ userId: true });
type ResumeFormValues = z.infer<typeof resumeFormSchema>;

export function ResumeEditor({
  resume,
  onDone,
}: {
  resume?: { id: string; title: string; content: string };
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeFormSchema),
    defaultValues: {
      title: resume?.title ?? "",
      content: resume?.content ?? STARTER_TEMPLATE,
    },
  });

  const title = useWatch({ control: form.control, name: "title" });
  const content = useWatch({ control: form.control, name: "content" });
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

  const onSubmit = (values: ResumeFormValues) => {
    if (resume) update.mutate({ id: resume.id, ...values });
    else create.mutate(values);
  };

  return (
    <form id="resume-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="resume-title">Title</FieldLabel>
                <Input {...field} id="resume-title" placeholder="General / Software Engineer" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="resume-content">LaTeX source</FieldLabel>
            <span className="text-xs text-muted-foreground">
              {content.length.toLocaleString()} chars
            </span>
          </div>
          <Controller
            name="content"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Textarea
                  {...field}
                  id="resume-content"
                  value={field.value}
                  className="h-105 min-h-105 resize-none font-mono text-xs leading-relaxed lg:h-[calc(100vh-260px)]"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="pdf-preview">PDF preview</FieldLabel>
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
          type="button"
          variant="outline"
          onClick={() => compileTex(content)}
          disabled={compile.isPending || !content.trim()}
        >
          {compile.isPending && <Loader2 className="animate-spin" />}
          Recompile
        </Button>
        <Button type="submit" disabled={pending || !valid}>
          {pending && <Loader2 className="animate-spin" />}
          {resume ? "Save changes" : "Create resume"}
        </Button>
      </div>
    </form>
  );
}
