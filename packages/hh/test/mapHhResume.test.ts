import { describe, expect, it } from "vitest";
import samplePayload from "../fixtures/sample-hh-resume.json";
import { mapHhResumeToResume, type HhResumePayload } from "../src";

describe("hh.ru resume mapper", () => {
  it("normalizes an hh.ru payload into the canonical resume model", () => {
    const resume = mapHhResumeToResume(
      samplePayload as HhResumePayload,
      new Date("2026-05-18T00:00:00.000Z")
    );

    expect(resume.id).toBe("hh.ru:candidate-001");
    expect(resume.candidate.fullName).toBe("Petrov Ivan Sergeevich");
    expect(resume.candidate.contacts).toMatchObject({
      email: "ivan.petrov@example.com",
      phone: "+7 999 000-00-00",
      location: "Moscow",
      visibility: "available"
    });
    expect(resume.skills.map((skill) => skill.name)).toEqual(["React", "Redux", "TypeScript"]);
    expect(resume.experience[0]?.achievements).toContain("Built a customer portal");
    expect(resume.education[0]?.institution).toBe("Moscow Technical University");
    expect(resume.certifications[0]?.year).toBe(2022);
  });

  it("marks contacts as restricted when hh.ru does not expose them", () => {
    const resume = mapHhResumeToResume({
      id: "hidden",
      first_name: "Anna",
      last_name: "Ivanova"
    });

    expect(resume.candidate.contacts.visibility).toBe("restricted");
  });
});
