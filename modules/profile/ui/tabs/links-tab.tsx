"use client";

import { useFieldArray, Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { ProfileFormInput, ProfileLinkInput } from "@/db/schema";

import { Field, SectionCard } from "../editors";

const emptyLink = (): ProfileLinkInput => ({ label: "", url: "" });

export function LinksTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "links",
  });

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
}: {
  index: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
}) {
  return (
    <SectionCard index={index} onRemove={onRemove}>
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
