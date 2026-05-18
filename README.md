# CCRM

CCRM is the starting point for a resume processing platform for HR teams. The
product goal is to import resumes from hh.ru or uploaded files, normalize them
into a company-owned resume model, adapt content with AI, and export corporate
DOCX/PDF documents from configurable templates.

## Current implementation slice

This repository now starts as a TypeScript monorepo with:

- shared resume domain types and template configuration primitives;
- a safe AI-adaptation package that rewrites presentation text without changing
  factual resume fields;
- an hh.ru resume mapper that converts API-like payloads into the canonical
  model;
- a browser file importer with TXT and DOCX text extraction;
- a text resume parser for manual uploads and future DOCX/PDF text extraction;
- an export package that builds a corporate document view model ready for DOCX
  and PDF renderers, plus MVP browser DOCX/PDF generation;
- a minimal web app demonstrating the first resume-to-template flow.

## Target applications

- **Web app:** shared team workspace for importing, editing, adapting, and
  exporting resumes.
- **Desktop app:** Electron shell that reuses the web UI, stores MVP drafts
  locally through the browser storage layer, and can load the built web bundle
  offline.

## Commands

```bash
npm install
npm run test
npm run typecheck
npm run build
npm run dev:web
```

## Repository layout

```text
apps/
  web/        Minimal React/Vite web surface for the first flow
  desktop/    Electron desktop shell for offline MVP usage
packages/
  ai/         Safe corporate/vacancy adaptation primitives
  core/       Canonical resume and template domain model
  hh/         hh.ru payload mapping
  import/     Browser file import and text extraction
  parser/     Text resume parsing for manual/upload flows
  export/     Corporate document view-model generation
docs/
  architecture.md
  roadmap.md
```
