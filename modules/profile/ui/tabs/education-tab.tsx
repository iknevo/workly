"use client";

import { useFieldArray, Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileEducationInput, ProfileFormInput } from "@/db/schema";

import { Field, SectionCard } from "../editors";

const emptyEducation = (): ProfileEducationInput => ({
  school: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
  notes: "",
});

export function EducationTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No education yet.</p>
      ) : (
        fields.map((field, index) => (
          <EducationEntry
            key={field.id}
            index={index}
            control={control}
            onRemove={() => remove(index)}
          />
        ))
      )}
      <div>
        <Button variant="outline" size="sm" onClick={() => append(emptyEducation())}>
          <Plus />
          Add education
        </Button>
      </div>
    </div>
  );
}

function EducationEntry({
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
          name={`education.${index}.school` as const}
          control={control}
          render={({ field }) => (
            <Field label="School">
              <Input {...field} placeholder="University of X" />
            </Field>
          )}
        />
        <Controller
          name={`education.${index}.degree` as const}
          control={control}
          render={({ field }) => (
            <Field label="Degree">
              <Input {...field} placeholder="B.S. in Computer Science" />
            </Field>
          )}
        />
        <Controller
          name={`education.${index}.field` as const}
          control={control}
          render={({ field }) => (
            <Field label="Field of study">
              <Input {...field} value={field.value ?? ""} placeholder="Computer Science" />
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name={`education.${index}.startYear` as const}
            control={control}
            render={({ field }) => (
              <Field label="Start year">
                <Input {...field} value={field.value ?? ""} placeholder="2016" />
              </Field>
            )}
          />
          <Controller
            name={`education.${index}.endYear` as const}
            control={control}
            render={({ field }) => (
              <Field label="End year">
                <Input {...field} value={field.value ?? ""} placeholder="2020" />
              </Field>
            )}
          />
        </div>
      </div>
      <Controller
        name={`education.${index}.notes` as const}
        control={control}
        render={({ field }) => (
          <Field label="Notes">
            <Textarea {...field} value={field.value ?? ""} placeholder="GPA, honors, relevant coursework..." rows={2} />
          </Field>
        )}
      />
    </SectionCard>
  );
}
