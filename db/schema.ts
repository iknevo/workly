import { defineRelations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

const isUrl = (v: string) => z.url().safeParse(v).success;
const isEmail = (v: string) => z.email().safeParse(v).success;

export const profileLinkSchema = z.object({
  label: z.string().trim().max(100, "Label is too long"),
  url: z
    .string()
    .trim()
    .refine((v) => v === "" || isUrl(v), {
      message: "Link must be a valid URL",
    }),
});

export const profileProjectSchema = z
  .object({
    name: z.string().trim().max(200, "Name is too long"),
    description: z.string().trim().max(3000, "Description is too long"),
    previewUrl: z
      .string()
      .trim()
      .refine((v) => v === "" || isUrl(v), {
        message: "Preview URL must be a valid URL",
      })
      .nullable(),
    sourceCodeUrl: z
      .string()
      .trim()
      .refine((v) => v === "" || isUrl(v), {
        message: "Source code URL must be a valid URL",
      })
      .nullable(),
    tech: z.array(z.string().trim().max(100)),
  })
  .transform((p) => ({
    name: p.name,
    description: p.description,
    previewUrl: p.previewUrl || null,
    sourceCodeUrl: p.sourceCodeUrl || null,
    tech: p.tech.filter(Boolean),
  }));

export const profileExperienceSchema = z
  .object({
    role: z.string().trim().max(200, "Role is too long"),
    company: z.string().trim().max(200, "Company is too long"),
    location: z.string().trim().max(200, "Location is too long").nullable(),
    startDate: z.string().trim().max(50).nullable(),
    endDate: z.string().trim().max(50).nullable(),
    summary: z.string().trim().max(2000).nullable(),
    bullets: z.array(z.string().trim().max(500)),
    projects: z.array(profileProjectSchema),
  })
  .transform((e) => ({
    role: e.role,
    company: e.company,
    location: e.location || null,
    startDate: e.startDate || null,
    endDate: e.endDate || null,
    summary: e.summary || null,
    bullets: e.bullets.filter(Boolean),
    projects: e.projects.filter((p) => p.name),
  }));

export const profileEducationSchema = z
  .object({
    school: z.string().trim().max(200, "School is too long"),
    degree: z.string().trim().max(200, "Degree is too long"),
    field: z.string().trim().max(200).nullable(),
    startYear: z.string().trim().max(20).nullable(),
    endYear: z.string().trim().max(20).nullable(),
    notes: z.string().trim().max(2000).nullable(),
    projects: z.array(profileProjectSchema),
  })
  .transform((e) => ({
    school: e.school,
    degree: e.degree,
    field: e.field || null,
    startYear: e.startYear || null,
    endYear: e.endYear || null,
    notes: e.notes || null,
    projects: e.projects.filter((p) => p.name),
  }));

export const profileSkillsSchema = z.array(
  z.object({
    category: z.string().trim().max(100),
    items: z.array(z.string().trim().max(100)).max(100),
  })
);

export type ProfileSkillGroup = z.infer<typeof profileSkillsSchema>[number];

export function normalizeSkills(
  value: string[] | ProfileSkillGroup[] | null | undefined,
  preserveEmpty = false
): ProfileSkillGroup[] {
  if (!Array.isArray(value)) return [];
  if (value.length === 0 || typeof value[0] === "string") {
    const items = (value as string[])
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i);
    if (items.length === 0) return [];
    return [{ category: "Skills", items }];
  }
  const groups = (value as ProfileSkillGroup[]).map((group) => ({
    category: group.category.trim(),
    items: Array.from(new Set(group.items.map((s) => s.trim()).filter(Boolean))),
  }));
  if (preserveEmpty) return groups;
  return groups.filter((group) => group.category.length > 0 && group.items.length > 0);
}

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || isEmail(v), {
        message: "Email must be valid",
      })
      .nullable(),
    headline: z.string().trim().max(300).nullable(),
    phone: z.string().trim().max(100).nullable(),
    location: z.string().trim().max(200).nullable(),
    summary: z.string().trim().max(5000).nullable(),
    skills: z.union([profileSkillsSchema, z.array(z.string().trim().max(100))]),
    experience: z.array(profileExperienceSchema),
    education: z.array(profileEducationSchema),
    projects: z.array(profileProjectSchema),
    links: z.array(profileLinkSchema),
  })
  .transform((v) => ({
    name: v.name,
    email: v.email || null,
    headline: v.headline || null,
    phone: v.phone || null,
    location: v.location || null,
    summary: v.summary || null,
    skills: normalizeSkills(v.skills),
    experience: v.experience.filter((e) => e.role && e.company),
    education: v.education.filter((e) => e.school && e.degree),
    projects: v.projects.filter((p) => p.name && p.description),
    links: v.links.filter((l) => l.label && l.url),
  }));

export type ProfileLink = z.infer<typeof profileLinkSchema>;
export type ProfileExperience = z.infer<typeof profileExperienceSchema>;
export type ProfileEducation = z.infer<typeof profileEducationSchema>;
export type ProfileProject = z.infer<typeof profileProjectSchema>;
export type UserProfile = z.infer<typeof profileUpdateSchema>;

export type ProfileFormInput = z.input<typeof profileUpdateSchema>;
export type ProfileExperienceInput = z.input<typeof profileExperienceSchema>;
export type ProfileEducationInput = z.input<typeof profileEducationSchema>;
export type ProfileProjectInput = z.input<typeof profileProjectSchema>;
export type ProfileLinkInput = z.input<typeof profileLinkSchema>;

export const applicationStatus = pgEnum("application_status", [
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
]);

export const eventType = pgEnum("event_type", [
  "application",
  "interview",
  "followup",
  "deadline",
  "offer",
  "other",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").unique().notNull(),
    name: text("name").notNull(),
    email: text("email"),
    imageUrl: text("image_url"),
    headline: text("headline"),
    phone: text("phone"),
    location: text("location"),
    summary: text("summary"),
    skills: jsonb("skills").$type<ProfileSkillGroup[]>(),
    experience: jsonb("experience").$type<ProfileExperience[]>(),
    education: jsonb("education").$type<ProfileEducation[]>(),
    projects: jsonb("projects").$type<ProfileProject[]>(),
    links: jsonb("links").$type<ProfileLink[]>(),
    aiApiKey: text("ai_api_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [uniqueIndex("clerk_id_idx").on(d.clerkId)]
);

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [index("resumes_user_id_idx").on(d.userId)]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    company: text("company").notNull(),
    position: text("position").notNull(),
    location: text("location"),
    url: text("url"),
    status: applicationStatus("status").default("draft").notNull(),
    salary: text("salary"),
    appliedAt: timestamp("applied_at"),
    jobDescription: text("job_description"),
    notes: text("notes"),
    baseResumeId: uuid("base_resume_id").references(() => resumes.id, {
      onDelete: "set null",
    }),
    mailKeywords: text("mail_keywords").array(),
    mailExclusions: text("mail_exclusions").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [index("applications_user_id_idx").on(d.userId)]
);

export const applicationResumes = pgTable(
  "application_resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .references(() => applications.id, { onDelete: "cascade" })
      .notNull(),
    baseResumeId: uuid("base_resume_id").references(() => resumes.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    model: text("model"),
    jobDescriptionSnapshot: text("job_description_snapshot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [index("application_resumes_application_id_idx").on(d.applicationId)]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    type: eventType("type").default("other").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("events_user_id_idx").on(d.userId),
    index("events_application_id_idx").on(d.applicationId),
  ]
);

export const mailAccounts = pgTable(
  "mail_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    provider: text("provider").notNull().default("imap"),
    host: text("host").notNull(),
    port: integer("port").notNull(),
    appPassword: text("app_password").notNull(),
    folder: text("folder").notNull().default("INBOX"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("mail_accounts_user_id_idx").on(d.userId),
    uniqueIndex("mail_accounts_email_user_idx").on(d.userId, d.email),
  ]
);

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    mailAccountId: uuid("mail_account_id")
      .references(() => mailAccounts.id, { onDelete: "cascade" })
      .notNull(),
    messageUid: integer("message_uid").notNull(),
    threadId: text("thread_id"),
    subject: text("subject"),
    fromEmail: text("from_email"),
    toEmail: text("to_email"),
    senderEmail: text("sender_email"),
    snippet: text("snippet"),
    bodyText: text("body_text"),
    internalDate: timestamp("internal_date"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("emails_user_id_idx").on(d.userId),
    uniqueIndex("emails_mail_account_message_idx").on(d.mailAccountId, d.messageUid),
  ]
);

export const emailApplications = pgTable(
  "email_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: uuid("email_id")
      .references(() => emails.id, { onDelete: "cascade" })
      .notNull(),
    applicationId: uuid("application_id")
      .references(() => applications.id, { onDelete: "cascade" })
      .notNull(),
    relevanceScore: integer("relevance_score"),
    matchReasons: text("match_reasons").array(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("email_applications_application_id_idx").on(d.applicationId),
    uniqueIndex("email_applications_email_application_idx").on(d.emailId, d.applicationId),
  ]
);

export const relations = defineRelations(
  {
    users,
    resumes,
    applications,
    applicationResumes,
    events,
    mailAccounts,
    emails,
    emailApplications,
  },
  (r) => ({
    users: {
      resumes: r.many.resumes({
        from: r.users.id,
        to: r.resumes.userId,
      }),
      applications: r.many.applications({
        from: r.users.id,
        to: r.applications.userId,
      }),
      events: r.many.events({
        from: r.users.id,
        to: r.events.userId,
      }),
      mailAccounts: r.many.mailAccounts({
        from: r.users.id,
        to: r.mailAccounts.userId,
      }),
      emails: r.many.emails({
        from: r.users.id,
        to: r.emails.userId,
      }),
    },
    resumes: {
      user: r.one.users({
        from: r.resumes.userId,
        to: r.users.id,
      }),
      applications: r.many.applications({
        from: r.resumes.id,
        to: r.applications.baseResumeId,
      }),
      applicationResumes: r.many.applicationResumes({
        from: r.resumes.id,
        to: r.applicationResumes.baseResumeId,
      }),
    },
    applications: {
      user: r.one.users({
        from: r.applications.userId,
        to: r.users.id,
      }),
      baseResume: r.one.resumes({
        from: r.applications.baseResumeId,
        to: r.resumes.id,
      }),
      applicationResumes: r.many.applicationResumes({
        from: r.applications.id,
        to: r.applicationResumes.applicationId,
      }),
      events: r.many.events({
        from: r.applications.id,
        to: r.events.applicationId,
      }),
      emailApplications: r.many.emailApplications({
        from: r.applications.id,
        to: r.emailApplications.applicationId,
      }),
    },
    applicationResumes: {
      application: r.one.applications({
        from: r.applicationResumes.applicationId,
        to: r.applications.id,
      }),
      baseResume: r.one.resumes({
        from: r.applicationResumes.baseResumeId,
        to: r.resumes.id,
      }),
    },
    events: {
      user: r.one.users({
        from: r.events.userId,
        to: r.users.id,
      }),
      application: r.one.applications({
        from: r.events.applicationId,
        to: r.applications.id,
      }),
    },
    mailAccounts: {
      user: r.one.users({
        from: r.mailAccounts.userId,
        to: r.users.id,
      }),
      emails: r.many.emails({
        from: r.mailAccounts.id,
        to: r.emails.mailAccountId,
      }),
    },
    emails: {
      user: r.one.users({
        from: r.emails.userId,
        to: r.users.id,
      }),
      mailAccount: r.one.mailAccounts({
        from: r.emails.mailAccountId,
        to: r.mailAccounts.id,
      }),
      emailApplications: r.many.emailApplications({
        from: r.emails.id,
        to: r.emailApplications.emailId,
      }),
    },
    emailApplications: {
      email: r.one.emails({
        from: r.emailApplications.emailId,
        to: r.emails.id,
      }),
      application: r.one.applications({
        from: r.emailApplications.applicationId,
        to: r.applications.id,
      }),
    },
  })
);

export const insertUserSchema = createInsertSchema(users);
export const updateUserSchema = createUpdateSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertResumeSchema = createInsertSchema(resumes, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
  content: (s) => s.min(1, "Resume content is required").max(100000, "Resume content is too long"),
});
export const updateResumeSchema = createUpdateSchema(resumes, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
  content: (s) => s.min(1, "Resume content is required").max(100000, "Resume content is too long"),
});
export const selectResumeSchema = createSelectSchema(resumes);

export const insertApplicationSchema = createInsertSchema(applications, {
  company: (s) => s.trim().min(1, "Company is required").max(200, "Company is too long"),
  position: (s) => s.trim().min(1, "Position is required").max(200, "Position is too long"),
  jobDescription: (s) => s.trim().max(50000, "Job description is too long"),
  notes: (s) => s.trim().max(50000, "Notes are too long"),
});
export const updateApplicationSchema = createUpdateSchema(applications, {
  company: (s) => s.trim().min(1, "Company is required").max(200, "Company is too long"),
  position: (s) => s.trim().min(1, "Position is required").max(200, "Position is too long"),
  jobDescription: (s) => s.trim().max(50000, "Job description is too long"),
  notes: (s) => s.trim().max(50000, "Notes are too long"),
});
export const selectApplicationSchema = createSelectSchema(applications);

export const insertApplicationResumeSchema = createInsertSchema(applicationResumes, {
  content: (s) => s.min(1, "Resume content is required"),
});
export const selectApplicationResumeSchema = createSelectSchema(applicationResumes);

export const insertEventSchema = createInsertSchema(events, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
});
export const updateEventSchema = createUpdateSchema(events, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
});
export const selectEventSchema = createSelectSchema(events);

export const insertMailAccountSchema = createInsertSchema(mailAccounts);
export const selectMailAccountSchema = createSelectSchema(mailAccounts);

export const insertEmailSchema = createInsertSchema(emails);
export const updateEmailSchema = createUpdateSchema(emails);
export const selectEmailSchema = createSelectSchema(emails);

export const insertEmailApplicationSchema = createInsertSchema(emailApplications);
export const selectEmailApplicationSchema = createSelectSchema(emailApplications);
