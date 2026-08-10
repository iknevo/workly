"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { UserProfile } from "@/db/schema";

import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type Draft = {
  name: string;
  email: string;
  headline: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: DraftExperience[];
  education: DraftEducation[];
  projects: DraftProject[];
  links: DraftLink[];
};

type DraftExperience = {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  summary: string;
  bullets: string[];
};

type DraftEducation = {
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  notes: string;
};

type DraftProject = {
  name: string;
  description: string;
  link: string;
  tech: string[];
};

type DraftLink = { label: string; url: string };

function toDraft(profile: UserProfile): Draft {
  return {
    name: profile.name ?? "",
    email: profile.email ?? "",
    headline: profile.headline ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    summary: profile.summary ?? "",
    skills: profile.skills ?? [],
    experience: (profile.experience ?? []).map((e) => ({
      role: e.role ?? "",
      company: e.company ?? "",
      location: e.location ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      summary: e.summary ?? "",
      bullets: e.bullets ?? [],
    })),
    education: (profile.education ?? []).map((e) => ({
      school: e.school ?? "",
      degree: e.degree ?? "",
      field: e.field ?? "",
      startYear: e.startYear ?? "",
      endYear: e.endYear ?? "",
      notes: e.notes ?? "",
    })),
    projects: (profile.projects ?? []).map((p) => ({
      name: p.name ?? "",
      description: p.description ?? "",
      link: p.link ?? "",
      tech: p.tech ?? [],
    })),
    links: (profile.links ?? []).map((l) => ({
      label: l.label ?? "",
      url: l.url ?? "",
    })),
  };
}

function toProfile(draft: Draft): UserProfile {
  return {
    name: draft.name.trim(),
    email: draft.email.trim() || null,
    headline: draft.headline.trim() || null,
    phone: draft.phone.trim() || null,
    location: draft.location.trim() || null,
    summary: draft.summary.trim() || null,
    skills: draft.skills.map((s) => s.trim()).filter(Boolean),
    experience: draft.experience
      .filter((e) => e.role.trim() && e.company.trim())
      .map((e) => ({
        role: e.role.trim(),
        company: e.company.trim(),
        location: e.location.trim() || null,
        startDate: e.startDate.trim() || null,
        endDate: e.endDate.trim() || null,
        summary: e.summary.trim() || null,
        bullets: e.bullets.map((b) => b.trim()).filter(Boolean),
      })),
    education: draft.education
      .filter((e) => e.school.trim() && e.degree.trim())
      .map((e) => ({
        school: e.school.trim(),
        degree: e.degree.trim(),
        field: e.field.trim() || null,
        startYear: e.startYear.trim() || null,
        endYear: e.endYear.trim() || null,
        notes: e.notes.trim() || null,
      })),
    projects: draft.projects
      .filter((p) => p.name.trim() && p.description.trim())
      .map((p) => ({
        name: p.name.trim(),
        description: p.description.trim(),
        link: p.link.trim() || null,
        tech: p.tech.map((t) => t.trim()).filter(Boolean),
      })),
    links: draft.links
      .filter((l) => l.label.trim() && l.url.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
  };
}

const emptyExperience = (): DraftExperience => ({
  role: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  summary: "",
  bullets: [],
});

const emptyEducation = (): DraftEducation => ({
  school: "",
  degree: "",
  field: "",
  startYear: "",
  endYear: "",
  notes: "",
});

const emptyProject = (): DraftProject => ({
  name: "",
  description: "",
  link: "",
  tech: [],
});

const emptyLink = (): DraftLink => ({ label: "", url: "" });

export function ProfileForm({
  profile,
  onSave,
  submitting,
}: {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  submitting: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="w-full flex-wrap sm:w-fit">
          <TabsTrigger value="basics">
            <UserRound />
            Basics
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Sparkles />
            Skills
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Briefcase />
            Experience
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap />
            Education
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderGit2 />
            Projects
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link2 />
            Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ahmed Abdelhafiez"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Headline">
              <Input
                value={draft.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="Senior Software Engineer, 8 years experience"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </Field>
            <Field label="Location">
              <Input
                value={draft.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Remote / New York, NY"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary">
                <Textarea
                  value={draft.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="Short professional summary that opens your resume."
                  rows={4}
                />
              </Field>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="pt-4">
          <Field label="Skills">
            <TagsEditor
              value={draft.skills}
              onChange={(value) => set("skills", value)}
              placeholder="e.g. TypeScript, React, PostgreSQL"
              addLabel="Add skill"
            />
          </Field>
        </TabsContent>

        <TabsContent value="experience" className="pt-4">
          <SectionList
            items={draft.experience}
            onChange={(value) => set("experience", value)}
            onAdd={() => set("experience", [...draft.experience, emptyExperience()])}
            addLabel="Add experience"
            emptyText="No experience yet. Add your roles so the AI can tailor your resume."
            renderItem={(item, onChangeItem, onRemove, index) => (
              <ExperienceCard item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
            )}
          />
        </TabsContent>

        <TabsContent value="education" className="pt-4">
          <SectionList
            items={draft.education}
            onChange={(value) => set("education", value)}
            onAdd={() => set("education", [...draft.education, emptyEducation()])}
            addLabel="Add education"
            emptyText="No education yet."
            renderItem={(item, onChangeItem, onRemove, index) => (
              <EducationCard item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
            )}
          />
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <SectionList
            items={draft.projects}
            onChange={(value) => set("projects", value)}
            onAdd={() => set("projects", [...draft.projects, emptyProject()])}
            addLabel="Add project"
            emptyText="No projects yet."
            renderItem={(item, onChangeItem, onRemove, index) => (
              <ProjectCard item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
            )}
          />
        </TabsContent>

        <TabsContent value="links" className="pt-4">
          <SectionList
            items={draft.links}
            onChange={(value) => set("links", value)}
            onAdd={() => set("links", [...draft.links, emptyLink()])}
            addLabel="Add link"
            emptyText="No links yet. Add GitHub, LinkedIn, or a portfolio."
            renderItem={(item, onChangeItem, onRemove, index) => (
              <LinkCard item={item} onChange={onChangeItem} onRemove={onRemove} index={index} />
            )}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-end">
        <Button
          onClick={() => onSave(toProfile(draft))}
          disabled={submitting || !draft.name.trim()}
        >
          {submitting && <Loader2 className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({
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

function SectionList<T>({
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

function TagsEditor({
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

function BulletsEditor({
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

function ExperienceCard({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: DraftExperience;
  onChange: (next: DraftExperience) => void;
  onRemove: () => void;
  index: number;
}) {
  const set = (key: keyof DraftExperience, value: string) =>
    onChange({ ...item, [key]: value });

  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role">
          <Input value={item.role} onChange={(e) => set("role", e.target.value)} placeholder="Senior Software Engineer" />
        </Field>
        <Field label="Company">
          <Input value={item.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." />
        </Field>
        <Field label="Location">
          <Input value={item.location} onChange={(e) => set("location", e.target.value)} placeholder="Remote / San Francisco, CA" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <Input value={item.startDate} onChange={(e) => set("startDate", e.target.value)} placeholder="Jan 2022" />
          </Field>
          <Field label="End date">
            <Input value={item.endDate} onChange={(e) => set("endDate", e.target.value)} placeholder="Present" />
          </Field>
        </div>
      </div>
      <Field label="Summary">
        <Textarea value={item.summary} onChange={(e) => set("summary", e.target.value)} placeholder="One or two lines about the role." rows={2} />
      </Field>
      <BulletsEditor bullets={item.bullets} onChange={(bullets) => onChange({ ...item, bullets })} />
    </SectionCard>
  );
}

function EducationCard({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: DraftEducation;
  onChange: (next: DraftEducation) => void;
  onRemove: () => void;
  index: number;
}) {
  const set = (key: keyof DraftEducation, value: string) =>
    onChange({ ...item, [key]: value });

  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School">
          <Input value={item.school} onChange={(e) => set("school", e.target.value)} placeholder="University of X" />
        </Field>
        <Field label="Degree">
          <Input value={item.degree} onChange={(e) => set("degree", e.target.value)} placeholder="B.S. in Computer Science" />
        </Field>
        <Field label="Field of study">
          <Input value={item.field} onChange={(e) => set("field", e.target.value)} placeholder="Computer Science" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start year">
            <Input value={item.startYear} onChange={(e) => set("startYear", e.target.value)} placeholder="2016" />
          </Field>
          <Field label="End year">
            <Input value={item.endYear} onChange={(e) => set("endYear", e.target.value)} placeholder="2020" />
          </Field>
        </div>
      </div>
      <Field label="Notes">
        <Textarea value={item.notes} onChange={(e) => set("notes", e.target.value)} placeholder="GPA, honors, relevant coursework..." rows={2} />
      </Field>
    </SectionCard>
  );
}

function ProjectCard({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: DraftProject;
  onChange: (next: DraftProject) => void;
  onRemove: () => void;
  index: number;
}) {
  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} placeholder="Workly" />
        </Field>
        <Field label="Link">
          <Input value={item.link} onChange={(e) => onChange({ ...item, link: e.target.value })} placeholder="https://..." />
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} placeholder="What did you build and why does it matter?" rows={3} />
      </Field>
      <Field label="Tech">
        <TagsEditor
          value={item.tech}
          onChange={(tech) => onChange({ ...item, tech })}
          placeholder="e.g. Next.js, tRPC, PostgreSQL"
          addLabel="Add tech"
        />
      </Field>
    </SectionCard>
  );
}

function LinkCard({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: DraftLink;
  onChange: (next: DraftLink) => void;
  onRemove: () => void;
  index: number;
}) {
  return (
    <SectionCard index={index} onRemove={onRemove}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label">
          <Input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} placeholder="GitHub" />
        </Field>
        <Field label="URL">
          <Input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} placeholder="https://github.com/you" />
        </Field>
      </div>
    </SectionCard>
  );
}
