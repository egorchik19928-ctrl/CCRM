import { describe, expect, it } from "vitest";
import type { CorporateResumeDocument } from "../src";
import { renderCorporateResumeText } from "../src";

const document: CorporateResumeDocument = {
  title: "Ivan Petrov",
  subtitle: "Frontend Developer",
  companyName: "CCRM",
  branding: {
    companyName: "CCRM",
    primaryColor: "#2563eb",
    secondaryColor: "#111827",
    fontFamily: "Inter"
  },
  sections: [
    {
      key: "summary",
      title: "Profile",
      lines: ["Frontend developer."]
    },
    {
      key: "skills",
      title: "Skills",
      lines: ["React", "TypeScript"]
    }
  ]
};

describe("corporate resume renderers", () => {
  it("renders a deterministic text representation", () => {
    expect(renderCorporateResumeText(document)).toContain("Ivan Petrov");
    expect(renderCorporateResumeText(document)).toContain("PROFILE");
    expect(renderCorporateResumeText(document)).toContain("- React");
  });
});
