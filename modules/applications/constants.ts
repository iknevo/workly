import type { applicationStatus, eventType } from "@/db/schema";

type Config = { label: string; className: string };
type StatusConfig = Record<(typeof applicationStatus.enumValues)[number], Config>;
type TypeConfig = Record<(typeof eventType.enumValues)[number], Config>;

export const JOB_SOURCES = ["LinkedIn", "Indeed", "Glassdoor", "Wuzzuf", "Wellfound"] as const;

export const APPLICATION_STATUS_CONFIG: StatusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  applied: { label: "Applied", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  interviewing: {
    label: "Interviewing",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  offer: { label: "Offer", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-secondary text-secondary-foreground",
  },
};

export const EVENT_TYPE_CONFIG: TypeConfig = {
  application: {
    label: "Application",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  interview: {
    label: "Interview",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  followup: {
    label: "Follow-up",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  deadline: { label: "Deadline", className: "bg-destructive/10 text-destructive" },
  offer: { label: "Offer", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  other: { label: "Other", className: "bg-muted text-muted-foreground" },
};
