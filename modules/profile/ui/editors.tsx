"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileFormInput, ProfileSkillGroup } from "@/db/schema";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

type ProjectFieldPrefix =
  | `projects.${number}`
  | `experience.${number}.projects.${number}`
  | `education.${number}.projects.${number}`;

export function ProjectFields({
  prefix,
  control,
}: {
  prefix: ProjectFieldPrefix;
  control: Control<ProfileFormInput>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name={`${prefix}.name` as const}
          control={control}
          render={({ field }) => (
            <Field label="Name">
              <Input {...field} placeholder="Workly" />
            </Field>
          )}
        />
        <Controller
          name={`${prefix}.previewUrl` as const}
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <Field label="Preview URL">
                <Input {...field} value={field.value ?? ""} placeholder="https://demo..." />
              </Field>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          )}
        />
        <Controller
          name={`${prefix}.sourceCodeUrl` as const}
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <Field label="Source code URL">
                <Input {...field} value={field.value ?? ""} placeholder="https://github.com/..." />
              </Field>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          )}
        />
      </div>
      <Controller
        name={`${prefix}.description` as const}
        control={control}
        render={({ field }) => (
          <Field label="Description">
            <Textarea
              {...field}
              placeholder="What did you build and why does it matter?"
              rows={3}
            />
          </Field>
        )}
      />
      <Controller
        name={`${prefix}.tech` as const}
        control={control}
        render={({ field }) => (
          <Field label="Tech">
            <TagsEditor
              value={field.value}
              onChange={field.onChange}
              placeholder="e.g. Next.js, tRPC, PostgreSQL"
              addLabel="Add tech"
            />
          </Field>
        )}
      />
    </>
  );
}

export function SectionCard({
  index,
  children,
  onRemove,
  summary,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  index: number;
  children: React.ReactNode;
  onRemove: () => void;
  summary?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
      onOpenChange?.(next);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 p-4">
          <button
            type="button"
            onClick={handleToggle}
            className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          >
            <ChevronDown
              className={"size-4 transition-transform duration-200" + (open ? " rotate-180" : "")}
            />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
          {!open && summary && (
            <span className="truncate text-sm text-muted-foreground">- {summary}</span>
          )}
          <div className="ml-auto">
            <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove entry">
              <Trash2 />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 p-4 pt-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function TagsEditor({
  value,
  onChange,
  placeholder,
  addLabel,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    if (disabled) return;
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
                disabled={disabled}
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
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" size="sm" onClick={add} disabled={disabled || !input.trim()}>
          <Plus />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

export function SkillGroupsEditor({
  value,
  onChange,
  addLabel = "Add category",
  disabled = false,
}: {
  value: ProfileSkillGroup[];
  onChange: (next: ProfileSkillGroup[]) => void;
  addLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const addGroup = () => {
    if (disabled) return;
    const next = [...value, { category: "", items: [] }];
    onChange(next);
    setOpen((prev) => new Set(prev).add(next.length - 1));
  };

  const updateGroup = (i: number, patch: Partial<ProfileSkillGroup>) => {
    onChange(value.map((group, j) => (j === i ? { ...group, ...patch } : group)));
  };

  const removeGroup = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    setOpen((prev) => {
      const next = new Set(prev);
      next.delete(i);
      return new Set([...next].map((idx) => (idx > i ? idx - 1 : idx)));
    });
  };

  const moveGroup = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen((prev) => {
      const nextSet = new Set(prev);
      const hadI = nextSet.has(i);
      const hadJ = nextSet.has(j);
      nextSet.delete(i);
      nextSet.delete(j);
      if (hadI) nextSet.add(j);
      if (hadJ) nextSet.add(i);
      return nextSet;
    });
  };

  const toggleGroup = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const lastGroupIsEmpty =
    value.length > 0 &&
    value[value.length - 1].category.trim() === "" &&
    value[value.length - 1].items.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        value.map((group, i) => {
          const isOpen = open.has(i);
          return (
            <Collapsible key={i} open={isOpen} onOpenChange={() => toggleGroup(i)}>
              <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger
                    render={
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                      />
                    }
                  >
                    <ChevronDown
                      className={
                        "size-4 transition-transform duration-200" + (isOpen ? " rotate-180" : "")
                      }
                    />
                  </CollapsibleTrigger>

                  {isOpen ? (
                    <Input
                      value={group.category}
                      onChange={(e) => updateGroup(i, { category: e.target.value })}
                      placeholder="Category (e.g. Languages)"
                      disabled={disabled}
                      className="flex-1"
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => toggleGroup(i)}
                    >
                      <span className="truncate text-sm font-medium">
                        {group.category || "Untitled"}
                        {group.items.length > 0 && (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            ({group.items.length})
                          </span>
                        )}
                      </span>
                    </button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveGroup(i, -1)}
                    disabled={disabled || i === 0}
                    aria-label="Move category up"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveGroup(i, 1)}
                    disabled={disabled || i === value.length - 1}
                    aria-label="Move category down"
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeGroup(i)}
                    disabled={disabled}
                    aria-label="Remove category"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <CollapsibleContent>
                  <TagsEditor
                    value={group.items}
                    onChange={(items) => updateGroup(i, { items })}
                    placeholder="e.g. TypeScript, React, PostgreSQL"
                    addLabel="Add skill"
                    disabled={disabled}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={addGroup}
          disabled={disabled || lastGroupIsEmpty}
        >
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
