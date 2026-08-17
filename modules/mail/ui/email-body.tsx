"use client";

import { Fragment, type ReactNode, useMemo } from "react";

import { cn } from "@/lib/utils";

const LINK_RE = /https?:\/\/[^\s<>"']+/g;

const TRAILING_PUNCT_RE = /[.,;:!?)\]}]+$/;

const MAX_URL_CHARS = 60;

function displayUrl(url: string): string {
  const trimmed = url.replace(TRAILING_PUNCT_RE, "");
  if (trimmed.length <= MAX_URL_CHARS) return trimmed;
  return `${trimmed.slice(0, 45)}…${trimmed.slice(-12)}`;
}

function linkify(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(LINK_RE);
  const matches = text.match(LINK_RE) ?? [];
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(part);
    if (matches[i]) {
      const url = matches[i].replace(TRAILING_PUNCT_RE, "");
      nodes.push(
        <a
          key={`${keyPrefix}-link-${i}`}
          href={url}
          title={url}
          target="_blank"
          rel="noopener noreferrer"
          className="wrap-break-word text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {displayUrl(url)}
        </a>
      );
    }
  });
  return nodes;
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "signature"; lines: string[] };

function parseEmail(text: string): Block[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const sigIdx = lines.findIndex((line) => line.trim() === "--");
  const bodyLines = sigIdx === -1 ? lines : lines.slice(0, sigIdx);
  const sigLines = sigIdx === -1 ? [] : lines.slice(sigIdx).filter((line) => line.trim() !== "");

  const blocks: Block[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const lines = current.map((line) => line.trimEnd());
    const isQuote =
      lines.some((line) => /^On\s+.+wrote:\s*$/.test(line.trim())) ||
      lines.filter((line) => line.trim() !== "").every((line) => line.trim().startsWith(">"));
    if (isQuote) {
      blocks.push({
        type: "quote",
        lines: lines.map((line) => line.trim().replace(/^>\s?/, "")),
      });
    } else {
      blocks.push({ type: "paragraph", lines });
    }
    current = [];
  };

  for (const line of bodyLines) {
    if (line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();

  if (sigLines.length > 0) blocks.push({ type: "signature", lines: sigLines });

  return blocks;
}

const QUOTE_COLLAPSE_THRESHOLD = 8;

export function EmailBody({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseEmail(text), [text]);

  if (blocks.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3 text-sm leading-relaxed select-text", className)}>
      {blocks.map((block, i) => {
        if (block.type === "signature") {
          return (
            <div
              key={i}
              className="border-t border-dashed pt-3 text-muted-foreground/70"
              aria-label="Signature"
            >
              <div className="flex flex-col gap-0.5">
                {block.lines.map((line, j) => (
                  <p key={j} className="wrap-break-word whitespace-pre-wrap">
                    {linkify(line, `sig-${i}-${j}`)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "quote") {
          const content = (
            <div className="flex flex-col gap-1.5 border-s-2 border-muted ps-3 text-muted-foreground">
              {block.lines.map((line, j) => (
                <p key={j} className="wrap-break-word whitespace-pre-wrap">
                  {linkify(line, `quote-${i}-${j}`)}
                </p>
              ))}
            </div>
          );

          if (block.lines.length <= QUOTE_COLLAPSE_THRESHOLD) {
            return <div key={i}>{content}</div>;
          }

          return (
            <details key={i} className="group">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                <span className="group-open:hidden">Show quoted text</span>
                <span className="group-open:inline">Hide quoted text</span>
              </summary>

              <div className="mt-2">{content}</div>
            </details>
          );
        }

        return (
          <p key={i} className="wrap-break-word whitespace-pre-wrap text-foreground">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {linkify(line, `para-${i}-${j}`)}
                {j < block.lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
