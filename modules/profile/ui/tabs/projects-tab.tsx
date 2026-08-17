"use client";

import { ProjectFields, SectionCard } from "../editors";
import { Plus } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";

import type { ProfileFormInput, ProfileProjectInput } from "@/db/schema";

const emptyProject = (): ProfileProjectInput => ({
  name: "",
  description: "",
  previewUrl: "",
  sourceCodeUrl: "",
  tech: [],
});

export function ProjectsTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        fields.map((field, index) => (
          <ProjectEntry
            key={field.id}
            index={index}
            control={control}
            onRemove={() => remove(index)}
          />
        ))
      )}
      <div>
        <Button variant="outline" size="sm" onClick={() => append(emptyProject())}>
          <Plus />
          Add project
        </Button>
      </div>
    </div>
  );
}

function ProjectEntry({
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
      <ProjectFields prefix={`projects.${index}`} control={control} />
    </SectionCard>
  );
}
