# Budgital pilot hardening audit

**Audit date:** 16 October 2026  
**Repository commit reviewed:** `9d518d0` (`Fix Netlify Forms detection and feedback submission`)  
**Production site checked:** https://budgital.netlify.app  
**Build result:** `pnpm build` passed successfully.

## Overall result

Pilot hardening is **partially complete and already stronger than the original pilot baseline**. The implementation includes AI data-boundary messaging, a local-only data explanation, a daily AI limit, retry/error states, CSV preview validation, clear-data confirmation, PWA caching, lazy route loading, lazy screenshot media, reduced-motion handling, and many accessibility labels.

The remaining work is mainly:

- Resolve one privacy-copy contradiction in the Data page.
- Add a visible storage-usage indicator.
- Add explicit export-before-clear guidance.
- Add CSV duplicate/conflict detection.
- Improve AI quota/error transparency beyond the current basic messaging.
- Complete real-device, accessibility, and Core Web Vitals testing.

## Production checks

The following live routes returned HTTP 200 during the audit:

- `/`
- `/app`
- `/manifest.webmanifest`
- `/sw.js`

The production bundle did not contain the old normal-path `Save note locally` label or the Netlify badge text. The local fallback message still exists intentionally and appears only if Netlify cannot receive a form submission.

## Implemented hardening features

### AI data transparency — Implemented

The AI conversation includes a clear boundary message:

> “Only totals, category totals, and your local insights are sent. Individual transactions and descriptions stay in this browser.”

The landing page also explains that only aggregate totals and category totals are sent to Gemini. The AI disclaimer identifies Gemini output as optional and not financial advice.

**Evidence:** `src/App.tsx`, `src/LandingPage.tsx`

### Daily AI usage limit — Implemented

The app tracks daily AI usage locally, displays remaining requests in the chatbot, blocks requests when the limit is reached, and resets the local usage window by day. Failed AI requests release the consumed usage slot.

The app also supports the configured project limit through the server-side Gemini function.

**Evidence:** `src/App.tsx`, `server/gemini.mjs`, `netlify/functions/gemini.mjs`

### AI failure, retry, and fallback states — Mostly implemented

Implemented:

- Human-readable AI errors.
- Retry for initial insights.
- Retry for failed follow-up questions.
- Daily-limit error.
- Exchange-rate failure messaging.
- Manual exchange-rate entry.
- Deterministic local insights that do not require Gemini.

Remaining polish:

- Add a more explicit distinction between an API-key/configuration failure, a temporary provider failure, and a daily-limit failure.
- Show the last successful AI request time or a small status indicator.
- Consider an explicit “Use local insights only” action so users can turn off AI without relying on the disclaimer.

**Evidence:** `src/App.tsx` AI request and conversation components.

### Local-first privacy messaging — Implemented, with one inconsistency

Implemented:

- Onboarding says working data stays in the browser.
- Data page has a “Local-only storage” badge.
- Tutorial says working data stays in the browser.
- Feedback copy says budget transactions and financial data are not included in feedback submissions.
- Landing page explains no account and no bank connection.

Issue found:

The Data page currently says:

> “Budgital does not send your numbers anywhere.”

That sentence is too broad because optional AI sends aggregate totals and category totals to Gemini. The AI modal correctly explains the boundary, but the Data page should say something like:

> “Your working data stays in this browser. If you ask Budgital AI, only aggregate totals and category totals are sent for that request.”

**Evidence:** `src/App.tsx` `DataView` and `AiConversation`.

### Export and local backup — Implemented

Implemented:

- Full CSV export.
- Export includes transactions, categories, budgets, currencies, and exchange-rate metadata.
- Data page labels export as a backup.
- Tutorial directs users to keep a portable copy.

Remaining polish:

- Add a visible “Export before clearing” reminder in the clear-data flow.
- Add the last-export timestamp or a small confirmation after export.
- Consider a versioned JSON backup later if CSV becomes insufficient for future schema changes.

### Clear-data safety — Partially implemented

Implemented:

- Browser confirmation dialog.
- Clear operation preserves selected currency settings.
- Starter/demo data has a separate clear action.
- Clear controls are located on the Data page rather than the main dashboard.

Remaining:

- The confirmation does not offer or require an export first.
- The confirmation does not state exactly what is removed: transactions, budgets, and demo state.
- There is no undo or recovery path after clearing.

Recommended improvement:

> “This removes all local transactions and budgets from this browser. Export a backup first if you may need the data later.”

### Storage usage information — Not implemented

The Data page explains local storage but does not show how much browser storage Budgital is using or whether the browser storage estimate is available.

Recommended implementation:

- Use `navigator.storage?.estimate()` when available.
- Display approximate usage and quota.
- Explain that browser storage can be cleared by the user or browser settings.
- Keep the value informational rather than blocking normal usage.

### CSV validation — Implemented, but duplicate/conflict detection is missing

Implemented:

- CSV preview before saving.
- Date validation.
- Amount validation.
- Category validation.
- Currency validation against the supported list.
- Separate handling for category and budget metadata rows.
- Invalid rows are excluded from the import action.
- Existing transaction IDs are replaced through a map, preventing duplicate IDs from being stored twice.

Remaining:

- The importer does not detect likely duplicate transactions when IDs are absent or changed.
- There is no explicit summary of “new records,” “updated records,” and “possible duplicates.”
- There is no conflict-resolution choice for matching date, amount, category, and description.

Recommended first version:

- Identify exact ID matches as updates.
- Flag likely duplicates using date + amount + category + description.
- Let the user choose “skip,” “import anyway,” or “replace.”

### Accessibility — Partially implemented; formal audit pending

Implemented evidence:

- Many icon-only buttons have `aria-label` values.
- Tutorial, feedback, and legal modals use dialog semantics.
- Screenshot carousel uses tab roles and selected state.
- Form controls use visible labels in most important flows.
- Focus styles exist for inputs and controls.
- Reduced-motion media queries are present across app and landing styles.
- Decorative images and screenshot assets use alt text or empty alt where appropriate.

Still pending:

- Keyboard-only walkthrough of onboarding, navigation, modals, carousel, chatbot, and import flow.
- Focus trapping and focus restoration for modals.
- Screen-reader verification of live status messages and chart summaries.
- Contrast measurement for all Light/Dark combinations and chart colors.
- Verification of touch target sizes on small mobile screens.

### Performance — Good implementation direction; measurement pending

Implemented evidence:

- Landing and app routes are lazy-loaded with React `lazy` and `Suspense`.
- Mascot video uses `preload="metadata"`.
- First screenshot is eager; other screenshots are lazy-loaded.
- PWA service worker caches the app shell and static assets.
- Hashed assets use immutable caching in `netlify.toml`.
- HTML is revalidated rather than cached indefinitely.
- Reduced-motion fallbacks are present.
- Scroll and animation features are separated into their own chunks.

Current production bundle sizes from the successful build:

- Main index chunk: approximately 224.5 kB before gzip, 70.4 kB gzip.
- GSAP chunk: approximately 70.0 kB before gzip, 27.4 kB gzip.
- App chunk: approximately 79.0 kB before gzip, 21.9 kB gzip.
- Landing chunk: approximately 32.7 kB before gzip, 9.6 kB gzip.

Remaining:

- Run Lighthouse against the production URL.
- Record LCP, CLS, INP, TTFB, and total transfer size on mobile.
- Test a slower Android device and iOS Safari.
- Check the first-load experience with a cold cache and a disabled service worker.
- Optimize only after measurements identify the largest bottleneck.

### Feedback workflow — Implemented

Netlify Forms is active and email notifications are configured for `budgital-feedback`.

The form includes:

- Feedback type.
- Optional email.
- Required message.
- Landing/app page context.
- Submission timestamp.

The email field also supports replying to the submitter through the notification Reply-to value.

The local fallback remains intentionally available if Netlify cannot receive a submission. It should not be described as the normal success path.

## Priority classification

### P0 — Fix before the next public pilot round

1. Correct the Data page privacy sentence so it does not conflict with optional Gemini usage.
2. Improve the clear-data confirmation with explicit export-before-clear wording.
3. Run a real-device smoke test for the mobile app shell, chatbot, forms, and import flow.
4. Run Lighthouse and record the baseline metrics.

### P1 — Recommended next implementation

1. Add browser storage usage information.
2. Add CSV duplicate/conflict detection.
3. Add explicit AI mode controls: AI on/off and local-only insights.
4. Improve AI error classification and status messaging.
5. Add export confirmation and last-export timestamp.
6. Complete keyboard, screen-reader, and contrast review.

### P2 — Later product phases

- Optional cloud backup and accounts.
- Receipt scan-to-draft.
- Voice transaction drafts.
- Localization and Arabic RTL.
- Curated color palettes.
- Native Android/iOS packaging.
- Full SSR or framework migration.

## Conclusion

Budgital already meets most of the Pilot Hardening and Polish requirements at the implementation level. The most important concrete issue discovered in this audit is not a data-handling bug; it is an overly broad privacy sentence in the Data page. The next meaningful engineering pass should focus on precise privacy copy, safer clear-data guidance, storage visibility, duplicate-aware CSV imports, and measured accessibility/performance testing rather than a large architectural rewrite.
