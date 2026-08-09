import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

import { env } from "@/config/env";

const groq = env.GROQ_API_KEY ? createGroq({ apiKey: env.GROQ_API_KEY }) : null;

export const RESUME_MODEL = "llama-3.3-70b-versatile";

export function isAIEnabled(): boolean {
  return groq !== null;
}

export interface GenerateResumeInput {
  baseResume: string;
  jobDescription: string;
  company: string;
  position: string;
}

const SYSTEM_PROMPT = `You are an expert resume writer and job application specialist.

You rewrite a candidate's existing LaTeX resume so it is tailored to a specific job posting. Your goal is to maximize the candidate's chances of getting an interview while staying 100% truthful to their real experience.

Rules:
- Keep the exact same LaTeX structure, preamble, packages, fonts, and section headings as the original resume. Only change the content.
- Reorder bullet points within sections to highlight the most relevant experience for the job.
- Rewrite bullet points to use keywords and phrases from the job description where they accurately describe the candidate's experience. Do not invent skills, technologies, or accomplishments.
- Keep every claim honest: never fabricate dates, employers, degrees, or metrics. If a metric is not in the original resume, do not invent it.
- Prioritize and emphasize experience that matches the job's requirements. You may move the most relevant sections earlier in the resume.
- The resume should fit on one to two pages.
- Output ONLY the raw LaTeX source. No markdown fences, no commentary, no explanation. Start with \\documentclass and end with \\end{document}.`;

export async function generateTailoredResume(
  input: GenerateResumeInput
): Promise<string> {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const { baseResume, jobDescription, company, position } = input;

  const userPrompt = `Company: ${company}
Position: ${position}

=== JOB DESCRIPTION ===
${jobDescription}

=== ORIGINAL RESUME (LaTeX) ===
${baseResume}

Rewrite the resume above so it is tailored to this job. Output only the LaTeX source.`;

  const { text } = await generateText({
    model: groq(RESUME_MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.4,
    maxOutputTokens: 12000,
  });

  return stripLatexFences(text);
}

function stripLatexFences(output: string): string {
  let cleaned = output.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(latex|tex)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
    cleaned = cleaned.trim();
  }
  return cleaned;
}
