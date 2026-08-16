"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";

import type { applications } from "@/db/schema";
import { insertApplicationSchema } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";

type Application = typeof applications.$inferSelect;

export const applicationFormSchema = insertApplicationSchema.omit({
  userId: true,
  mailKeywords: true,
  baseResumeId: true,
});
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
    },
  });

  const [company, position] = useWatch({ control: form.control, name: ["company", "position"] });

  const statusItems = Object.entries(APPLICATION_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  return (
    <form
      id="application-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
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
                <Input
                  {...field}
                  id="url"
                  type="url"
                  value={field.value ?? ""}
                  placeholder="https://..."
                />
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
                <Input
                  {...field}
                  id="location"
                  value={field.value ?? ""}
                  placeholder="God bless a remote position"
                />
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
                <Input
                  {...field}
                  id="salary"
                  value={field.value ?? ""}
                  placeholder="What would you expect"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
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
