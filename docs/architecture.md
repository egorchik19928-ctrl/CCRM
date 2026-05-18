# Architecture

## Product scope

CCRM processes candidate resumes for both internal review and client-facing
presentation. The platform must support:

- hh.ru import through an employer account;
- manual DOCX/PDF upload;
- AI-assisted rewriting and vacancy-specific adaptation;
- configurable company resume templates;
- DOCX and PDF export;
- web collaboration for about 10 full-access users;
- desktop offline work with local drafts and later synchronization.

## System shape

```text
apps/web
apps/desktop
    |
    v
Backend API
    |
    +-- hh.ru integration
    +-- resume parsing
    +-- AI processing
    +-- template management
    +-- DOCX/PDF rendering
    +-- audit log
    +-- PostgreSQL + object storage
```

The repository starts with frontend-safe TypeScript packages that can be reused
by web, desktop, and backend services.

## Shared domain model

The core package owns canonical resume facts: personal data, summary, skills,
experience, projects, education, certifications, and languages. External
providers such as hh.ru are mapped into this model before AI or template logic
touches the content.

This separation is intentional: factual fields can be protected from AI
rewrites, while presentation text can still be adapted to a corporate style or
vacancy.

## Offline desktop direction

The desktop application should reuse the web UI and add local capabilities:

- SQLite or file-backed local persistence for resumes, templates, and drafts;
- local template rendering for already available templates;
- DOCX/PDF export without a network connection;
- a sync queue for hh.ru imports, AI tasks, and server updates.

AI through a cloud provider and hh.ru imports require online mode. If full
offline AI becomes mandatory, it should be added as an optional local model
runtime behind the same AI adapter interface.

## Template direction

Templates are represented as structured configuration first: identity, branding,
section order, visibility, and labels. Concrete DOCX/PDF renderers can consume
the same document view model produced by the export package.

The first renderer should target DOCX. PDF can follow either by converting DOCX
server-side or by rendering the same view model through an HTML/PDF renderer.

## hh.ru direction

The hh.ru package starts with a mapper for API-like resume payloads. The next
step is an authenticated provider:

- OAuth token handling;
- resume search/import endpoints;
- API limit and error normalization;
- explicit handling for restricted contacts;
- audit metadata for source URLs and import timestamps.
