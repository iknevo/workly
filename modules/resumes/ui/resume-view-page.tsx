"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { ResumeCodeViewer } from "./resume-code-viewer";
import { useTRPC } from "@/trpc/client";

export function ResumeViewPage({ resumeId }: { resumeId: string }) {
  const trpc = useTRPC();

  const resumeQuery = useQuery(trpc.resumes.getOne.queryOptions({ id: resumeId }));
  const resume = resumeQuery.data;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const compile = useMutation(
    trpc.resumes.compile.mutationOptions({
      onSuccess: (result) => {
        const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setPreviewUrl(url);
        setPreviewOpen(true);
      },
      onError: (error) => {
        toast.add({ type: "error", title: "Preview failed", description: error.message });
      },
    })
  );

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/resumes" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{resume?.title ?? "Resume"}</h1>
            <p className="text-sm text-muted-foreground">LaTeX source for this base resume.</p>
          </div>
        </div>
        {resume && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => compile.mutate({ content: resume.content })}
              disabled={compile.isPending}
            >
              {compile.isPending ? <Loader2 className="animate-spin" /> : <Eye />}
              Preview
            </Button>
            <Link
              href={`/resumes/${resume.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil />
              Edit
            </Link>
          </div>
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

      <Sheet open={previewOpen} onOpenChange={(open) => !open && closePreview()}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
            <SheetDescription>
              {resume?.title ?? "Resume"} · compiled PDF of this base resume.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="h-[calc(100vh-8rem)] w-full rounded-lg border bg-white"
                title="PDF preview"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
