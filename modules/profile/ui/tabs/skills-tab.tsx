"use client";

import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import type { ProfileFormInput } from "@/db/schema";

import { Field, TagsEditor } from "../editors";

export function SkillsTab({ control }: { control: Control<ProfileFormInput> }) {
  return (
    <Controller
      name="skills"
      control={control}
      render={({ field }) => (
        <Field label="Skills">
          <TagsEditor
            value={field.value}
            onChange={field.onChange}
            placeholder="e.g. TypeScript, React, PostgreSQL"
            addLabel="Add skill"
          />
        </Field>
      )}
    />
  );
}
