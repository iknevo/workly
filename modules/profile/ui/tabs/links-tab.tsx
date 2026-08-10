"use client";

import { Input } from "@/components/ui/input";

import type { ProfileLinkInput } from "@/db/schema";

import { Field, SectionCard, SectionList } from "../editors";

const emptyLink = (): ProfileLinkInput => ({ label: "", url: "" });

export function LinksTab({
  items,
  onChange,
}: {
  items: ProfileLinkInput[];
  onChange: (next: ProfileLinkInput[]) => void;
}) {
  return (
    <SectionList
      items={items}
      onChange={onChange}
      onAdd={() => onChange([...items, emptyLink()])}
      addLabel="Add link"
      emptyText="No links yet. Add GitHub, LinkedIn, or a portfolio."
      renderItem={(item, onChangeItem, onRemove, index) => (
        <LinkEntry item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
      )}
    />
  );
}

function LinkEntry({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: ProfileLinkInput;
  onChange: (next: ProfileLinkInput) => void;
  onRemove: () => void;
  index: number;
}) {
  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label">
          <Input
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            placeholder="GitHub"
          />
        </Field>
        <Field label="URL">
          <Input
            value={item.url}
            onChange={(e) => onChange({ ...item, url: e.target.value })}
            placeholder="https://github.com/you"
          />
        </Field>
      </div>
    </SectionCard>
  );
}
