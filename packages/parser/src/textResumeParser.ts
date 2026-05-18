import { type Resume, createResumeId } from "@ccrm/core";

export type ParsedTextResume = {
  resume: Resume;
  detectedSections: string[];
  warnings: string[];
};

export type TextResumeParseInput = {
  text: string;
  fileName?: string;
  importedAt?: Date;
};

type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "certifications"
  | "languages"
  | "contacts";

const sectionAliases: Record<SectionKey, string[]> = {
  summary: ["summary", "profile", "about", "о себе", "профиль", "резюме"],
  skills: ["skills", "key skills", "навыки", "ключевые навыки", "стек"],
  experience: ["experience", "work experience", "опыт", "опыт работы"],
  education: ["education", "образование"],
  certifications: ["certifications", "certificates", "сертификаты", "сертификации"],
  languages: ["languages", "языки"],
  contacts: ["contacts", "контакты"]
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/;

export function parseTextResume(input: TextResumeParseInput): ParsedTextResume {
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = collectSections(lines);
  const fallbackLines = lines.filter((line) => !isSectionHeading(line));
  const email = input.text.match(emailPattern)?.[0];
  const phone = input.text.match(phonePattern)?.[0];
  const fullName = findFullName(fallbackLines) ?? "Unknown candidate";
  const title = findTitle(fallbackLines, fullName);
  const warnings = buildWarnings({ fullName, email, phone, sections });

  return {
    detectedSections: Object.keys(sections),
    warnings,
    resume: {
      id: createResumeId("upload", input.fileName),
      source: {
        kind: "upload",
        externalId: input.fileName,
        importedAt: (input.importedAt ?? new Date()).toISOString()
      },
      candidate: {
        fullName,
        title,
        contacts: {
          email,
          phone,
          visibility: email || phone ? "available" : "unknown"
        }
      },
      summary: firstParagraph(sections.summary),
      skills: parseSkills(sections.skills),
      experience: parseExperience(sections.experience),
      projects: [],
      education: parseEducation(sections.education),
      certifications: parseCertifications(sections.certifications),
      languages: parseLanguages(sections.languages),
      rawText: input.text
    }
  };
}

function collectSections(lines: string[]): Partial<Record<SectionKey, string[]>> {
  const sections: Partial<Record<SectionKey, string[]>> = {};
  let activeSection: SectionKey | undefined;

  for (const line of lines) {
    const heading = detectSectionHeading(line);

    if (heading) {
      activeSection = heading;
      sections[activeSection] = sections[activeSection] ?? [];
      continue;
    }

    if (activeSection) {
      sections[activeSection]?.push(stripListMarker(line));
    }
  }

  return sections;
}

function detectSectionHeading(line: string): SectionKey | undefined {
  const normalized = normalizeHeading(line);
  const entries = Object.entries(sectionAliases) as Array<[SectionKey, string[]]>;

  return entries.find(([, aliases]) => aliases.includes(normalized))?.[0];
}

function isSectionHeading(line: string): boolean {
  return Boolean(detectSectionHeading(line));
}

function normalizeHeading(line: string): string {
  return line.replace(/[:：]$/, "").trim().toLowerCase();
}

function stripListMarker(line: string): string {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function findFullName(lines: string[]): string | undefined {
  return lines.find((line) => {
    if (emailPattern.test(line) || phonePattern.test(line)) {
      return false;
    }

    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && line.length <= 80;
  });
}

function findTitle(lines: string[], fullName: string): string | undefined {
  return lines.find((line) => line !== fullName && !emailPattern.test(line) && !phonePattern.test(line));
}

function firstParagraph(lines: string[] | undefined): string | undefined {
  const text = lines?.join(" ").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function parseSkills(lines: string[] | undefined): Resume["skills"] {
  return unique(
    (lines ?? []).flatMap((line) =>
      line
        .split(/[,;|]/)
        .map((skill) => skill.trim())
        .filter(Boolean)
    )
  )
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      confirmedBySource: true
    }));
}

function parseExperience(lines: string[] | undefined): Resume["experience"] {
  if (!lines || lines.length === 0) {
    return [];
  }

  const [headline, ...details] = lines;
  const [company, position] = splitHeadline(headline);

  return [
    {
      company,
      position,
      description: details.join(" ") || undefined,
      achievements: details.filter((line) => line.length > 8),
      skills: []
    }
  ];
}

function parseEducation(lines: string[] | undefined): Resume["education"] {
  return (lines ?? []).map((line) => {
    const graduationYear = line.match(/\b(19|20)\d{2}\b/)?.[0];

    return {
      institution: line.replace(/\b(19|20)\d{2}\b/, "").replace(/[,;-]\s*$/, "").trim(),
      graduationYear: graduationYear ? Number(graduationYear) : undefined
    };
  });
}

function parseCertifications(lines: string[] | undefined): Resume["certifications"] {
  return (lines ?? []).map((line) => {
    const year = line.match(/\b(19|20)\d{2}\b/)?.[0];

    return {
      name: line.replace(/\b(19|20)\d{2}\b/, "").replace(/[,;-]\s*$/, "").trim(),
      year: year ? Number(year) : undefined
    };
  });
}

function parseLanguages(lines: string[] | undefined): Resume["languages"] {
  return (lines ?? []).flatMap((line) =>
    line.split(/[,;]/).map((item) => {
      const [name, level] = item.split(/[-—:]/).map((part) => part.trim());

      return {
        name,
        level
      };
    })
  );
}

function splitHeadline(line: string): [string, string] {
  const [left, right] = line.split(/\s[-—|]\s/, 2).map((part) => part.trim());
  return [left || "Unknown company", right || "Unknown position"];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function buildWarnings(input: {
  fullName: string;
  email: string | undefined;
  phone: string | undefined;
  sections: Partial<Record<SectionKey, string[]>>;
}): string[] {
  const warnings: string[] = [];

  if (input.fullName === "Unknown candidate") {
    warnings.push("Candidate name was not detected.");
  }

  if (!input.email && !input.phone) {
    warnings.push("Contacts were not detected.");
  }

  if (!input.sections.skills || input.sections.skills.length === 0) {
    warnings.push("Skills section was not detected.");
  }

  if (!input.sections.experience || input.sections.experience.length === 0) {
    warnings.push("Experience section was not detected.");
  }

  return warnings;
}
