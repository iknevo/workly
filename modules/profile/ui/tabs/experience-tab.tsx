"use client";

import { BulletsEditor, Field, ProjectFields, SectionCard } from "../editors";
import { ChevronDown, FolderGit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileExperienceInput, ProfileFormInput } from "@/db/schema";

const emptyExperience = (): ProfileExperienceInput => ({
  role: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  summary: "",
  bullets: [],
  projects: [],
});

const emptyProject = () => ({
  name: "",
  description: "",
  previewUrl: "",
  sourceCodeUrl: "",
  tech: [],
});

export function ExperienceTab({ control }: { control: Control<ProfileFormInput> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "experience",
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
          No experience yet. Add your roles so the AI can tailor your resume.
        </p>
      ) : (
        fields.map((field, index) => (
          <ExperienceEntry
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
        <Button variant="outline" size="sm" onClick={() => append(emptyExperience())}>
          <Plus />
          Add experience
        </Button>
      </div>
    </div>
  );
}

function ExperienceEntry({
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
  const role = useWatch({ control, name: `experience.${index}.role` });
  const company = useWatch({ control, name: `experience.${index}.company` });
  const summary = [role, company].filter(Boolean).join(" at ") || undefined;

  const projectsFieldArray = useFieldArray({
    control,
    name: `experience.${index}.projects`,
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
          name={`experience.${index}.role` as const}
          control={control}
          render={({ field }) => (
            <Field label="Role">
              <Input {...field} placeholder="Senior Software Engineer" />
            </Field>
          )}
        />
        <Controller
          name={`experience.${index}.company` as const}
          control={control}
          render={({ field }) => (
            <Field label="Company">
              <Input {...field} placeholder="Acme Inc." />
            </Field>
          )}
        />
        <Controller
          name={`experience.${index}.location` as const}
          control={control}
          render={({ field }) => (
            <Field label="Location">
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="Remote / San Francisco, CA"
              />
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name={`experience.${index}.startDate` as const}
            control={control}
            render={({ field }) => (
              <Field label="Start date">
                <Input {...field} value={field.value ?? ""} placeholder="Jan 2022" />
              </Field>
            )}
          />
          <Controller
            name={`experience.${index}.endDate` as const}
            control={control}
            render={({ field }) => (
              <Field label="End date">
                <Input {...field} value={field.value ?? ""} placeholder="Present" />
              </Field>
            )}
          />
        </div>
      </div>
      <Controller
        name={`experience.${index}.summary` as const}
        control={control}
        render={({ field }) => (
          <Field label="Summary">
            <Textarea
              {...field}
              value={field.value ?? ""}
              placeholder="One or two lines about the role."
              rows={2}
            />
          </Field>
        )}
      />
      <Controller
        name={`experience.${index}.bullets` as const}
        control={control}
        render={({ field }) => <BulletsEditor bullets={field.value} onChange={field.onChange} />}
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
              Projects built while in this role (e.g. graduation project, side projects).
            </p>
          )}
          {projectsFieldArray.fields.map((project, projectIndex) => (
            <ExperienceProjectEntry
              key={project.id}
              projectIndex={projectIndex}
              experienceIndex={index}
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

function ExperienceProjectEntry({
  projectIndex,
  experienceIndex,
  control,
  onRemove,
  open,
  onOpenChange,
}: {
  projectIndex: number;
  experienceIndex: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const name = useWatch({
    control,
    name: `experience.${experienceIndex}.projects.${projectIndex}.name`,
  });
  const summary = name || undefined;
  const prefix = `experience.${experienceIndex}.projects.${projectIndex}` as const;

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
          <span className="truncate text-sm text-muted-foreground">— {summary}</span>
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
