# Development roadmap

## Slice 1: domain and import foundation

- Define the canonical resume model.
- Define configurable template primitives.
- Convert hh.ru-like data into the canonical model.
- Produce a corporate document view model from a resume and template.
- Show the first flow in a minimal web application.

## Slice 2: upload and parsing

- Add DOCX/PDF upload.
- Extract text and metadata.
- Normalize parsed content into the canonical model.
- Preserve the original file and extracted facts separately.

## Slice 3: AI processing

- Add AI adapters behind a provider interface.
- Generate corporate summaries and experience bullets.
- Add vacancy-specific adaptation.
- Enforce fact preservation for dates, companies, roles, contacts, and skills.

## Slice 4: configurable templates and export

- Build a template editor for branding, section order, labels, and visibility.
- Add DOCX rendering from the document view model.
- Add PDF export.
- Support multiple templates for different roles or clients.

## Slice 5: hh.ru production integration

- Add OAuth.
- Import resumes from the employer account.
- Handle hidden/restricted contacts.
- Respect API limits and persistence rules.
- Add refresh/reimport flows.

## Slice 6: desktop offline mode

- Wrap the shared UI in a Tauri desktop shell.
- Add local persistence.
- Add local export.
- Add sync queue and conflict handling.
- Clearly label online-only actions such as hh.ru import and cloud AI.

## Slice 7: operations and governance

- Add authentication for 10 full-access users.
- Add audit logs.
- Add encrypted file storage.
- Add retention and deletion flows for personal data.
- Add backup and monitoring basics.
