import { createCompanyTemplate, type CompanyTemplate } from "@ccrm/core";
import { mapHhResumeToResume, type HhResumePayload } from "@ccrm/hh";

export const demoPlainTextResume = `Ivan Petrov
Frontend Developer
ivan.petrov@example.com
+7 999 000-00-00

Summary
Frontend developer with enterprise UI experience.

Skills
React, TypeScript, Redux

Experience
Example LLC - Frontend Developer
- Built a customer portal
- Introduced a shared component library

Education
Moscow Technical University, 2020

Languages
English - B2, Russian - Native`;

export const demoTemplate: CompanyTemplate = createCompanyTemplate({
  id: "primary",
  name: "Primary corporate resume",
  companyName: "CCRM",
  primaryColor: "#2563eb",
  secondaryColor: "#111827",
  fontFamily: "Inter"
});

demoTemplate.sections = demoTemplate.sections.map((section) =>
  section.key === "vacancy-fit" ? { ...section, enabled: true } : section
);

const demoHhPayload: HhResumePayload = {
  id: "candidate-001",
  url: "https://hh.ru/resume/candidate-001",
  first_name: "Ivan",
  last_name: "Petrov",
  title: "Frontend Developer",
  area: {
    id: "1",
    name: "Moscow"
  },
  contact: [
    {
      type: {
        id: "email",
        name: "Email"
      },
      value: {
        email: "ivan.petrov@example.com"
      }
    }
  ],
  skills: "Frontend developer with enterprise UI experience.",
  skill_set: ["React", "TypeScript", "Redux"],
  experience: [
    {
      company: "Example LLC",
      position: "Frontend Developer",
      start: "2021-02-01",
      end: null,
      description: "Built a customer portal. Introduced a shared component library."
    }
  ],
  education: {
    primary: [
      {
        name: "Moscow Technical University",
        organization: "Computer Science",
        result: "Bachelor",
        year: 2020
      }
    ]
  },
  language: [
    {
      id: "eng",
      name: "English",
      level: {
        id: "b2",
        name: "B2"
      }
    }
  ]
};

export const demoResume = mapHhResumeToResume(
  demoHhPayload,
  new Date("2026-05-18T00:00:00.000Z")
);

export const demoVacancy = {
  vacancyTitle: "Senior Frontend Developer",
  vacancyDescription: "Develop customer-facing products with React and TypeScript.",
  requiredSkills: ["React", "TypeScript", "GraphQL"]
};
