"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ResumeCodeViewer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.add({ type: "success", title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          LaTeX source · {content.length.toLocaleString()} characters
        </span>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}
