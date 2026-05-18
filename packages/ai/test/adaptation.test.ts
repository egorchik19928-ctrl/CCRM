import { describe, expect, it } from "vitest";
import { type Resume } from "@ccrm/core";
import { adaptResumeForCorporateStyle } from "../src";

const resume: Resume = {
  id: "upload:resume.txt",
  source: {
    kind: "upload",
    externalId: "resume.txt",
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
  summary: "Frontend developer with enterprise UI experience",
  skills: [
    { name: "GraphQL", confirmedBySource: false },
    { name: "TypeScript", confirmedBySource: true },
    { name: "React", confirmedBySource: true }
  ],
  experience: [
    {
      company: "Example LLC",
      position: "Frontend Developer",
      achievements: ["Built a customer portal"],
      skills: ["React"]
    }
  ],
  projects: [],
  education: [],
  certifications: [],
  languages: []
};

describe("corporate resume adaptation", () => {
  it("adapts text while preserving factual fields", () => {
    const result = adaptResumeForCorporateStyle({
      resume,
      style: "consulting",
      vacancy: {
        vacancyTitle: "Senior Frontend Developer",
        vacancyDescription: "React and GraphQL",
        requiredSkills: ["React", "GraphQL"]
      }
    });

    expect(result.resume.candidate).toEqual(resume.candidate);
    expect(result.resume.experience[0]?.company).toBe("Example LLC");
    expect(result.resume.summary).toContain("Client-ready profile");
    expect(result.resume.summary).toContain("React");
    expect(result.resume.summary).not.toContain("GraphQL");
    expect(result.resume.skills.map((skill) => skill.name)[0]).toBe("React");
    expect(result.resume.experience[0]?.achievements[0]).toBe("Delivered a customer portal.");
    expect(result.notes[0]).toContain("factual fields are preserved");
  });
});
