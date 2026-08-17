"use client";

import { ProjectFields, SectionCard } from "../editors";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
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
        <p className="py-4 text-center text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        fields.map((field, index) => (
          <ProjectEntry
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
  open,
  onOpenChange,
}: {
  index: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const name = useWatch({ control, name: `projects.${index}.name` });
  const summary = name || undefined;

  return (
    <SectionCard
      index={index}
      onRemove={onRemove}
      summary={summary}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ProjectFields prefix={`projects.${index}`} control={control} />
    </SectionCard>
  );
}
