export function parseEmailAddress(from: string | null | undefined): string {
  if (!from) return "";
  const match = from.match(/<([^>]+)>/);
  const raw = match ? match[1] : from.split(",")[0];
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function extractDomain(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at === -1) return "";
  return email
    .slice(at + 1)
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "")
    .replace(/\.$/, "");
}

function sanitizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDomainKeyword(keyword: string): boolean {
  return keyword.includes(".") && !keyword.includes(" ");
}

export function companyPhrase(company: string): string {
  return sanitizePhrase(company);
}

export function buildSearchQueries({
  company,
  keywords = [],
  exclusions = [],
}: {
  company: string;
  keywords?: string[];
  exclusions?: string[];
}): string[] {
  const phrase = companyPhrase(company);
  const normalized = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  const domainKeywords = normalized
    .filter(isDomainKeyword)
    .map((k) => k.replace(/[^a-z0-9.\-]/g, ""));
  const textTerms = [
    phrase,
    ...normalized.filter((k) => !isDomainKeyword(k)).map(sanitizePhrase),
  ].filter((t) => t.length > 0);

  const exclusionClause = exclusions
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .map((e) => `-from:(${e.replace(/[^a-z0-9.@\-_]/g, "")})`)
    .join(" ");

  const base = [`newer_than:2y`, `-in:spam`, exclusionClause].filter(Boolean).join(" ");
  const queries: string[] = [];

  if (domainKeywords.length > 0) {
    queries.push(`from:(${domainKeywords.join(" OR ")}) ${base}`);
  }

  if (textTerms.length > 0) {
    const orTerms = textTerms.map((t) => `"${t}"`).join(" OR ");
    queries.push(`subject:(${orTerms}) ${base}`);
    queries.push(`from:(${orTerms}) ${base}`);
    queries.push(`(${orTerms}) ${base}`);
  }

  return queries;
}

export type ImapSearchQuery = {
  from?: string;
  subject?: string;
  since?: Date;
  not?: ImapSearchQuery;
  or?: ImapSearchQuery[];
  gmraw?: string;
};

export function buildImapSearchQueries({
  company,
  keywords = [],
  exclusions = [],
  gmail = false,
}: {
  company: string;
  keywords?: string[];
  exclusions?: string[];
  gmail?: boolean;
}): ImapSearchQuery[] {
  if (gmail) {
    return buildSearchQueries({ company, keywords, exclusions }).map((query) => ({ gmraw: query }));
  }

  const normalized = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  const domainKeywords = normalized
    .filter(isDomainKeyword)
    .map((k) => k.replace(/[^a-z0-9.\-]/g, ""));
  const textTerms = [
    companyPhrase(company),
    ...normalized.filter((k) => !isDomainKeyword(k)).map(sanitizePhrase),
  ].filter((t) => t.length > 0);

  const since = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);

  const clauses: ImapSearchQuery[] = [];
  for (const domain of domainKeywords) clauses.push({ from: domain });
  for (const term of textTerms) {
    clauses.push({ subject: term });
    clauses.push({ from: term });
  }

  const query: ImapSearchQuery = { since };
  if (clauses.length === 1) Object.assign(query, clauses[0]);
  else if (clauses.length > 1) query.or = clauses;

  const clean = exclusions.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (clean.length === 1) query.not = { from: clean[0] };
  else if (clean.length > 1) query.not = { or: clean.map((e) => ({ from: e })) };

  return [query];
}

export type ScoreContext = {
  companyPhrase: string;
  keywords: string[];
};

export type EmailEvaluation = {
  include: boolean;
  score: number;
  reasons: string[];
};

export function evaluateEmail({
  from,
  subject,
  snippet,
  context,
}: {
  from: string;
  subject: string;
  snippet: string;
  context: ScoreContext;
}): EmailEvaluation {
  const fromLower = from.toLowerCase();
  const subj = subject.toLowerCase();
  const snip = snippet.toLowerCase();
  const senderDomain = extractDomain(parseEmailAddress(from));

  const terms = [
    context.companyPhrase.trim().toLowerCase(),
    ...context.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
  ].filter((t) => t.length > 0);

  const reasons: string[] = [];
  let include = false;
  let score = 0;

  for (const term of terms) {
    if (isDomainKeyword(term)) {
      const domain = term.replace(/[^a-z0-9.\-]/g, "");
      if (
        domain &&
        senderDomain &&
        (senderDomain === domain || senderDomain.endsWith(`.${domain}`))
      ) {
        include = true;
        score += 45;
        reasons.push(`Sender domain ${senderDomain} matches ${domain}`);
      }
      continue;
    }

    const inSubject = subj.includes(term);
    const inFrom = fromLower.includes(term);
    const inSnippet = snip.includes(term);
    if (inSubject || inFrom || inSnippet) {
      include = true;
      score += inSubject ? 35 : inFrom ? 30 : 15;
      reasons.push(
        `Matches "${term}"${inSubject ? " (subject)" : inFrom ? " (sender)" : " (snippet)"}`
      );
    }
  }

  return {
    include,
    score: Math.min(100, score),
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

export function isJunkLabels(labelIds: string[]): boolean {
  return labelIds.some((label) =>
    ["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_FORUMS", "SPAM"].includes(label)
  );
}
