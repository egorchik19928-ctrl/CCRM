import { buildCorporateResumeDocument } from "@ccrm/export";
import { demoResume, demoTemplate, demoVacancy } from "./demoData";
import "./styles.css";

const document = buildCorporateResumeDocument({
  resume: demoResume,
  template: demoTemplate,
  vacancy: demoVacancy
});

export function App() {
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
          <strong>{demoResume.source.kind}</strong>
          <span>Imported</span>
          <strong>{new Date(demoResume.source.importedAt).toLocaleDateString()}</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>Candidate facts</h2>
          <dl>
            <dt>Name</dt>
            <dd>{demoResume.candidate.fullName}</dd>
            <dt>Role</dt>
            <dd>{demoResume.candidate.title}</dd>
            <dt>Contacts</dt>
            <dd>{demoResume.candidate.contacts.visibility}</dd>
            <dt>Confirmed skills</dt>
            <dd>{demoResume.skills.map((skill) => skill.name).join(", ")}</dd>
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
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      </section>
    </main>
  );
}
