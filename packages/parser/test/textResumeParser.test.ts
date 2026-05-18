import { describe, expect, it } from "vitest";
import { parseTextResume } from "../src";

const resumeText = `
Ivan Petrov
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
English - B2, Russian - Native
`;

describe("text resume parser", () => {
  it("extracts candidate facts and sections from plain text", () => {
    const parsed = parseTextResume({
      text: resumeText,
      fileName: "ivan-petrov.txt",
      importedAt: new Date("2026-05-18T00:00:00.000Z")
    });

    expect(parsed.resume.id).toBe("upload:ivan-petrov.txt");
    expect(parsed.resume.candidate.fullName).toBe("Ivan Petrov");
    expect(parsed.resume.candidate.title).toBe("Frontend Developer");
    expect(parsed.resume.candidate.contacts).toMatchObject({
      email: "ivan.petrov@example.com",
      phone: "+7 999 000-00-00",
      visibility: "available"
    });
    expect(parsed.resume.summary).toBe("Frontend developer with enterprise UI experience.");
    expect(parsed.resume.skills.map((skill) => skill.name)).toEqual([
      "React",
      "Redux",
      "TypeScript"
    ]);
    expect(parsed.resume.experience[0]).toMatchObject({
      company: "Example LLC",
      position: "Frontend Developer",
      achievements: ["Built a customer portal", "Introduced a shared component library"]
    });
    expect(parsed.resume.education[0]).toMatchObject({
      institution: "Moscow Technical University",
      graduationYear: 2020
    });
    expect(parsed.resume.languages).toEqual([
      { name: "English", level: "B2" },
      { name: "Russian", level: "Native" }
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it("returns warnings when important sections are missing", () => {
    const parsed = parseTextResume({
      text: "Untitled resume",
      importedAt: new Date("2026-05-18T00:00:00.000Z")
    });

    expect(parsed.warnings).toContain("Candidate name was not detected.");
    expect(parsed.warnings).toContain("Contacts were not detected.");
    expect(parsed.warnings).toContain("Skills section was not detected.");
    expect(parsed.warnings).toContain("Experience section was not detected.");
  });
});
