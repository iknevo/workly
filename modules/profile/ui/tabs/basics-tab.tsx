"use client";

import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileFormInput } from "@/db/schema";

export function BasicsTab({ control }: { control: Control<ProfileFormInput> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Full name</FieldLabel>
            <Input {...field} placeholder="Ahmed Abdelhafiez" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Email</FieldLabel>
            <Input {...field} type="email" value={field.value ?? ""} placeholder="you@example.com" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="headline"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Headline</FieldLabel>
            <Input {...field} value={field.value ?? ""} placeholder="Senior Software Engineer, 8 years experience" />
          </Field>
        )}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input {...field} value={field.value ?? ""} placeholder="+1 (555) 000-0000" />
          </Field>
        )}
      />
      <Controller
        name="location"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input {...field} value={field.value ?? ""} placeholder="Remote / New York, NY" />
          </Field>
        )}
      />
      <div className="sm:col-span-2">
        <Controller
          name="summary"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Summary</FieldLabel>
              <Textarea {...field} value={field.value ?? ""} placeholder="Short professional summary that opens your resume." rows={4} />
            </Field>
          )}
        />
      </div>
    </div>
  );
}
