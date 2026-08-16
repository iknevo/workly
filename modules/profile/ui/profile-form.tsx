"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  FolderGit2,
  GraduationCap,
  Link2,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { profileUpdateSchema } from "@/db/schema";
import type { ProfileFormInput, ProfileProject, UserProfile } from "@/db/schema";

import { BasicsTab } from "./tabs/basics-tab";
import { EducationTab } from "./tabs/education-tab";
import { ExperienceTab } from "./tabs/experience-tab";
import { LinksTab } from "./tabs/links-tab";
import { ProjectsTab } from "./tabs/projects-tab";
import { SkillsTab } from "./tabs/skills-tab";

const toProjectInput = (p: ProfileProject): ProfileFormInput["projects"][number] => ({
  name: p.name,
  description: p.description,
  previewUrl: p.previewUrl ?? (p as { link?: string | null }).link ?? "",
  sourceCodeUrl: p.sourceCodeUrl ?? "",
  tech: p.tech,
});

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
    projects: (e.projects ?? []).map(toProjectInput),
  })),
  education: profile.education.map((e) => ({
    school: e.school,
    degree: e.degree,
    field: e.field ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    notes: e.notes ?? "",
  })),
  projects: profile.projects.map(toProjectInput),
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
  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileUpdateSchema) as Resolver<ProfileFormInput>,
    defaultValues: toForm(profile),
  });

  const name = useWatch({ control: form.control, name: "name" });

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit((values) => onSave(values))}>
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
          <BasicsTab control={form.control} />
        </TabsContent>

        <TabsContent value="skills" className="pt-4">
          <SkillsTab control={form.control} />
        </TabsContent>

        <TabsContent value="experience" className="pt-4">
          <ExperienceTab control={form.control} />
        </TabsContent>

        <TabsContent value="education" className="pt-4">
          <EducationTab control={form.control} />
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <ProjectsTab control={form.control} />
        </TabsContent>

        <TabsContent value="links" className="pt-4">
          <LinksTab control={form.control} />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting && <Loader2 className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </form>
  );
}
