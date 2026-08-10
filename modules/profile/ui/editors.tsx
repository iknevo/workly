"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function SectionCard({
  index,
  children,
  onRemove,
}: {
  index: number;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove entry">
          <Trash2 />
        </Button>
      </div>
      {children}
    </div>
  );
}

export function SectionList<T>({
  items,
  onChange,
  onAdd,
  addLabel,
  emptyText,
  renderItem,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  onAdd: () => void;
  addLabel: string;
  emptyText: string;
  renderItem: (
    item: T,
    onChangeItem: (next: T) => void,
    onRemove: () => void,
    index: number
  ) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        items.map((item, i) =>
          renderItem(
            item,
            (next) => {
              const nextItems = [...items];
              nextItems[i] = next;
              onChange(nextItems);
            },
            () => onChange(items.filter((_, j) => j !== i)),
            i
          )
        )
      )}
      <div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export function TagsEditor({
  value,
  onChange,
  placeholder,
  addLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const tag = input.trim();
    if (!tag) return;
    onChange([...value, tag]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium text-muted-foreground">Bullet points</Label>
      {bullets.length === 0 && (
        <p className="text-sm text-muted-foreground">No bullet points yet.</p>
      )}
      {bullets.map((bullet, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={bullet}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder="Built X, improving Y by Z%"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            aria-label="Remove bullet point"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...bullets, ""])}
          disabled={bullets.length > 0 && bullets[bullets.length - 1].trim().length === 0}
        >
          <Plus />
          Add bullet
        </Button>
      </div>
    </div>
  );
}
