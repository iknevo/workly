"use client";

import { Field, SkillGroupsEditor } from "../editors";
import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import type { ProfileFormInput } from "@/db/schema";
import { normalizeSkills } from "@/db/schema";

export function SkillsTab({ control }: { control: Control<ProfileFormInput> }) {
  return (
    <Controller
      name="skills"
      control={control}
      render={({ field }) => (
        <Field label="Skills">
          <SkillGroupsEditor
            value={normalizeSkills(field.value, true)}
            onChange={field.onChange}
            addLabel="Add category"
          />
        </Field>
      )}
    />
  );
}
