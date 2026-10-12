# Budgital free pilot deployment

## What this phase delivers

- A browser-first app that remains usable without an account or cloud backup.
- Installable PWA metadata and a conservative service worker for repeat visits.
- Local 192px and 512px install icons.
- Netlify build configuration with `/app` SPA routing and a server-only Gemini Function adapter.
- Immutable caching for hashed assets and revalidated HTML.

## Netlify setup

1. Push the project to a GitHub repository.
2. In Netlify, choose **Add new project → Import an existing project → GitHub**.
3. Use the repository root as the base directory. The committed `netlify.toml` supplies the build command and publish directory.
4. Add these environment variables in Netlify site settings:
   - `GEMINI_API_KEY` — optional; omit it if the free pilot should run without AI.
   - `GEMINI_MODEL` — optional, default `gemini-flash-lite-latest`.
   - `GEMINI_DAILY_PROJECT_LIMIT` — optional, default `120`.
5. Deploy a branch preview first. Test `/`, `/app`, `/manifest.webmanifest`, `/sw.js`, CSV import/export, and the optional AI route before using a custom domain.

## Important product boundary

Budgital is still local-first in this phase. Do not describe Netlify as storing user budgets: the site serves the application, while working transactions and budgets remain in the browser. Account sync and cloud backup are deliberately deferred until there is audience evidence and a reviewed data-retention design.

## Suggested pilot sequence

- Start with the free Netlify URL and a GitHub repository.
- Invite a small group to test on Android, iOS Safari, desktop Chrome, and a slower mobile connection.
- Measure install attempts, first transaction completion, return visits, CSV export use, and feedback themes before adding accounts or paid infrastructure.
- Keep the Gemini key server-side and treat AI as optional. If the key is absent, the deterministic local insights still work.
