import {
  type Certification,
  type ContactInfo,
  type Education,
  type Resume,
  type ResumeLanguage,
  type Skill,
  type WorkExperience,
  createResumeId
} from "@ccrm/core";
import type { HhContact, HhEducationItem, HhResumePayload } from "./hhTypes";

export function mapHhResumeToResume(payload: HhResumePayload, importedAt = new Date()): Resume {
  return {
    id: createResumeId("hh.ru", payload.id),
    source: {
      kind: "hh.ru",
      externalId: payload.id,
      url: payload.url,
      importedAt: importedAt.toISOString()
    },
    candidate: {
      fullName: buildFullName(payload),
      title: payload.title,
      contacts: mapContacts(payload.contact, payload.area?.name)
    },
    summary: payload.skills?.trim() || undefined,
    skills: mapSkills(payload.skill_set),
    experience: mapExperience(payload),
    projects: mapProjects(payload),
    education: mapEducation(payload.education?.primary),
    certifications: mapCertifications(payload),
    languages: mapLanguages(payload)
  };
}

function buildFullName(payload: HhResumePayload): string {
  return [payload.last_name, payload.first_name, payload.middle_name].filter(Boolean).join(" ");
}

function mapContacts(contacts: HhContact[] | undefined, location?: string): ContactInfo {
  if (!contacts || contacts.length === 0) {
    return {
      location,
      visibility: "restricted"
    };
  }

  return contacts.reduce<ContactInfo>(
    (result, contact) => {
      const typeId = contact.type?.id;
      const value = contact.value;

      if (typeId === "email") {
        result.email = value?.email ?? value?.formatted;
      }

      if (typeId === "cell" || typeId === "phone") {
        result.phone = value?.phone ?? value?.formatted;
      }

      return result;
    },
    {
      location,
      visibility: "available"
    }
  );
}

function mapSkills(skillSet: string[] | undefined): Skill[] {
  return [...new Set(skillSet ?? [])]
    .filter((skill) => skill.trim().length > 0)
    .sort((left, right) => left.localeCompare(right))
    .map((skill) => ({
      name: skill,
      confirmedBySource: true
    }));
}

function mapExperience(payload: HhResumePayload): WorkExperience[] {
  return (payload.experience ?? []).map((item) => ({
    company: item.company ?? "Unknown company",
    position: item.position ?? "Unknown position",
    startDate: item.start,
    endDate: item.end ?? undefined,
    description: normalizeText(item.description),
    achievements: extractBullets(item.description),
    skills: mapSkills(payload.skill_set).map((skill) => skill.name)
  }));
}

function mapProjects(payload: HhResumePayload): Resume["projects"] {
  return (payload.portfolio ?? [])
    .map((item, index) => ({
      name: `Portfolio item ${index + 1}`,
      description: normalizeText(item.description),
      achievements: extractBullets(item.description),
      technologies: []
    }))
    .filter((project) => project.description || project.achievements.length > 0);
}

function mapEducation(items: HhEducationItem[] | undefined): Education[] {
  return (items ?? []).map((item) => ({
    institution: item.name ?? item.organization ?? "Unknown institution",
    degree: item.result,
    field: item.organization,
    graduationYear: item.year
  }));
}

function mapCertifications(payload: HhResumePayload): Certification[] {
  return (payload.certificate ?? [])
    .filter((item) => item.title)
    .map((item) => ({
      name: item.title as string,
      issuer: item.owner,
      year: item.achieved_at ? new Date(item.achieved_at).getFullYear() : undefined
    }));
}

function mapLanguages(payload: HhResumePayload): ResumeLanguage[] {
  return (payload.language ?? []).map((item) => ({
    name: item.name,
    level: item.level?.name
  }));
}

function normalizeText(text: string | undefined): string | undefined {
  const normalized = text?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function extractBullets(text: string | undefined): string[] {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[.;]\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
    .slice(0, 5);
}
