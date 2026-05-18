import { type ChangeEvent, useMemo, useState } from "react";
import { buildCorporateResumeDocument } from "@ccrm/export";
import { UnsupportedResumeFileError, importResumeFromBrowserFile } from "@ccrm/import";
import { parseTextResume } from "@ccrm/parser";
import { demoPlainTextResume, demoResume, demoTemplate, demoVacancy } from "./demoData";
import "./styles.css";

export function App() {
  const [resumeText, setResumeText] = useState(demoPlainTextResume);
  const [sourceFileName, setSourceFileName] = useState("manual-import.txt");
  const [fileImportMessage, setFileImportMessage] = useState<string>();
  const [fileImportError, setFileImportError] = useState<string>();
  const [isImportingFile, setIsImportingFile] = useState(false);
  const parsedUpload = useMemo(
    () =>
      parseTextResume({
        text: resumeText,
        fileName: sourceFileName,
        importedAt: new Date("2026-05-18T00:00:00.000Z")
      }),
    [resumeText, sourceFileName]
  );
  const activeResume = resumeText.trim() ? parsedUpload.resume : demoResume;
  const document = useMemo(
    () =>
      buildCorporateResumeDocument({
        resume: activeResume,
        template: demoTemplate,
        vacancy: demoVacancy
      }),
    [activeResume]
  );

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

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Resume processing platform</p>
          <h1>CCRM</h1>
          <p className="lede">
            First vertical slice: hh.ru payload normalization, corporate
            template configuration, and a document view model ready for DOCX/PDF
            renderers.
          </p>
        </div>
        <div className="status-card">
          <span>Source</span>
          <strong>{activeResume.source.kind}</strong>
          <span>Imported</span>
          <strong>{new Date(activeResume.source.importedAt).toLocaleDateString()}</strong>
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
          onChange={(event) => setResumeText(event.target.value)}
        />
        {parsedUpload.warnings.length > 0 ? (
          <ul className="warnings">
            {parsedUpload.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p className="success">Parsed without warnings.</p>
        )}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>Candidate facts</h2>
          <dl>
            <dt>Name</dt>
            <dd>{activeResume.candidate.fullName}</dd>
            <dt>Role</dt>
            <dd>{activeResume.candidate.title}</dd>
            <dt>Contacts</dt>
            <dd>{activeResume.candidate.contacts.visibility}</dd>
            <dt>Detected sections</dt>
            <dd>{parsedUpload.detectedSections.join(", ") || "none"}</dd>
            <dt>Confirmed skills</dt>
            <dd>{activeResume.skills.map((skill) => skill.name).join(", ") || "none"}</dd>
          </dl>
        </aside>

        <article className="document-preview">
          <header>
            <p>{document.companyName}</p>
            <h2>{document.title}</h2>
            <span>{document.subtitle}</span>
          </header>
          {document.sections.map((section) => (
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
