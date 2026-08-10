"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import type { applications, resumes } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";

import Link from "next/link";
import { CalendarIcon, ChevronDown, Loader2 } from "lucide-react";
import { format } from "date-fns";

export const APPLICATION_FIELDS = {
  company: "",
  position: "",
  location: "",
  url: "",
  salary: "",
  status: "draft",
  appliedAt: null as Date | null,
  jobDescription: "",
  notes: "",
  baseResumeId: "",
  mailSearchQuery: "",
} as const;

export type ApplicationDraft = typeof APPLICATION_FIELDS;

type Application = typeof applications.$inferSelect;
type Resume = typeof resumes.$inferSelect;

export function ApplicationForm({
  initial,
  onSubmit,
  submitLabel,
  submitting,
}: {
  initial?: Application;
  onSubmit: (data: Record<string, unknown>) => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const trpc = useTRPC();
  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const resumes = resumesQuery.data ?? [];

  const [form, setForm] = useState({
    company: initial?.company ?? "",
    position: initial?.position ?? "",
    location: initial?.location ?? "",
    url: initial?.url ?? "",
    salary: initial?.salary ?? "",
    status: initial?.status ?? "draft",
    appliedAt: initial?.appliedAt ?? null,
    jobDescription: initial?.jobDescription ?? "",
    notes: initial?.notes ?? "",
    baseResumeId: initial?.baseResumeId ?? "",
    mailSearchQuery: initial?.mailSearchQuery ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Job posting URL</Label>
              <Input
                id="url"
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            value={form.jobDescription}
            onChange={(e) => set("jobDescription", e.target.value)}
            placeholder="Paste the full job description here. Used by the AI to tailor your resume."
            rows={8}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <span className="text-xs font-medium text-muted-foreground">Details</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as typeof form.status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(APPLICATION_STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Applied on</Label>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className="justify-start text-left font-normal" />}>
                <CalendarIcon className="mr-2 size-4" />
                {form.appliedAt ? (
                  format(form.appliedAt, "PPP")
                ) : (
                  <span className="text-muted-foreground">Pick a date</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.appliedAt ?? undefined}
                  onSelect={(date) => set("appliedAt", date ?? null)}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Remote / San Francisco, CA"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="salary">Salary</Label>
            <Input
              id="salary"
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="$150k - $180k"
            />
          </div>
        </div>
      </div>

      <Collapsible className="flex flex-col gap-4">
        <CollapsibleTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
            />
          }
        >
          <ChevronDown className="size-4" />
          Advanced details
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseResumeId">Base resume</Label>
              {resumesQuery.isLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select
                  value={form.baseResumeId || "none"}
                  onValueChange={(v) => set("baseResumeId", v === "none" ? "" : (v ?? ""))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None selected</SelectItem>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mailSearchQuery">Gmail search query</Label>
              <Input
                id="mailSearchQuery"
                value={form.mailSearchQuery}
                onChange={(e) => set("mailSearchQuery", e.target.value)}
                placeholder={`from:acme.com OR subject:"Acme"`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Recruiter contact, referral details, interview notes..."
              rows={4}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-end gap-2">
        <Link href="/applications" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button
          onClick={() =>
            onSubmit({
              company: form.company,
              position: form.position,
              location: form.location || null,
              url: form.url || null,
              salary: form.salary || null,
              status: form.status,
              appliedAt: form.appliedAt,
              jobDescription: form.jobDescription || null,
              notes: form.notes || null,
              baseResumeId: form.baseResumeId || null,
              mailSearchQuery: form.mailSearchQuery || null,
            })
          }
          disabled={submitting || !form.company.trim() || !form.position.trim()}
        >
          {submitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
