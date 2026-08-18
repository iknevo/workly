import { env } from "@/config/env";

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
  const mathLike =
    /display math should end/i.test(error) || /missing \$ inserted/i.test(error);
  if (mathLike || hasLoneDisplayMathOpen(tex)) {
    return `${error}\n\n${MATH_ERROR_HINT}`;
  }
  return error;
}

const TEXAPI_COMPILE_URL = "https://texapi.ovh/api/latex/compile";

export async function compileLatex(tex: string): Promise<CompileResult> {
  if (!env.TEXAPI_KEY) {
    return {
      ok: false,
      error:
        "TEXAPI_KEY is not configured. Add your Texapi API key to environment variables.",
    };
  }

  try {
    const compileRes = await fetch(TEXAPI_COMPILE_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": env.TEXAPI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: tex }),
    });

    const contentType = compileRes.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = (await compileRes.json()) as {
        status: "success" | "error";
        errors?: string[];
        resultPath?: string | null;
      };

      const log = data.errors?.join("\n") ?? "";

      if (data.status === "error" || !data.resultPath) {
        const detail = data.errors?.join("\n") ?? "LaTeX compilation failed.";
        return { ok: false, error: addMathHint(detail, tex) };
      }

      const pdfRes = await fetch(data.resultPath);
      if (!pdfRes.ok) {
        return {
          ok: false,
          error: `Failed to download compiled PDF (HTTP ${pdfRes.status}).`,
        };
      }

      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      return { ok: true, pdfBase64: pdfBuffer.toString("base64"), log };
    }

    if (compileRes.ok && contentType.includes("application/pdf")) {
      const pdfBuffer = Buffer.from(await compileRes.arrayBuffer());
      return { ok: true, pdfBase64: pdfBuffer.toString("base64"), log: "" };
    }

    const errorText = await compileRes.text();
    return {
      ok: false,
      error: addMathHint(errorText || "LaTeX compilation failed.", tex),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown LaTeX compile error.",
    };
  }
}
