"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileEducationInput } from "@/db/schema";

import { Field, SectionCard, SectionList } from "../editors";

const emptyEducation = (): ProfileEducationInput => ({
  school: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
  notes: "",
});

export function EducationTab({
  items,
  onChange,
}: {
  items: ProfileEducationInput[];
  onChange: (next: ProfileEducationInput[]) => void;
}) {
  return (
    <SectionList
      items={items}
      onChange={onChange}
      onAdd={() => onChange([...items, emptyEducation()])}
      addLabel="Add education"
      emptyText="No education yet."
      renderItem={(item, onChangeItem, onRemove, index) => (
        <EducationEntry item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
      )}
    />
  );
}

function EducationEntry({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: ProfileEducationInput;
  onChange: (next: ProfileEducationInput) => void;
  onRemove: () => void;
  index: number;
}) {
  const set = (key: keyof ProfileEducationInput, value: string) =>
    onChange({ ...item, [key]: value });

  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School">
          <Input
            value={item.school}
            onChange={(e) => set("school", e.target.value)}
            placeholder="University of X"
          />
        </Field>
        <Field label="Degree">
          <Input
            value={item.degree}
            onChange={(e) => set("degree", e.target.value)}
            placeholder="B.S. in Computer Science"
          />
        </Field>
        <Field label="Field of study">
          <Input
            value={item.field}
            onChange={(e) => set("field", e.target.value)}
            placeholder="Computer Science"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start year">
            <Input
              value={item.startYear}
              onChange={(e) => set("startYear", e.target.value)}
              placeholder="2016"
            />
          </Field>
          <Field label="End year">
            <Input
              value={item.endYear}
              onChange={(e) => set("endYear", e.target.value)}
              placeholder="2020"
            />
          </Field>
        </div>
      </div>
      <Field label="Notes">
        <Textarea
          value={item.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="GPA, honors, relevant coursework..."
          rows={2}
        />
      </Field>
    </SectionCard>
  );
}
