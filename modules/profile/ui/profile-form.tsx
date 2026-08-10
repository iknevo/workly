"use client";

import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  Link2,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ProfileFormInput, UserProfile } from "@/db/schema";

import { BasicsTab } from "./tabs/basics-tab";
import { EducationTab } from "./tabs/education-tab";
import { ExperienceTab } from "./tabs/experience-tab";
import { LinksTab } from "./tabs/links-tab";
import { ProjectsTab } from "./tabs/projects-tab";
import { SkillsTab } from "./tabs/skills-tab";

const toForm = (profile: UserProfile): ProfileFormInput => ({
  name: profile.name,
  email: profile.email ?? "",
  headline: profile.headline ?? "",
  phone: profile.phone ?? "",
  location: profile.location ?? "",
  summary: profile.summary ?? "",
  skills: profile.skills,
  experience: profile.experience.map((e) => ({
    role: e.role,
    company: e.company,
    location: e.location ?? "",
    startDate: e.startDate ?? "",
    endDate: e.endDate ?? "",
    summary: e.summary ?? "",
    bullets: e.bullets,
  })),
  education: profile.education.map((e) => ({
    school: e.school,
    degree: e.degree,
    field: e.field ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    notes: e.notes ?? "",
  })),
  projects: profile.projects.map((p) => ({
    name: p.name,
    description: p.description,
    link: p.link ?? "",
    tech: p.tech,
  })),
  links: profile.links.map((l) => ({ label: l.label, url: l.url })),
});

export function ProfileForm({
  profile,
  onSave,
  submitting,
}: {
  profile: UserProfile;
  onSave: (draft: ProfileFormInput) => void;
  submitting: boolean;
}) {
  const [draft, setDraft] = useState<ProfileFormInput>(() => toForm(profile));

  const set = <K extends keyof ProfileFormInput>(key: K, value: ProfileFormInput[K]) =>
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
          <BasicsTab draft={draft} set={set} />
        </TabsContent>

        <TabsContent value="skills" className="pt-4">
          <SkillsTab skills={draft.skills} onChange={(skills) => set("skills", skills)} />
        </TabsContent>

        <TabsContent value="experience" className="pt-4">
          <ExperienceTab
            items={draft.experience}
            onChange={(experience) => set("experience", experience)}
          />
        </TabsContent>

        <TabsContent value="education" className="pt-4">
          <EducationTab
            items={draft.education}
            onChange={(education) => set("education", education)}
          />
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <ProjectsTab items={draft.projects} onChange={(projects) => set("projects", projects)} />
        </TabsContent>

        <TabsContent value="links" className="pt-4">
          <LinksTab items={draft.links} onChange={(links) => set("links", links)} />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-end">
        <Button
          onClick={() => onSave(draft)}
          disabled={submitting || !draft.name.trim()}
        >
          {submitting && <Loader2 className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}
