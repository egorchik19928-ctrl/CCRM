import {
  type CompanyTemplate,
  type Resume,
  type TemplateSectionKey,
  type VacancyAdaptationInput,
  getConfirmedSkillNames,
  getEnabledSections
} from "@ccrm/core";

export type CorporateDocumentSection = {
  key: TemplateSectionKey;
  title: string;
  lines: string[];
};

export type CorporateResumeDocument = {
  title: string;
  subtitle?: string;
  companyName: string;
  branding: CompanyTemplate["branding"];
  sections: CorporateDocumentSection[];
};

export function buildCorporateResumeDocument(input: {
  resume: Resume;
  template: CompanyTemplate;
  vacancy?: VacancyAdaptationInput;
}): CorporateResumeDocument {
  const { resume, template, vacancy } = input;
  const sections = getEnabledSections(template)
    .map((section) => ({
      key: section.key,
      title: section.label,
      lines: buildSectionLines(section.key, resume, vacancy)
    }))
    .filter((section) => section.lines.length > 0);

  return {
    title: resume.candidate.fullName,
    subtitle: resume.candidate.title,
    companyName: template.branding.companyName,
    branding: template.branding,
    sections
  };
}

function buildSectionLines(
  key: TemplateSectionKey,
  resume: Resume,
  vacancy?: VacancyAdaptationInput
): string[] {
  switch (key) {
    case "summary":
      return resume.summary ? [resume.summary] : [];
    case "skills":
      return getConfirmedSkillNames(resume);
    case "experience":
      return resume.experience.flatMap((item) => [
        formatDateRange(item.startDate, item.endDate, item.company, item.position),
        ...item.achievements,
        ...(item.description ? [item.description] : [])
      ]);
    case "projects":
      return resume.projects.flatMap((project) => [
        [project.name, project.role].filter(Boolean).join(" - "),
        ...project.achievements,
        ...(project.technologies.length > 0
          ? [`Technologies: ${project.technologies.join(", ")}`]
          : [])
      ]);
    case "education":
      return resume.education.map((item) =>
        [item.institution, item.degree, item.field, item.graduationYear]
          .filter(Boolean)
          .join(", ")
      );
    case "certifications":
      return resume.certifications.map((item) =>
        [item.name, item.issuer, item.year].filter(Boolean).join(", ")
      );
    case "languages":
      return resume.languages.map((item) => [item.name, item.level].filter(Boolean).join(" - "));
    case "contacts":
      return buildContactLines(resume);
    case "vacancy-fit":
      return buildVacancyFitLines(resume, vacancy);
  }
}

function buildContactLines(resume: Resume): string[] {
  const contacts = resume.candidate.contacts;

  if (contacts.visibility === "restricted") {
    return ["Contacts are restricted by the source provider."];
  }

  return [contacts.email, contacts.phone, contacts.telegram, contacts.location].filter(
    (value): value is string => Boolean(value)
  );
}

function buildVacancyFitLines(resume: Resume, vacancy?: VacancyAdaptationInput): string[] {
  if (!vacancy) {
    return [];
  }

  const confirmedSkills = new Set(getConfirmedSkillNames(resume).map((skill) => skill.toLowerCase()));
  const matchingSkills = vacancy.requiredSkills.filter((skill) =>
    confirmedSkills.has(skill.toLowerCase())
  );

  return [
    `Target role: ${vacancy.vacancyTitle}`,
    matchingSkills.length > 0
      ? `Confirmed matching skills: ${matchingSkills.join(", ")}`
      : "No confirmed matching skills found yet."
  ];
}

function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  company: string,
  position: string
): string {
  const range = [startDate, endDate ?? "present"].filter(Boolean).join(" - ");
  return [range, company, position].filter(Boolean).join(" | ");
}
