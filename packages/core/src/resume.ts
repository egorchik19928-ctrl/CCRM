export type ResumeSourceKind = "hh.ru" | "upload" | "manual";

export type ResumeSource = {
  kind: ResumeSourceKind;
  externalId?: string;
  url?: string;
  importedAt: string;
};

export type ContactVisibility = "available" | "restricted" | "unknown";

export type ContactInfo = {
  email?: string;
  phone?: string;
  telegram?: string;
  location?: string;
  visibility: ContactVisibility;
};

export type ResumeLanguage = {
  name: string;
  level?: string;
};

export type Skill = {
  name: string;
  category?: string;
  confirmedBySource: boolean;
};

export type WorkExperience = {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  achievements: string[];
  skills: string[];
};

export type Education = {
  institution: string;
  degree?: string;
  field?: string;
  graduationYear?: number;
};

export type Project = {
  name: string;
  role?: string;
  description?: string;
  achievements: string[];
  technologies: string[];
};

export type Certification = {
  name: string;
  issuer?: string;
  year?: number;
};

export type Resume = {
  id: string;
  source: ResumeSource;
  candidate: {
    fullName: string;
    title?: string;
    contacts: ContactInfo;
  };
  summary?: string;
  skills: Skill[];
  experience: WorkExperience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  languages: ResumeLanguage[];
  rawText?: string;
};

export type VacancyAdaptationInput = {
  vacancyTitle: string;
  vacancyDescription: string;
  requiredSkills: string[];
};

export function createResumeId(source: ResumeSourceKind, externalId?: string): string {
  const suffix = externalId?.trim() || cryptoSafeId();
  return `${source}:${suffix}`;
}

export function getConfirmedSkillNames(resume: Resume): string[] {
  return resume.skills
    .filter((skill) => skill.confirmedBySource)
    .map((skill) => skill.name)
    .sort((left, right) => left.localeCompare(right));
}

function cryptoSafeId(): string {
  return Math.random().toString(36).slice(2, 12);
}
