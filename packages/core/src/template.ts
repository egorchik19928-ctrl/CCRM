export type TemplateSectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "languages"
  | "contacts"
  | "vacancy-fit";

export type TemplateBranding = {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
};

export type TemplateSection = {
  key: TemplateSectionKey;
  label: string;
  enabled: boolean;
  order: number;
};

export type CompanyTemplate = {
  id: string;
  name: string;
  branding: TemplateBranding;
  sections: TemplateSection[];
};

export const defaultTemplateSections: TemplateSection[] = [
  { key: "summary", label: "Profile", enabled: true, order: 10 },
  { key: "skills", label: "Key skills", enabled: true, order: 20 },
  { key: "experience", label: "Experience", enabled: true, order: 30 },
  { key: "projects", label: "Projects", enabled: true, order: 40 },
  { key: "education", label: "Education", enabled: true, order: 50 },
  { key: "certifications", label: "Certifications", enabled: true, order: 60 },
  { key: "languages", label: "Languages", enabled: true, order: 70 },
  { key: "contacts", label: "Contacts", enabled: true, order: 80 },
  { key: "vacancy-fit", label: "Vacancy fit", enabled: false, order: 90 }
];

export function createCompanyTemplate(input: {
  id: string;
  name: string;
  companyName: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}): CompanyTemplate {
  return {
    id: input.id,
    name: input.name,
    branding: {
      companyName: input.companyName,
      primaryColor: input.primaryColor ?? "#1d4ed8",
      secondaryColor: input.secondaryColor ?? "#0f172a",
      fontFamily: input.fontFamily ?? "Inter"
    },
    sections: [...defaultTemplateSections]
  };
}

export function getEnabledSections(template: CompanyTemplate): TemplateSection[] {
  return template.sections
    .filter((section) => section.enabled)
    .sort((left, right) => left.order - right.order);
}
