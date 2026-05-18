# CCRM

CCRM is the starting point for a resume processing platform for HR teams. The
product goal is to import resumes from hh.ru or uploaded files, normalize them
into a company-owned resume model, adapt content with AI, and export corporate
DOCX/PDF documents from configurable templates.

## Current implementation slice

This repository now starts as a TypeScript monorepo with:

- shared resume domain types and template configuration primitives;
- an hh.ru resume mapper that converts API-like payloads into the canonical
  model;
- an export package that builds a corporate document view model ready for DOCX
  and PDF renderers;
- a minimal web app demonstrating the first resume-to-template flow.

## Target applications

- **Web app:** shared team workspace for importing, editing, adapting, and
  exporting resumes.
- **Desktop app:** offline-first client that reuses the web UI, stores drafts
  locally, and synchronizes with the backend when online.

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
  desktop/    Desktop requirements and offline shell notes
packages/
  core/       Canonical resume and template domain model
  hh/         hh.ru payload mapping
  export/     Corporate document view-model generation
docs/
  architecture.md
  roadmap.md
```
