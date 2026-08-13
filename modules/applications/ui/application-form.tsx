"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type { applications } from "@/db/schema";
import { insertApplicationSchema } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

type Application = typeof applications.$inferSelect;

export const applicationFormSchema = insertApplicationSchema.omit({ userId: true, mailKeywords: true });
export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export function ApplicationForm({
  initial,
  onSubmit,
  submitLabel,
  submitting,
}: {
  initial?: Application;
  onSubmit: (data: ApplicationFormValues) => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const trpc = useTRPC();
  const resumesQuery = useQuery(trpc.resumes.getMany.queryOptions());
  const resumes = resumesQuery.data ?? [];

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      company: initial?.company ?? "",
      position: initial?.position ?? "",
      location: initial?.location ?? "",
      url: initial?.url ?? "",
      status: initial?.status ?? "draft",
      salary: initial?.salary ?? "",
      appliedAt: initial?.appliedAt ?? null,
      jobDescription: initial?.jobDescription ?? "",
      notes: initial?.notes ?? "",
      baseResumeId: initial?.baseResumeId ?? null,
    },
  });

  const [company, position] = form.watch(["company", "position"]);

  const statusItems = Object.entries(APPLICATION_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
  const resumeItems = resumes.map((resume) => ({ value: resume.id, label: resume.title }));

  return (
    <form id="application-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="company"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="company">Company *</FieldLabel>
                <Input {...field} id="company" placeholder="Acme Inc." />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="position"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="position">Position *</FieldLabel>
                <Input {...field} id="position" placeholder="Senior Software Engineer" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="url"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                <FieldLabel htmlFor="url">Job posting URL</FieldLabel>
                <Input {...field} id="url" type="url" value={field.value ?? ""} placeholder="https://..." />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="jobDescription"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="jobDescription">Job description</FieldLabel>
              <Textarea
                {...field}
                id="jobDescription"
                value={field.value ?? ""}
                placeholder="Paste the full job description here. Used by the AI to tailor your resume."
                rows={8}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-4">
        <span className="text-xs font-medium text-muted-foreground">Details</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Status</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  items={statusItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {statusItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="appliedAt"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Applied on</FieldLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      />
                    }
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(date) => field.onChange(date ?? null)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            )}
          />
          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location">Location</FieldLabel>
                <Input {...field} id="location" value={field.value ?? ""} placeholder="Remote / San Francisco, CA" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="salary"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="salary">Salary</FieldLabel>
                <Input {...field} id="salary" value={field.value ?? ""} placeholder="$150k - $180k" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </div>

      <Collapsible className="flex flex-col gap-4">
        <CollapsibleTrigger
          render={<Button variant="outline" size="sm" className="w-full text-muted-foreground" />}
        >
          <ChevronDown className="size-4" />
          Advanced details
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="baseResumeId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="base-resume">Base resume</FieldLabel>
                  {resumesQuery.isLoading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <Select
                      name={field.name}
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                      items={resumeItems}
                    >
                      <SelectTrigger id="base-resume" className="w-full">
                        <SelectValue placeholder="None selected" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="none">None selected</SelectItem>
                        {resumeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  {...field}
                  id="notes"
                  value={field.value ?? ""}
                  placeholder="Recruiter contact, referral details, interview notes..."
                  rows={4}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-end gap-2">
        <Link href="/applications" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={submitting || !company.trim() || !position.trim()}>
          {submitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
