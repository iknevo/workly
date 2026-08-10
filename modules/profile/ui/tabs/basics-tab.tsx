"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileFormInput } from "@/db/schema";

import { Field } from "../editors";

export function BasicsTab({
  draft,
  set,
}: {
  draft: ProfileFormInput;
  set: <K extends keyof ProfileFormInput>(key: K, value: ProfileFormInput[K]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ahmed Abdelhafiez"
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={draft.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Headline">
        <Input
          value={draft.headline}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="Senior Software Engineer, 8 years experience"
        />
      </Field>
      <Field label="Phone">
        <Input
          value={draft.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
      </Field>
      <Field label="Location">
        <Input
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Remote / New York, NY"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Summary">
          <Textarea
            value={draft.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Short professional summary that opens your resume."
            rows={4}
          />
        </Field>
      </div>
    </div>
  );
}
