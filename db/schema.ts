import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { defineRelations } from "drizzle-orm";

import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

import { z } from "zod";

export const profileLinkSchema = z.object({
  label: z.string().trim().min(1, "Link label is required").max(100, "Label is too long"),
  url: z.string().trim().url("Link must be a valid URL"),
});

export const profileExperienceSchema = z.object({
  role: z.string().trim().min(1, "Role is required").max(200, "Role is too long"),
  company: z.string().trim().min(1, "Company is required").max(200, "Company is too long"),
  location: z.string().trim().max(200, "Location is too long").nullish(),
  startDate: z.string().trim().max(50).nullish(),
  endDate: z.string().trim().max(50).nullish(),
  summary: z.string().max(2000).nullish(),
  bullets: z.array(z.string().trim().min(1)).default([]),
});

export const profileEducationSchema = z.object({
  school: z.string().trim().min(1, "School is required").max(200, "School is too long"),
  degree: z.string().trim().min(1, "Degree is required").max(200, "Degree is too long"),
  field: z.string().trim().max(200).nullish(),
  startYear: z.string().trim().max(20).nullish(),
  endYear: z.string().trim().max(20).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const profileProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200, "Name is too long"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(3000, "Description is too long"),
  link: z.string().trim().url("Link must be a valid URL").nullish(),
  tech: z.array(z.string().trim().min(1)).default([]),
});

export const profileSkillsSchema = z.array(z.string().trim().min(1)).default([]);

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  email: z.string().trim().email("Email must be valid").max(200).nullish(),
  headline: z.string().trim().max(300).nullish(),
  phone: z.string().trim().max(100).nullish(),
  location: z.string().trim().max(200).nullish(),
  summary: z.string().trim().max(5000).nullish(),
  skills: profileSkillsSchema,
  experience: z.array(profileExperienceSchema).default([]),
  education: z.array(profileEducationSchema).default([]),
  projects: z.array(profileProjectSchema).default([]),
  links: z.array(profileLinkSchema).default([]),
});

export type ProfileLink = z.infer<typeof profileLinkSchema>;
export type ProfileExperience = z.infer<typeof profileExperienceSchema>;
export type ProfileEducation = z.infer<typeof profileEducationSchema>;
export type ProfileProject = z.infer<typeof profileProjectSchema>;
export type UserProfile = z.infer<typeof profileUpdateSchema>;

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
    skills: jsonb("skills").$type<string[]>(),
    experience: jsonb("experience").$type<ProfileExperience[]>(),
    education: jsonb("education").$type<ProfileEducation[]>(),
    projects: jsonb("projects").$type<ProfileProject[]>(),
    links: jsonb("links").$type<ProfileLink[]>(),
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
    mailSearchQuery: text("mail_search_query"),
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

export const gmailAccounts = pgTable(
  "gmail_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    gmailId: text("gmail_id"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("gmail_accounts_user_id_idx").on(d.userId),
    uniqueIndex("gmail_accounts_email_user_idx").on(d.userId, d.email),
  ]
);

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .references(() => applications.id, { onDelete: "cascade" })
      .notNull(),
    gmailAccountId: uuid("gmail_account_id")
      .references(() => gmailAccounts.id, { onDelete: "cascade" })
      .notNull(),
    gmailMessageId: text("gmail_message_id").notNull(),
    threadId: text("thread_id"),
    subject: text("subject"),
    fromEmail: text("from_email"),
    toEmail: text("to_email"),
    snippet: text("snippet"),
    bodyText: text("body_text"),
    internalDate: timestamp("internal_date"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (d) => [
    index("emails_application_id_idx").on(d.applicationId),
    uniqueIndex("emails_gmail_message_id_idx").on(d.gmailMessageId),
  ]
);

export const relations = defineRelations(
  {
    users,
    resumes,
    applications,
    applicationResumes,
    events,
    gmailAccounts,
    emails,
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
      gmailAccounts: r.many.gmailAccounts({
        from: r.users.id,
        to: r.gmailAccounts.userId,
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
      emails: r.many.emails({
        from: r.applications.id,
        to: r.emails.applicationId,
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
    gmailAccounts: {
      user: r.one.users({
        from: r.gmailAccounts.userId,
        to: r.users.id,
      }),
      emails: r.many.emails({
        from: r.gmailAccounts.id,
        to: r.emails.gmailAccountId,
      }),
    },
    emails: {
      application: r.one.applications({
        from: r.emails.applicationId,
        to: r.applications.id,
      }),
      gmailAccount: r.one.gmailAccounts({
        from: r.emails.gmailAccountId,
        to: r.gmailAccounts.id,
      }),
    },
  })
);

export const insertUserSchema = createInsertSchema(users);
export const updateUserSchema = createUpdateSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertResumeSchema = createInsertSchema(resumes, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
  content: (s) => s.min(1, "Resume content is required"),
});
export const updateResumeSchema = createUpdateSchema(resumes, {
  title: (s) => s.trim().min(1, "Title is required").max(200, "Title is too long"),
  content: (s) => s.min(1, "Resume content is required"),
});
export const selectResumeSchema = createSelectSchema(resumes);

export const insertApplicationSchema = createInsertSchema(applications, {
  company: (s) => s.trim().min(1, "Company is required").max(200, "Company is too long"),
  position: (s) =>
    s.trim().min(1, "Position is required").max(200, "Position is too long"),
});
export const updateApplicationSchema = createUpdateSchema(applications, {
  company: (s) => s.trim().min(1, "Company is required").max(200, "Company is too long"),
  position: (s) =>
    s.trim().min(1, "Position is required").max(200, "Position is too long"),
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

export const insertGmailAccountSchema = createInsertSchema(gmailAccounts);
export const selectGmailAccountSchema = createSelectSchema(gmailAccounts);

export const insertEmailSchema = createInsertSchema(emails);
export const updateEmailSchema = createUpdateSchema(emails);
export const selectEmailSchema = createSelectSchema(emails);
