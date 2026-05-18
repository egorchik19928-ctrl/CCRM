import {
  type Resume,
  type Skill,
  type VacancyAdaptationInput,
  getConfirmedSkillNames
} from "@ccrm/core";

export type CorporateStyle = "concise" | "consulting" | "technical";

export type ResumeAdaptationInput = {
  resume: Resume;
  vacancy?: VacancyAdaptationInput;
  style: CorporateStyle;
};

export type ResumeAdaptationResult = {
  resume: Resume;
  notes: string[];
};

export function adaptResumeForCorporateStyle(
  input: ResumeAdaptationInput
): ResumeAdaptationResult {
  const confirmedSkillNames = getConfirmedSkillNames(input.resume);
  const matchingSkills = getMatchingSkills(confirmedSkillNames, input.vacancy?.requiredSkills ?? []);
  const notes = [
    "Only presentation text was adapted; factual fields are preserved.",
    ...(matchingSkills.length > 0
      ? [`Vacancy-relevant confirmed skills: ${matchingSkills.join(", ")}.`]
      : [])
  ];

  return {
    notes,
    resume: {
      ...input.resume,
      summary: buildSummary(input.resume, input.style, matchingSkills, input.vacancy),
      skills: prioritizeSkills(input.resume.skills, matchingSkills),
      experience: input.resume.experience.map((item) => ({
        ...item,
        achievements: item.achievements.map((achievement) =>
          polishAchievement(achievement, input.style)
        )
      }))
    }
  };
}

function buildSummary(
  resume: Resume,
  style: CorporateStyle,
  matchingSkills: string[],
  vacancy: VacancyAdaptationInput | undefined
): string {
  const baseSummary = resume.summary?.trim() || `${resume.candidate.title ?? "Candidate"} profile`;
  const relevantSkills =
    matchingSkills.length > 0 ? ` Confirmed relevant skills: ${matchingSkills.join(", ")}.` : "";
  const vacancyTarget = vacancy ? ` Target role: ${vacancy.vacancyTitle}.` : "";

  if (style === "consulting") {
    return `Client-ready profile: ${baseSummary}.${vacancyTarget}${relevantSkills}`.replace(
      /\.\./g,
      "."
    );
  }

  if (style === "technical") {
    return `Technical profile: ${baseSummary}.${relevantSkills}${vacancyTarget}`.replace(
      /\.\./g,
      "."
    );
  }

  return `${baseSummary}.${vacancyTarget}${relevantSkills}`.replace(/\.\./g, ".");
}

function prioritizeSkills(skills: Skill[], matchingSkills: string[]): Skill[] {
  const matching = new Set(matchingSkills.map((skill) => skill.toLowerCase()));

  return [...skills].sort((left, right) => {
    const leftMatch = matching.has(left.name.toLowerCase()) ? 0 : 1;
    const rightMatch = matching.has(right.name.toLowerCase()) ? 0 : 1;

    if (leftMatch !== rightMatch) {
      return leftMatch - rightMatch;
    }

    return left.name.localeCompare(right.name);
  });
}

function getMatchingSkills(confirmedSkills: string[], requiredSkills: string[]): string[] {
  const confirmed = new Set(confirmedSkills.map((skill) => skill.toLowerCase()));

  return requiredSkills.filter((skill) => confirmed.has(skill.toLowerCase()));
}

function polishAchievement(achievement: string, style: CorporateStyle): string {
  const cleaned = achievement.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return cleaned;
  }

  const sentence = cleaned.endsWith(".") ? cleaned : `${cleaned}.`;

  if (style === "consulting") {
    return sentence.replace(/^built/i, "Delivered").replace(/^introduced/i, "Implemented");
  }

  if (style === "technical") {
    return sentence.replace(/^delivered/i, "Built");
  }

  return sentence;
}
