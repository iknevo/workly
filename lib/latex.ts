import { compile } from "node-tectonic";

export type CompileResult =
  | { ok: true; pdfBase64: string; log: string }
  | { ok: false; error: string };

export async function compileLatex(tex: string): Promise<CompileResult> {
  try {
    const result = await compile({
      tex,
      returnBuffer: true,
      timeout: 120_000,
      args: ["-interaction=nonstopmode", "-halt-on-error"],
    });

    const log = [result.stdout, result.stderr].filter(Boolean).join("\n");

    if (!result.success || !result.pdfBuffer) {
      const detail = result.failure?.message ?? "LaTeX compilation failed.";
      return { ok: false, error: `${detail}\n\n${log}`.trim() };
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
