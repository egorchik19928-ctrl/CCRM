import { describe, expect, it } from "vitest";
import { createCompanyTemplate, type Resume } from "@ccrm/core";
import { buildCorporateResumeDocument } from "../src";

const resume: Resume = {
  id: "hh.ru:123",
  source: {
    kind: "hh.ru",
    externalId: "123",
    importedAt: "2026-05-18T00:00:00.000Z"
  },
  candidate: {
    fullName: "Ivan Petrov",
    title: "Frontend Developer",
    contacts: {
      email: "ivan@example.com",
      visibility: "available"
    }
  },
  summary: "Builds enterprise web interfaces.",
  skills: [
    { name: "React", confirmedBySource: true },
    { name: "TypeScript", confirmedBySource: true },
    { name: "GraphQL", confirmedBySource: false }
  ],
  experience: [
    {
      company: "Example LLC",
      position: "Developer",
      startDate: "2021-01",
      achievements: ["Delivered a design system."],
      skills: ["React"]
    }
  ],
  projects: [],
  education: [],
  certifications: [],
  languages: []
};

describe("corporate document builder", () => {
  it("uses only confirmed skills for template output and vacancy matching", () => {
    const template = createCompanyTemplate({
      id: "main",
      name: "Primary",
      companyName: "CCRM"
    });
    template.sections = template.sections.map((section) =>
      section.key === "vacancy-fit" ? { ...section, enabled: true } : section
    );

    const document = buildCorporateResumeDocument({
      resume,
      template,
      vacancy: {
        vacancyTitle: "Senior Frontend Developer",
        vacancyDescription: "React and GraphQL role",
        requiredSkills: ["React", "GraphQL"]
      }
    });

    expect(document.sections.find((section) => section.key === "skills")?.lines).toEqual([
      "React",
      "TypeScript"
    ]);
    expect(document.sections.find((section) => section.key === "vacancy-fit")?.lines).toContain(
      "Confirmed matching skills: React"
    );
  });
});
