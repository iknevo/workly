"use client";

import { Field, SectionCard } from "../editors";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { ProfileFormInput, ProfileLinkInput } from "@/db/schema";

const emptyLink = (): ProfileLinkInput => ({ label: "", url: "" });

export function LinksTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "links",
  });

  const [openFields, setOpenFields] = useState<Set<string>>(new Set());
  const prevLength = useRef(fields.length);

  useEffect(() => {
    if (fields.length > prevLength.current && fields.length > 0) {
      setOpenFields((prev) => new Set(prev).add(fields[fields.length - 1].id));
    }
    prevLength.current = fields.length;
  }, [fields.length, fields]);

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No links yet. Add GitHub, LinkedIn, or a portfolio.
        </p>
      ) : (
        fields.map((field, index) => (
          <LinkEntry
            key={field.id}
            index={index}
            control={control}
            onRemove={() => remove(index)}
            open={openFields.has(field.id)}
            onOpenChange={(isOpen) => {
              setOpenFields((prev) => {
                const next = new Set(prev);
                if (isOpen) next.add(field.id);
                else next.delete(field.id);
                return next;
              });
            }}
          />
        ))
      )}
      <div>
        <Button variant="outline" size="sm" onClick={() => append(emptyLink())}>
          <Plus />
          Add link
        </Button>
      </div>
    </div>
  );
}

function LinkEntry({
  index,
  control,
  onRemove,
  open,
  onOpenChange,
}: {
  index: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const label = useWatch({ control, name: `links.${index}.label` });
  const url = useWatch({ control, name: `links.${index}.url` });
  const summary = label || url || undefined;

  return (
    <SectionCard
      index={index}
      onRemove={onRemove}
      open={open}
      onOpenChange={onOpenChange}
      summary={summary}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name={`links.${index}.label` as const}
          control={control}
          render={({ field }) => (
            <Field label="Label">
              <Input {...field} placeholder="GitHub" />
            </Field>
          )}
        />
        <Controller
          name={`links.${index}.url` as const}
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <Field label="URL">
                <Input {...field} placeholder="https://github.com/you" />
              </Field>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          )}
        />
      </div>
    </SectionCard>
  );
}
