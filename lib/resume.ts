import type { ProfileEducation, ProfileExperience, ProfileLink, ProfileProject } from "@/db/schema";

const LATEX_PREAMBLE = `\\documentclass[11pt,a4paper]{article}

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
`;

export interface ResumeProfile {
  name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[] | null;
  experience: ProfileExperience[] | null;
  education: ProfileEducation[] | null;
  projects: ProfileProject[] | null;
  links: ProfileLink[] | null;
}

export function escapeLatex(text: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\\/g, "\\textbackslash{}"],
    [/&/g, "\\&"],
    [/%/g, "\\%"],
    [/\$/g, "\\$"],
    [/#/g, "\\#"],
    [/_/g, "\\_"],
    [/\{/g, "\\{"],
    [/\}/g, "\\}"],
    [/~/g, "\\textasciitilde{}"],
    [/\^/g, "\\textasciicircum{}"],
    [/</g, "\\textless{}"],
    [/>/g, "\\textgreater{}"],
  ];
  return replacements.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

function escapeLatexUrl(url: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\\/g, "\\textbackslash{}"],
    [/%/g, "\\%"],
    [/#/g, "\\#"],
    [/&/g, "\\&"],
    [/~/g, "\\textasciitilde{}"],
    [/\^/g, "\\textasciicircum{}"],
    [/_/g, "\\_"],
  ];
  return replacements.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), url);
}

export function hasResumeData(profile: ResumeProfile): boolean {
  return Boolean(
    profile.name?.trim() ||
      profile.experience?.length ||
      profile.skills?.length ||
      profile.projects?.length ||
      profile.education?.length
  );
}

export function buildResumeLatex(profile: ResumeProfile): string {
  const sections: string[] = [];

  const name = escapeLatex(profile.name?.trim() ?? "");
  const headline = profile.headline?.trim();
  const contact = [
    profile.email?.trim() ? escapeLatex(profile.email.trim()) : "",
    profile.phone?.trim() ? escapeLatex(profile.phone.trim()) : "",
    profile.location?.trim() ? escapeLatex(profile.location.trim()) : "",
  ].filter(Boolean);
  const links = (profile.links ?? []).filter((l) => l.label.trim() && l.url.trim());

  const header: string[] = [];
  if (name) header.push(`\\LARGE\\textbf{${name}}\\\\[0.2em]`);
  if (headline) header.push(`\\normalsize ${escapeLatex(headline)}\\\\[0.2em]`);
  if (contact.length) header.push(`\\normalsize ${contact.join(" $\\mid$ ")}\\\\[0.2em]`);
  if (links.length) {
    header.push(
      `\\normalsize ${links
        .map((l) => `\\href{${escapeLatexUrl(l.url.trim())}}{${escapeLatex(l.label.trim())}}`)
        .join(" $\\mid$ ")}`
    );
  }

  if (header.length) {
    sections.push(`\\begin{center}\n    ${header.join("\n    ")}\n\\end{center}`);
  }

  if (profile.summary?.trim()) {
    sections.push(`\\section{Summary}\n${escapeLatex(profile.summary.trim())}`);
  }

  if (profile.experience?.length) {
    const items = profile.experience
      .map((exp) => {
        const role = escapeLatex(exp.role.trim());
        const company = escapeLatex(exp.company.trim());
        const period = [exp.startDate?.trim(), exp.endDate?.trim()].filter(Boolean).join(" --- ");
        const lines: string[] = [];
        lines.push(`\\textbf{${role}} \\hfill ${company} \\\\[-0.3em]`);
        if (period) lines.push(`\\textit{${escapeLatex(period)}}`);
        if (exp.summary?.trim()) lines.push(escapeLatex(exp.summary.trim()));
        const bullets = (exp.bullets ?? []).map((b) => b.trim()).filter(Boolean);
        if (bullets.length) {
          lines.push(
            `\\begin{itemize}[leftmargin=1em, itemsep=0pt]\n${bullets
              .map((b) => `    \\item ${escapeLatex(b)}`)
              .join("\n")}\n\\end{itemize}`
          );
        }
        return lines.join("\n");
      })
      .filter(Boolean);
    sections.push(`\\section{Experience}\n${items.join("\n\n")}`);
  }

  if (profile.education?.length) {
    const items = profile.education
      .map((edu) => {
        const school = escapeLatex(edu.school.trim());
        const degree = escapeLatex(edu.degree.trim());
        const field = edu.field?.trim() ? escapeLatex(edu.field.trim()) : "";
        const years = [edu.startYear?.trim(), edu.endYear?.trim()].filter(Boolean).join(" --- ");
        const lines: string[] = [];
        const title = [degree, field].filter(Boolean).join(", ");
        lines.push(`\\textbf{${title}} \\hfill ${school} \\\\[-0.3em]`);
        if (years) lines.push(`\\textit{${escapeLatex(years)}}`);
        if (edu.notes?.trim()) lines.push(escapeLatex(edu.notes.trim()));
        return lines.join("\n");
      })
      .filter(Boolean);
    sections.push(`\\section{Education}\n${items.join("\n\n")}`);
  }

  if (profile.projects?.length) {
    const items = profile.projects
      .map((project) => {
        const name = escapeLatex(project.name.trim());
        const link = project.link?.trim();
        const tech = (project.tech ?? []).map((t) => t.trim()).filter(Boolean);
        const lines: string[] = [];
        const title = link ? `\\textbf{${name}} \\hfill \\href{${escapeLatexUrl(link)}}{link}` : `\\textbf{${name}}`;
        lines.push(title);
        lines.push(escapeLatex(project.description.trim()));
        if (tech.length) lines.push(`\\textit{Tech:} ${escapeLatex(tech.join(", "))}`);
        return lines.join("\n");
      })
      .filter(Boolean);
    sections.push(`\\section{Projects}\n${items.join("\n\n")}`);
  }

  if (profile.skills?.length) {
    sections.push(`\\section{Skills}\n${escapeLatex(profile.skills.map((s) => s.trim()).filter(Boolean).join(", "))}`);
  }

  const body = sections.join("\n\n\\vspace{0.4em}\n\n");
  return `${LATEX_PREAMBLE}\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}
