# Desktop app

The desktop application is planned as a Tauri shell around the shared web UI.
This folder starts with offline requirements so the web and domain packages are
designed with desktop reuse in mind from the beginning.

## Offline responsibilities

- Store resumes, templates, source files, and generated drafts locally.
- Allow editing and template application without network access.
- Export DOCX/PDF from local data and cached templates.
- Queue online-only operations for later synchronization:
  - hh.ru import and refresh;
  - cloud AI rewriting;
  - server-side audit and backup updates.

## First implementation tasks

1. Add a Tauri 2 shell that loads `apps/web`.
2. Add local persistence through SQLite or a file-backed adapter.
3. Implement a sync queue with explicit pending/failed/synced states.
4. Reuse `@ccrm/core`, `@ccrm/hh`, and `@ccrm/export` in the desktop UI.
