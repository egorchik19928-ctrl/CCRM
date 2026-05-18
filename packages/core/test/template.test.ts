import { describe, expect, it } from "vitest";
import { createCompanyTemplate, getEnabledSections } from "../src";

describe("company templates", () => {
  it("creates a configurable template with sensible default sections", () => {
    const template = createCompanyTemplate({
      id: "main",
      name: "Primary",
      companyName: "Acme"
    });

    expect(template.branding.companyName).toBe("Acme");
    expect(getEnabledSections(template).map((section) => section.key)).toEqual([
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "certifications",
      "languages",
      "contacts"
    ]);
  });
});
