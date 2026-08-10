import { compile } from "node-tectonic";

export type CompileResult =
  | { ok: true; pdfBase64: string; log: string }
  | { ok: false; error: string };

const MATH_ERROR_HINT = `This error is usually caused by an unclosed math delimiter.
Check for a lone "$" or a single "\\[" in the source. To add vertical spacing
use "\\\\[0.2em]" (two backslashes), NOT "\\[0.2em]" which starts display math.`;

function hasLoneDisplayMathOpen(tex: string): boolean {
  return /(?<![\\])\\\[/.test(tex);
}

function addMathHint(error: string, tex: string): string {
  const mathLike = /display math should end/i.test(error) || /missing \$ inserted/i.test(error);
  if (mathLike || hasLoneDisplayMathOpen(tex)) {
    return `${error}\n\n${MATH_ERROR_HINT}`;
  }
  return error;
}

export async function compileLatex(tex: string): Promise<CompileResult> {
  try {
    const result = await compile({
      tex,
      returnBuffer: true,
      timeout: 120_000,
    });

    const log = [result.stdout, result.stderr].filter(Boolean).join("\n");

    if (!result.success || !result.pdfBuffer) {
      const detail = result.failure?.message ?? "LaTeX compilation failed.";
      const error = `${detail}\n\n${log}`.trim();
      return { ok: false, error: addMathHint(error, tex) };
    }

    return {
      ok: true,
      pdfBase64: Buffer.from(result.pdfBuffer).toString("base64"),
      log,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown LaTeX compile error.",
    };
  }
}
