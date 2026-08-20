"use client";

import { Field, ProjectFields, SectionCard } from "../editors";
import { ChevronDown, FolderGit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileEducationInput, ProfileFormInput } from "@/db/schema";

const emptyEducation = (): ProfileEducationInput => ({
  school: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
  notes: "",
  projects: [],
});

const emptyProject = () => ({
  name: "",
  description: "",
  previewUrl: "",
  sourceCodeUrl: "",
  tech: [],
});

export function EducationTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
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
        <p className="py-4 text-center text-sm text-muted-foreground">No education yet.</p>
      ) : (
        fields.map((field, index) => (
          <EducationEntry
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
  open,
  onOpenChange,
}: {
  index: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const school = useWatch({ control, name: `education.${index}.school` });
  const degree = useWatch({ control, name: `education.${index}.degree` });
  const summary = [degree, school].filter(Boolean).join(", ") || undefined;

  const projectsFieldArray = useFieldArray({
    control,
    name: `education.${index}.projects`,
  });

  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const prevProjectLength = useRef(projectsFieldArray.fields.length);

  useEffect(() => {
    if (
      projectsFieldArray.fields.length > prevProjectLength.current &&
      projectsFieldArray.fields.length > 0
    ) {
      setOpenProjects((prev) =>
        new Set(prev).add(projectsFieldArray.fields[projectsFieldArray.fields.length - 1].id)
      );
    }
    prevProjectLength.current = projectsFieldArray.fields.length;
  }, [projectsFieldArray.fields.length, projectsFieldArray]);

  return (
    <SectionCard
      index={index}
      onRemove={onRemove}
      summary={summary}
      open={open}
      onOpenChange={onOpenChange}
    >
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
            <Textarea
              {...field}
              value={field.value ?? ""}
              placeholder="GPA, honors, relevant coursework..."
              rows={2}
            />
          </Field>
        )}
      />
      <Collapsible className="flex flex-col gap-3">
        <CollapsibleTrigger
          render={<Button variant="outline" size="sm" className="w-full text-muted-foreground" />}
        >
          <FolderGit2 className="size-4" />
          Related projects
          {projectsFieldArray.fields.length > 0 && (
            <span className="text-muted-foreground">({projectsFieldArray.fields.length})</span>
          )}
          <ChevronDown className="size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4">
          {projectsFieldArray.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Projects built during this degree (e.g. thesis project, coursework projects).
            </p>
          )}
          {projectsFieldArray.fields.map((project, projectIndex) => (
            <EducationProjectEntry
              key={project.id}
              projectIndex={projectIndex}
              educationIndex={index}
              control={control}
              onRemove={() => projectsFieldArray.remove(projectIndex)}
              open={openProjects.has(project.id)}
              onOpenChange={(isOpen) => {
                setOpenProjects((prev) => {
                  const next = new Set(prev);
                  if (isOpen) next.add(project.id);
                  else next.delete(project.id);
                  return next;
                });
              }}
            />
          ))}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => projectsFieldArray.append(emptyProject())}
            >
              <Plus />
              Add project
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SectionCard>
  );
}

function EducationProjectEntry({
  projectIndex,
  educationIndex,
  control,
  onRemove,
  open,
  onOpenChange,
}: {
  projectIndex: number;
  educationIndex: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const name = useWatch({
    control,
    name: `education.${educationIndex}.projects.${projectIndex}.name`,
  });
  const summary = name || undefined;
  const prefix = `education.${educationIndex}.projects.${projectIndex}` as const;

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 p-3 pb-0">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronDown
            className={"size-4 transition-transform duration-200" + (open ? " rotate-180" : "")}
          />
        </button>
        <span className="text-xs font-semibold text-muted-foreground">
          Project #{projectIndex + 1}
        </span>
        {!open && summary && (
          <span className="truncate text-sm text-muted-foreground">- {summary}</span>
        )}
        <div className="ml-auto">
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove project">
            <Trash2 />
          </Button>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-4 p-3 pt-2">
          <ProjectFields prefix={prefix} control={control} />
        </div>
      )}
    </div>
  );
}
