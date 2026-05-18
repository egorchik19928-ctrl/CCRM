# Desktop app

The desktop MVP is an Electron shell around the shared web UI. It can run
against the Vite dev server during development or load the built web bundle from
`apps/web/dist` for offline use.

## Commands

```bash
npm run dev:web
npm run dev -w @ccrm/desktop
```

For offline desktop startup:

```bash
npm run build -w @ccrm/web
npm run start -w @ccrm/desktop
```

## Offline responsibilities

- Store resumes, templates, source files, and generated drafts locally.
- Allow editing and template application without network access.
- Export DOCX/PDF from local data and cached templates.
- Queue online-only operations for later synchronization:
  - hh.ru import and refresh;
  - cloud AI rewriting;
  - server-side audit and backup updates.

## First implementation tasks

1. Replace browser localStorage with an explicit desktop storage adapter when
   multiple local profiles are needed.
2. Add native file system save dialogs for generated DOCX/PDF files.
3. Implement a sync queue with explicit pending/failed/synced states.
4. Add packaging scripts for target operating systems.
