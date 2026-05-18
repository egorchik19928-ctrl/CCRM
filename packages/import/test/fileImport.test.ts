import { describe, expect, it } from "vitest";
import {
  UnsupportedResumeFileError,
  detectResumeFileKind,
  extractTextFromBrowserFile,
  importResumeFromBrowserFile
} from "../src";

const resumeText = `Ivan Petrov
Frontend Developer
ivan.petrov@example.com

Skills
React, TypeScript

Experience
Example LLC - Frontend Developer
- Built customer-facing interfaces`;

describe("resume file import", () => {
  it("detects supported resume file kinds", () => {
    expect(detectResumeFileKind("resume.txt", "text/plain")).toBe("plain-text");
    expect(detectResumeFileKind("resume.docx", "")).toBe("docx");
    expect(detectResumeFileKind("resume.pdf", "application/pdf")).toBe("pdf");
    expect(detectResumeFileKind("resume.png", "image/png")).toBe("unsupported");
  });

  it("extracts and parses plain text files", async () => {
    const file = new File([resumeText], "resume.txt", { type: "text/plain" });
    const result = await importResumeFromBrowserFile(
      file,
      new Date("2026-05-18T00:00:00.000Z")
    );

    expect(result.extraction).toMatchObject({
      kind: "plain-text",
      fileName: "resume.txt"
    });
    expect(result.parsed.resume.candidate.fullName).toBe("Ivan Petrov");
    expect(result.parsed.resume.skills.map((skill) => skill.name)).toEqual([
      "React",
      "TypeScript"
    ]);
  });

  it("rejects PDFs until a dedicated extractor is added", async () => {
    const file = new File(["%PDF"], "resume.pdf", { type: "application/pdf" });

    await expect(extractTextFromBrowserFile(file)).rejects.toBeInstanceOf(
      UnsupportedResumeFileError
    );
  });
});
