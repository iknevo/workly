"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileProjectInput } from "@/db/schema";

import { Field, SectionCard, SectionList, TagsEditor } from "../editors";

const emptyProject = (): ProfileProjectInput => ({
  name: "",
  description: "",
  link: "",
  tech: [],
});

export function ProjectsTab({
  items,
  onChange,
}: {
  items: ProfileProjectInput[];
  onChange: (next: ProfileProjectInput[]) => void;
}) {
  return (
    <SectionList
      items={items}
      onChange={onChange}
      onAdd={() => onChange([...items, emptyProject()])}
      addLabel="Add project"
      emptyText="No projects yet."
      renderItem={(item, onChangeItem, onRemove, index) => (
        <ProjectEntry item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
      )}
    />
  );
}

function ProjectEntry({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: ProfileProjectInput;
  onChange: (next: ProfileProjectInput) => void;
  onRemove: () => void;
  index: number;
}) {
  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            placeholder="Workly"
          />
        </Field>
        <Field label="Link">
          <Input
            value={item.link}
            onChange={(e) => onChange({ ...item, link: e.target.value })}
            placeholder="https://..."
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="What did you build and why does it matter?"
          rows={3}
        />
      </Field>
      <Field label="Tech">
        <TagsEditor
          value={item.tech}
          onChange={(tech) => onChange({ ...item, tech })}
          placeholder="e.g. Next.js, tRPC, PostgreSQL"
          addLabel="Add tech"
        />
      </Field>
    </SectionCard>
  );
}
