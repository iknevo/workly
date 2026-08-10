"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileExperienceInput } from "@/db/schema";

import { BulletsEditor, Field, SectionCard, SectionList } from "../editors";

const emptyExperience = (): ProfileExperienceInput => ({
  role: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  summary: "",
  bullets: [],
});

export function ExperienceTab({
  items,
  onChange,
}: {
  items: ProfileExperienceInput[];
  onChange: (next: ProfileExperienceInput[]) => void;
}) {
  return (
    <SectionList
      items={items}
      onChange={onChange}
      onAdd={() => onChange([...items, emptyExperience()])}
      addLabel="Add experience"
      emptyText="No experience yet. Add your roles so the AI can tailor your resume."
      renderItem={(item, onChangeItem, onRemove, index) => (
        <ExperienceEntry item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
      )}
    />
  );
}

function ExperienceEntry({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: ProfileExperienceInput;
  onChange: (next: ProfileExperienceInput) => void;
  onRemove: () => void;
  index: number;
}) {
  const set = (key: keyof ProfileExperienceInput, value: string) =>
    onChange({ ...item, [key]: value });

  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role">
          <Input
            value={item.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Senior Software Engineer"
          />
        </Field>
        <Field label="Company">
          <Input
            value={item.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Acme Inc."
          />
        </Field>
        <Field label="Location">
          <Input
            value={item.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Remote / San Francisco, CA"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <Input
              value={item.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              placeholder="Jan 2022"
            />
          </Field>
          <Field label="End date">
            <Input
              value={item.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              placeholder="Present"
            />
          </Field>
        </div>
      </div>
      <Field label="Summary">
        <Textarea
          value={item.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="One or two lines about the role."
          rows={2}
        />
      </Field>
      <BulletsEditor bullets={item.bullets} onChange={(bullets) => onChange({ ...item, bullets })} />
    </SectionCard>
  );
}
