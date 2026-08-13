import type { ProfileEducation, ProfileExperience, ProfileLink, ProfileProject } from "@/db/schema";

const LATEX_PREAMBLE = `\\documentclass[11pt, a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{array}
\\usepackage{parskip}
\\usepackage{enumitem}
\\usepackage{titlesec}

% Custom colors
\\definecolor{primary}{HTML}{000000}
\\definecolor{secondary}{HTML}{000000}
\\definecolor{accent}{HTML}{3a3a3a}

% Set margins
\\geometry{
    left=1.5cm,
    right=1.5cm,
    top=1.5cm,
    bottom=1.5cm
}

% Section styling
\\titleformat{\\section}
    {\\large\\bfseries\\color{primary}}
    {}
    {0em}
    {}
    [\\titlerule]

% Remove page numbers
\\pagestyle{empty}

% Itemize styling
\\setlist[itemize]{leftmargin=*, nosep}
\\renewcommand{\\labelitemi}{\\color{accent}\\textbullet}

% Header command
\\newcommand{\\header}[3]{
    \\begin{flushleft}
        {\\Huge\\bfseries\\color{primary}#1}\\\\
        \\vspace{4pt}
        {\\large\\color{secondary}#2}\\\\
        \\vspace{8pt}
        #3
    \\end{flushleft}
}

% Experience command
\\newcommand{\\experience}[4]{
    \\textbf{\\color{primary}#1} \\hfill \\textbf{\\color{secondary}#2}\\\\
    \\textit{#3} \\hfill \\textit{#4}
}

% Education command
\\newcommand{\\education}[4]{
    \\textbf{\\color{primary}#1} \\hfill \\textbf{\\color{secondary}#2}\\\\
    \\textit{#3} \\hfill \\textit{#4}
}
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

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

function projectLinkBullet(project: {
  previewUrl?: string | null;
  sourceCodeUrl?: string | null;
}): string {
  const parts: string[] = [];
  const preview = project.previewUrl?.trim();
  const source = project.sourceCodeUrl?.trim();
  if (preview) parts.push(`\\href{${escapeLatexUrl(preview)}}{(Live Demo)}`);
  if (source) parts.push(`\\href{${escapeLatexUrl(source)}}{(GitHub Repo)}`);
  return parts.join(" ");
}

export function buildResumeLatex(profile: ResumeProfile): string {
  const sections: string[] = [];

  const name = escapeLatex(profile.name?.trim() ?? "");
  const headline = escapeLatex(profile.headline?.trim() ?? "");
  const location = profile.location?.trim();
  const phone = profile.phone?.trim();
  const email = profile.email?.trim();
  const links = (profile.links ?? []).filter((l) => l.label.trim() && l.url.trim());

  const headerLines: string[] = [];
  if (location) headerLines.push(`Location: ${escapeLatex(location)}`);
  if (phone) {
    const wa = phone.replace(/\D/g, "");
    if (wa) {
      headerLines.push(`\\href{https://wa.me/${wa}}{phone \\& whatsapp: ${escapeLatex(phone)}}`);
    }
  }
  if (email) {
    headerLines.push(`\\href{mailto:${escapeLatexUrl(email)}}{email: ${escapeLatex(email)}}`);
  }
  for (const link of links) {
    headerLines.push(
      `\\href{${escapeLatexUrl(link.url.trim())}}{${escapeLatex(link.label.trim())}: ${escapeLatex(displayUrl(link.url.trim()))}}`
    );
  }

  sections.push(
    `\\header
{${name}}
{${headline}}
{${headerLines.join(" \\\\\n")}}`
  );

  if (profile.summary?.trim()) {
    sections.push(`\\section{Summary}\n${escapeLatex(profile.summary.trim())}`);
  }

  if (profile.experience?.length) {
    const items = profile.experience
      .map((exp) => {
        const role = escapeLatex(exp.role.trim());
        const company = escapeLatex(exp.company.trim());
        const expLocation = exp.location?.trim() ? escapeLatex(exp.location.trim()) : "";
        const period = [exp.startDate?.trim(), exp.endDate?.trim()].filter(Boolean).join(" --- ");
        const lines: string[] = [];
        lines.push(
          `\\experience{${role}}{${period || " "}}{${company}}{${expLocation || " "}}`
        );
        const bullets: string[] = [];
        if (exp.summary?.trim()) bullets.push(escapeLatex(exp.summary.trim()));
        for (const bullet of exp.bullets ?? []) {
          const text = bullet.trim();
          if (text) bullets.push(escapeLatex(text));
        }
        if (bullets.length) {
          lines.push(
            `\\begin{itemize}\n${bullets.map((b) => `    \\item ${b}`).join("\n")}\n\\end{itemize}`
          );
        }
        const projects = (exp.projects ?? [])
          .map((project) => project.name.trim() ? project : null)
          .filter((project): project is NonNullable<typeof project> => project !== null);
        if (projects.length) {
          const projectItems = projects.map((project) => {
            const projectName = escapeLatex(project.name.trim());
            const tech = (project.tech ?? []).map((t) => t.trim()).filter(Boolean);
            const techPart = tech.length ? ` (${escapeLatex(tech.join(", "))})` : "";
            const projectBullets: string[] = [];
            if (project.description?.trim()) {
              projectBullets.push(escapeLatex(project.description.trim()));
            }
            const linksBullet = projectLinkBullet(project);
            if (linksBullet) projectBullets.push(linksBullet);
            const projectLines = [`\\item \\textbf{${projectName}}${techPart}`];
            if (projectBullets.length) {
              projectLines.push(
                `  \\begin{itemize}[nosep, label={--}]\n${projectBullets
                  .map((b) => `    \\item ${b}`)
                  .join("\n")}\n  \\end{itemize}`
              );
            }
            return projectLines.join("\n");
          });
          lines.push(
            `\\begin{itemize}\n${projectItems
              .map((item) => `    ${item}`)
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
        const title = [degree, field].filter(Boolean).join(", ");
        const lines: string[] = [];
        lines.push(`\\education{${title}}{${years || " "}}{${school}}{}`);
        if (edu.notes?.trim()) {
          lines.push(
            `\\begin{itemize}\n    \\item ${escapeLatex(edu.notes.trim())}\n\\end{itemize}`
          );
        }
        return lines.join("\n");
      })
      .filter(Boolean);
    sections.push(`\\section{Education}\n${items.join("\n\n")}`);
  }

  if (profile.projects?.length) {
    const items = profile.projects
      .map((project) => {
        const projectName = escapeLatex(project.name.trim());
        const tech = (project.tech ?? []).map((t) => t.trim()).filter(Boolean);
        const techPart = tech.length ? ` (${escapeLatex(tech.join(", "))})` : "";
        const bullets: string[] = [];
        if (project.description?.trim()) bullets.push(escapeLatex(project.description.trim()));
        const linksBullet = projectLinkBullet(project);
        if (linksBullet) bullets.push(linksBullet);
        const lines = [`\\item \\textbf{${projectName}}${techPart}`];
        if (bullets.length) {
          lines.push(
            `  \\begin{itemize}[nosep, label={--}]\n${bullets
              .map((b) => `    \\item ${b}`)
              .join("\n")}\n  \\end{itemize}`
          );
        }
        return lines.join("\n");
      })
      .filter(Boolean);
    sections.push(`\\section{Projects}\n\\begin{itemize}\n${items.join("\n")}\n\\end{itemize}`);
  }

  const skills = (profile.skills ?? []).map((s) => s.trim()).filter(Boolean);
  if (skills.length) {
    sections.push(
      `\\section{Skills \\& Tools}\n\\begin{itemize}\n${skills
        .map((s) => `    \\item ${escapeLatex(s)}`)
        .join("\n")}\n\\end{itemize}`
    );
  }

  const body = sections.join("\n\n");
  return `${LATEX_PREAMBLE}\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}
