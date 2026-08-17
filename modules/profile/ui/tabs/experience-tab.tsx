"use client";

import { BulletsEditor, Field, ProjectFields, SectionCard } from "../editors";
import { ChevronDown, FolderGit2, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
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
}: {
  index: number;
  control: Control<ProfileFormInput>;
  onRemove: () => void;
}) {
  const projectsFieldArray = useFieldArray({
    control,
    name: `experience.${index}.projects`,
  });

  return (
    <SectionCard index={index} onRemove={onRemove}>
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
            <div key={project.id} className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Project #{projectIndex + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => projectsFieldArray.remove(projectIndex)}
                  aria-label="Remove project"
                >
                  <Trash2 />
                </Button>
              </div>
              <ProjectFields
                prefix={`experience.${index}.projects.${projectIndex}`}
                control={control}
              />
            </div>
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
