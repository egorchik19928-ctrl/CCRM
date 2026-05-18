import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { adaptResumeForCorporateStyle, type CorporateStyle } from "@ccrm/ai";
import { type Resume, type VacancyAdaptationInput } from "@ccrm/core";
import {
  buildCorporateResumeDocument,
  renderCorporateResumeDocx,
  renderCorporateResumePdf,
  renderCorporateResumeText
} from "@ccrm/export";
import { mapHhResumeToResume, type HhResumePayload } from "@ccrm/hh";
import { UnsupportedResumeFileError, importResumeFromBrowserFile } from "@ccrm/import";
import { parseTextResume } from "@ccrm/parser";
import { demoPlainTextResume, demoResume, demoTemplate, demoVacancy } from "./demoData";
import "./styles.css";

const draftStorageKey = "ccrm.mvp.draft.v1";
const initialImportedAt = new Date("2026-05-18T00:00:00.000Z");
const initialParsedUpload = parseTextResume({
  text: demoPlainTextResume,
  fileName: "manual-import.txt",
  importedAt: initialImportedAt
});

type ParserMeta = {
  detectedSections: string[];
  warnings: string[];
};

type PersistedDraft = {
  resume: Resume;
  resumeText: string;
  sourceFileName: string;
  hhJson: string;
  template: typeof demoTemplate;
  vacancyTitle: string;
  vacancyDescription: string;
  requiredSkillsText: string;
  corporateStyle: CorporateStyle;
  parserMeta: ParserMeta;
  adaptationNotes: string[];
};

export function App() {
  const [persistedDraft] = useState(loadPersistedDraft);
  const [resumeText, setResumeText] = useState(
    () => persistedDraft?.resumeText ?? demoPlainTextResume
  );
  const [sourceFileName, setSourceFileName] = useState(
    () => persistedDraft?.sourceFileName ?? "manual-import.txt"
  );
  const [hhJson, setHhJson] = useState(() => persistedDraft?.hhJson ?? "");
  const [resume, setResume] = useState<Resume>(
    () => persistedDraft?.resume ?? initialParsedUpload.resume
  );
  const [template, setTemplate] = useState(() => persistedDraft?.template ?? cloneDemoTemplate());
  const [vacancyTitle, setVacancyTitle] = useState(
    () => persistedDraft?.vacancyTitle ?? demoVacancy.vacancyTitle
  );
  const [vacancyDescription, setVacancyDescription] = useState(
    () => persistedDraft?.vacancyDescription ?? demoVacancy.vacancyDescription
  );
  const [requiredSkillsText, setRequiredSkillsText] = useState(
    () => persistedDraft?.requiredSkillsText ?? demoVacancy.requiredSkills.join(", ")
  );
  const [corporateStyle, setCorporateStyle] = useState<CorporateStyle>(
    () => persistedDraft?.corporateStyle ?? "consulting"
  );
  const [parserMeta, setParserMeta] = useState<ParserMeta>(
    () =>
      persistedDraft?.parserMeta ?? {
        detectedSections: initialParsedUpload.detectedSections,
        warnings: initialParsedUpload.warnings
      }
  );
  const [adaptationNotes, setAdaptationNotes] = useState<string[]>(
    () => persistedDraft?.adaptationNotes ?? []
  );
  const [fileImportMessage, setFileImportMessage] = useState<string>();
  const [fileImportError, setFileImportError] = useState<string>();
  const [hhImportError, setHhImportError] = useState<string>();
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [exportMessage, setExportMessage] = useState<string>();

  const vacancy = useMemo<VacancyAdaptationInput>(
    () => ({
      vacancyTitle,
      vacancyDescription,
      requiredSkills: parseList(requiredSkillsText)
    }),
    [requiredSkillsText, vacancyDescription, vacancyTitle]
  );
  const documentModel = useMemo(
    () =>
      buildCorporateResumeDocument({
        resume,
        template,
        vacancy
      }),
    [resume, template, vacancy]
  );

  useEffect(() => {
    const draft: PersistedDraft = {
      resume,
      resumeText,
      sourceFileName,
      hhJson,
      template,
      vacancyTitle,
      vacancyDescription,
      requiredSkillsText,
      corporateStyle,
      parserMeta,
      adaptationNotes
    };

    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Local persistence is best-effort for the browser MVP.
    }
  }, [
    adaptationNotes,
    corporateStyle,
    hhJson,
    parserMeta,
    requiredSkillsText,
    resume,
    resumeText,
    sourceFileName,
    template,
    vacancyDescription,
    vacancyTitle
  ]);

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setIsImportingFile(true);
    setFileImportMessage(undefined);
    setFileImportError(undefined);

    try {
      const result = await importResumeFromBrowserFile(
        file,
        new Date("2026-05-18T00:00:00.000Z")
      );

      setResumeText(result.extraction.text);
      setSourceFileName(result.extraction.fileName);
      setResume(result.parsed.resume);
      setParserMeta({
        detectedSections: result.parsed.detectedSections,
        warnings: result.parsed.warnings
      });
      setAdaptationNotes([]);
      setFileImportMessage(
        `${result.extraction.fileName} imported as ${result.extraction.kind}.`
      );
    } catch (error) {
      const message =
        error instanceof UnsupportedResumeFileError && error.kind === "pdf"
          ? "PDF import needs the dedicated extraction worker planned for the next slice."
          : error instanceof Error
            ? error.message
            : "Resume file import failed.";
      setFileImportError(message);
    } finally {
      setIsImportingFile(false);
      event.currentTarget.value = "";
    }
  }

  function handleTextChange(value: string) {
    const parsed = parseTextResume({
      text: value,
      fileName: sourceFileName,
      importedAt: new Date()
    });

    setResumeText(value);
    setResume(parsed.resume);
    setParserMeta({
      detectedSections: parsed.detectedSections,
      warnings: parsed.warnings
    });
    setAdaptationNotes([]);
  }

  function handleHhJsonImport() {
    setHhImportError(undefined);

    try {
      const payload = JSON.parse(hhJson) as HhResumePayload;

      if (!payload.id) {
        throw new Error("hh.ru payload must include an id field.");
      }

      const mappedResume = mapHhResumeToResume(payload, new Date());
      setResume(mappedResume);
      setResumeText("");
      setSourceFileName(`hh-${payload.id}.json`);
      setParserMeta({
        detectedSections: ["hh.ru"],
        warnings: []
      });
      setAdaptationNotes([]);
    } catch (error) {
      setHhImportError(error instanceof Error ? error.message : "Invalid hh.ru JSON payload.");
    }
  }

  function applyAdaptation() {
    const result = adaptResumeForCorporateStyle({
      resume,
      style: corporateStyle,
      vacancy
    });

    setResume(result.resume);
    setAdaptationNotes(result.notes);
  }

  async function exportResume(format: "txt" | "docx" | "pdf") {
    setExportMessage(undefined);

    const safeName = resume.candidate.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "resume";
    const blob =
      format === "txt"
        ? new Blob([renderCorporateResumeText(documentModel)], { type: "text/plain;charset=utf-8" })
        : format === "docx"
          ? await renderCorporateResumeDocx(documentModel)
          : await renderCorporateResumePdf(documentModel);

    downloadBlob(blob, `${safeName}.${format}`);
    setExportMessage(`${format.toUpperCase()} export generated.`);
  }

  function resetDraft() {
    localStorage.removeItem(draftStorageKey);
    setResumeText(demoPlainTextResume);
    setSourceFileName("manual-import.txt");
    setHhJson("");
    setResume(initialParsedUpload.resume);
    setTemplate(cloneDemoTemplate());
    setVacancyTitle(demoVacancy.vacancyTitle);
    setVacancyDescription(demoVacancy.vacancyDescription);
    setRequiredSkillsText(demoVacancy.requiredSkills.join(", "));
    setCorporateStyle("consulting");
    setParserMeta({
      detectedSections: initialParsedUpload.detectedSections,
      warnings: initialParsedUpload.warnings
    });
    setAdaptationNotes([]);
    setExportMessage(undefined);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Resume processing platform</p>
          <h1>CCRM</h1>
          <p className="lede">
            MVP workbench: import from files or hh.ru JSON, edit facts, adapt
            for a vacancy, configure the corporate template, save locally, and
            export DOCX/PDF.
          </p>
        </div>
        <div className="status-card">
          <span>Source</span>
          <strong>{resume.source.kind}</strong>
          <span>Imported</span>
          <strong>{new Date(resume.source.importedAt).toLocaleDateString()}</strong>
          <button className="secondary-button" type="button" onClick={resetDraft}>
            Reset draft
          </button>
        </div>
      </section>

      <section className="import-panel">
        <div>
          <h2>Manual import</h2>
          <p>
            Upload TXT/DOCX or paste text copied from a resume. The importer
            extracts text and the parser converts it into the same canonical
            model as hh.ru imports.
          </p>
          <label className="file-picker">
            <span>{isImportingFile ? "Importing..." : "Import resume file"}</span>
            <input
              type="file"
              accept=".txt,.md,.docx,.pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              disabled={isImportingFile}
              onChange={handleFileImport}
            />
          </label>
          {fileImportMessage ? <p className="success">{fileImportMessage}</p> : null}
          {fileImportError ? <p className="error">{fileImportError}</p> : null}
        </div>
        <textarea
          aria-label="Resume text"
          value={resumeText}
          onChange={(event) => handleTextChange(event.target.value)}
        />
        {parserMeta.warnings.length > 0 ? (
          <ul className="warnings">
            {parserMeta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p className="success">Parsed without warnings.</p>
        )}
      </section>

      <section className="hh-panel">
        <div>
          <h2>hh.ru JSON import</h2>
          <p>
            Paste a resume payload from the hh.ru API while OAuth integration is
            being wired. The same mapper is used for production API responses.
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setHhJson(JSON.stringify(createDemoHhPayload(), null, 2))}
          >
            Load demo hh.ru payload
          </button>
          <button className="primary-button" type="button" onClick={handleHhJsonImport}>
            Import hh.ru JSON
          </button>
          {hhImportError ? <p className="error">{hhImportError}</p> : null}
        </div>
        <textarea
          aria-label="hh.ru JSON"
          value={hhJson}
          onChange={(event) => setHhJson(event.target.value)}
          placeholder="{ &quot;id&quot;: &quot;...&quot;, &quot;first_name&quot;: &quot;...&quot; }"
        />
      </section>

      <section className="controls-grid">
        <article className="panel">
          <h2>Resume editor</h2>
          <label className="field">
            Full name
            <input
              value={resume.candidate.fullName}
              onChange={(event) =>
                setResume((current) => ({
                  ...current,
                  candidate: {
                    ...current.candidate,
                    fullName: event.target.value || "Unknown candidate"
                  }
                }))
              }
            />
          </label>
          <label className="field">
            Position
            <input
              value={resume.candidate.title ?? ""}
              onChange={(event) =>
                setResume((current) => ({
                  ...current,
                  candidate: {
                    ...current.candidate,
                    title: event.target.value
                  }
                }))
              }
            />
          </label>
          <label className="field">
            Summary
            <textarea
              value={resume.summary ?? ""}
              onChange={(event) =>
                setResume((current) => ({
                  ...current,
                  summary: event.target.value
                }))
              }
            />
          </label>
          <label className="field">
            Confirmed skills
            <textarea
              value={resume.skills.map((skill) => skill.name).join(", ")}
              onChange={(event) =>
                setResume((current) => ({
                  ...current,
                  skills: parseList(event.target.value).map((name) => ({
                    name,
                    confirmedBySource: true
                  }))
                }))
              }
            />
          </label>
        </article>

        <article className="panel">
          <h2>Vacancy and AI adaptation</h2>
          <label className="field">
            Corporate style
            <select
              value={corporateStyle}
              onChange={(event) => setCorporateStyle(event.target.value as CorporateStyle)}
            >
              <option value="consulting">Consulting</option>
              <option value="technical">Technical</option>
              <option value="concise">Concise</option>
            </select>
          </label>
          <label className="field">
            Vacancy title
            <input value={vacancyTitle} onChange={(event) => setVacancyTitle(event.target.value)} />
          </label>
          <label className="field">
            Required skills
            <input
              value={requiredSkillsText}
              onChange={(event) => setRequiredSkillsText(event.target.value)}
            />
          </label>
          <label className="field">
            Vacancy description
            <textarea
              value={vacancyDescription}
              onChange={(event) => setVacancyDescription(event.target.value)}
            />
          </label>
          <button className="primary-button" type="button" onClick={applyAdaptation}>
            Adapt resume safely
          </button>
          {adaptationNotes.length > 0 ? (
            <ul className="success-list">
              {adaptationNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="panel">
          <h2>Template</h2>
          <label className="field">
            Company name
            <input
              value={template.branding.companyName}
              onChange={(event) =>
                setTemplate((current) => ({
                  ...current,
                  branding: {
                    ...current.branding,
                    companyName: event.target.value
                  }
                }))
              }
            />
          </label>
          <label className="field">
            Primary color
            <input
              type="color"
              value={template.branding.primaryColor}
              onChange={(event) =>
                setTemplate((current) => ({
                  ...current,
                  branding: {
                    ...current.branding,
                    primaryColor: event.target.value
                  }
                }))
              }
            />
          </label>
          <div className="section-toggles">
            {template.sections.map((section) => (
              <label key={section.key}>
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(event) =>
                    setTemplate((current) => ({
                      ...current,
                      sections: current.sections.map((item) =>
                        item.key === section.key
                          ? {
                              ...item,
                              enabled: event.target.checked
                            }
                          : item
                      )
                    }))
                  }
                />
                {section.label}
              </label>
            ))}
          </div>
          <div className="export-actions">
            <button className="secondary-button" type="button" onClick={() => exportResume("txt")}>
              Export TXT
            </button>
            <button className="primary-button" type="button" onClick={() => exportResume("docx")}>
              Export DOCX
            </button>
            <button className="primary-button" type="button" onClick={() => exportResume("pdf")}>
              Export PDF
            </button>
          </div>
          {exportMessage ? <p className="success">{exportMessage}</p> : null}
        </article>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>Candidate facts</h2>
          <dl>
            <dt>Name</dt>
            <dd>{resume.candidate.fullName}</dd>
            <dt>Role</dt>
            <dd>{resume.candidate.title}</dd>
            <dt>Contacts</dt>
            <dd>{resume.candidate.contacts.visibility}</dd>
            <dt>Detected sections</dt>
            <dd>{parserMeta.detectedSections.join(", ") || "none"}</dd>
            <dt>Confirmed skills</dt>
            <dd>{resume.skills.map((skill) => skill.name).join(", ") || "none"}</dd>
          </dl>
        </aside>

        <article className="document-preview">
          <header>
            <p>{documentModel.companyName}</p>
            <h2>{documentModel.title}</h2>
            <span>{documentModel.subtitle}</span>
          </header>
          {documentModel.sections.map((section) => (
            <section key={section.key} className="document-section">
              <h3>{section.title}</h3>
              <ul>
                {section.lines.map((line, index) => (
                  <li key={`${section.key}-${index}`}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      </section>
    </main>
  );
}

function loadPersistedDraft(): PersistedDraft | undefined {
  try {
    const value = localStorage.getItem(draftStorageKey);
    return value ? (JSON.parse(value) as PersistedDraft) : undefined;
  } catch {
    return undefined;
  }
}

function cloneDemoTemplate(): typeof demoTemplate {
  return {
    ...demoTemplate,
    branding: {
      ...demoTemplate.branding
    },
    sections: demoTemplate.sections.map((section) => ({
      ...section
    }))
  };
}

function parseList(value: string): string[] {
  return [...new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createDemoHhPayload(): HhResumePayload {
  return {
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
}
