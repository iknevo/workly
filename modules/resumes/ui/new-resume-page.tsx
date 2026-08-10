"use client";

import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ResumeEditor } from "./resume-editor";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function NewResumePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/resumes" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New resume</h1>
          <p className="text-sm text-muted-foreground">
            Start from the starter template and build your base resume in LaTeX.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>LaTeX source</CardTitle>
          <CardDescription>Preview the PDF as you write, then save it as a base resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeEditor onDone={() => router.push("/resumes")} />
        </CardContent>
      </Card>
    </div>
  );
}
