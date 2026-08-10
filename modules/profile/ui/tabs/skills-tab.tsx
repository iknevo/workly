"use client";

import { Field, TagsEditor } from "../editors";

export function SkillsTab({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Field label="Skills">
      <TagsEditor
        value={skills}
        onChange={onChange}
        placeholder="e.g. TypeScript, React, PostgreSQL"
        addLabel="Add skill"
      />
    </Field>
  );
}
