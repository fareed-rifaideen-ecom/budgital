# Budgital initial-request audit

**Audit date:** 15 October 2026  
**Live site:** https://budgital.netlify.app  
**Scope:** Review of the original Budgital requirements against the current pilot implementation and documented roadmap.

## Executive summary

The core local-first budgeting product is implemented and deployed. The current pilot supports budgeting, transactions, categories, CSV import/export, multi-currency tracking, Gemini insights/chat, onboarding consent, PWA installation, responsive layouts, landing-page SEO content, and Netlify Forms.

The remaining work falls into three groups:

1. **Small operational tasks:** Netlify email notification and the Netlify badge setting.
2. **Pilot hardening:** AI transparency, onboarding clarity, storage/backup safety, accessibility, and performance measurement.
3. **Future product phases:** optional cloud backup, receipt scanning, voice entry, localization, curated themes, and native store packaging.

## Current status by original request

| Area | Status | Notes |
|---|---|---|
| Log income and expenses | Complete | Transaction modal supports income and expense entries. |
| Categories and monthly budgets | Complete | Categories, budget envelopes, remaining amounts, and over-budget messaging are present. |
| Dashboard | Complete | Shows income, spending, budget usage, remaining amount, recent activity, category chart, trend chart, and insights. |
| Month-over-month trend | Complete | Trend chart and period comparison are implemented. |
| Plain-English insights | Complete | Deterministic local insights are available; Gemini adds AI insights when configured. |
| CSV import/export | Complete | Import preview and validation are implemented; export preserves the local budget data model. |
| Browser-local data | Complete | Core budget and transaction data remain in local storage; no account is required. |
| Multi-currency support | Complete | USD, EUR, GBP, LKR, INR, AUD, CAD, JPY, AED, SAR, and PHP are supported. |
| Default currency selection | Complete | First-run consent flow asks for the default currency; the selection is shown in the dashboard and used for new entries. |
| Currency conversion | Pilot complete | Gemini-assisted rates are available with manual-rate fallback and warnings. Rates remain estimates and should be verified. |
| AI insights and follow-up chatbot | Complete | Floating chatbot, follow-up questions, usage limits, and server-side Gemini proxy are implemented. User has confirmed Gemini is working. |
| Light/dark theme | Complete | Two-mode theme with system-default initial selection and mobile toggle corrections. |
| Apple-like glass UI | Complete | Glass panels, gradients, responsive layout, motion, and theme-aware styling are implemented. |
| Fast loading and splash screen | Pilot complete | Splash/logo animation, lazy-loaded routes, deferred non-critical media, PWA shell, and caching are present. Further measurement is still needed. |
| Budgital branding and logo | Complete | Light/dark brand marks and fallback handling are implemented. |
| Author information | Complete | Lumina Metrics by FMR, Fareed M. Rifaideen, website, GitHub, LinkedIn, and Buy Me a Coffee links are present. |
| Landing page | Complete | Separate landing page with CTA, app screenshots, FAQ, author section, feedback form, responsive theme, and interactive motion. |
| SEO/AEO/GEO | Pilot complete | Metadata, FAQ-style answers, semantic content, landing-page structure, and citation-oriented content are present. Ongoing measurement and content expansion remain. |
| GSAP mascot interaction | Complete for pilot | Scroll-driven mascot/video treatment and reduced-motion fallback are implemented. |
| Static real-app screenshots | Complete | Landing page uses app screenshots rather than embedding the live app interaction. |
| Mobile/tablet optimization | Pilot complete | App header, chat sheet, charts, controls, and layouts received responsive fixes. Real-device testing should continue. |
| Tutorial/guideline | Complete | “How Budgital works” guidance is available in the app. |
| Terms/disclaimer/consent | Complete | Pre-use agreement gate and legal/disclaimer access are implemented. |
| Feedback and inquiry forms | Complete | Landing and app forms submit to the detected `budgital-feedback` Netlify Form. Connector verification shows one submission. |
| Email notification for forms | **Pending** | Netlify MCP can verify forms and submissions but does not expose notification-recipient configuration. Requires Netlify UI/API access and a recipient email. |
| Netlify badge removal | Pending operational setting | Must be disabled in Netlify project settings; it is not controlled by the Budgital source code. |

## Immediate operational tasks

### 1. Netlify Forms email notification

The Netlify connector currently verifies:

- Form: `budgital-feedback`
- Status: enabled and detected
- Fields: `kind`, `email`, `message`, `page`, `createdAt`
- Submission count: 1

The available connector operations cover form detection, form enable/disable, and submission management. They do not include notification-recipient settings. Configure this in Netlify:

1. Open **Budgital → Project configuration → Notifications**.
2. Create a **Form submission** notification.
3. Select `budgital-feedback` or all form submissions.
4. Enter the desired recipient email address.
5. Save and submit one test form.
6. Confirm the email arrives and that the submission remains in the Forms dashboard.

### 2. Remove the Powered by Netlify badge

Open **Budgital → Project configuration → General/Build settings** and disable **Powered by Netlify badge**. This is a project-level Netlify setting, not an application code change.

## Recommended next implementation: pilot hardening

These changes provide more value than immediately adding accounts or native apps:

1. Add an AI transparency panel showing that only aggregate budget summaries are sent to Gemini, not the full local transaction history.
2. Show daily AI usage and a clear fallback when AI is unavailable or rate-limited.
3. Make the local-only promise more visible during onboarding and in the data page.
4. Add a visible one-click local backup/export reminder.
5. Add storage usage information and a safer clear-data confirmation with export guidance.
6. Improve CSV duplicate detection and import conflict messaging.
7. Run Lighthouse and real-device checks on slower Android phones and iOS Safari.
8. Verify keyboard focus, screen-reader labels, color contrast, reduced motion, and chart readability.
9. Review landing-page image sizes and mascot loading against Core Web Vitals.

## Deferred product phases

### Optional accounts and backup

Recommended architecture:

- Guest/local mode remains the default.
- Optional Supabase authentication.
- Explicit “Back up now” and “Restore backup” actions.
- Versioned backup snapshots rather than real-time sync.
- Clear opt-in before the first upload.
- Cloud export, deletion, disconnect, and ownership enforcement.

Do not silently upload local data after account creation, and do not start with multi-device real-time sync.

### Receipt and bill scanning

Implement as a review-first workflow:

1. Take or upload a receipt image.
2. Crop/compress locally.
3. Send only after clear consent if Gemini extraction is used.
4. Extract amount, date, merchant, currency, and category as a draft.
5. Let the user edit and confirm.
6. Save the transaction locally.
7. Delete the temporary image by default.

Never create a transaction automatically from OCR output.

### Voice entry

Start with English as a controlled beta:

1. User taps the microphone.
2. Record/transcribe.
3. Parse amount, currency, date, category, and description.
4. Show an editable transaction draft.
5. Require confirmation before saving.

Keep manual entry as the reliable default. Add Sinhala, Tamil, Malayalam, and Arabic only after testing actual target browsers and devices.

### Localization

Before translating, refactor hardcoded strings into translation keys. Then add:

- Sinhala (`si-LK`)
- Tamil (`ta-LK`)
- Malayalam (`ml-IN`)
- Arabic (`ar-SA`)

Arabic requires a genuine RTL pass for layout, navigation, charts, dates, numbers, and typography. AI responses and landing-page content also need locale-aware treatment.

### Curated color palettes

Keep Light/Dark as the primary theme controls. Later add accessible curated palettes rather than a free-form picker:

- Budgital Forest
- Ocean Signal
- Plum Ledger
- Sandstone
- High Contrast

Persist palettes locally and test every palette in both light and dark modes.

### SSR and public-page performance

Do not migrate the entire application to SSR now. The private local workspace depends on browser storage and client state. If SEO/content demand grows, pre-render public landing and guide routes while keeping `/app` client-side. Consider Astro or Next.js only when the public content or account layer justifies the migration.

### Android and Apple distribution

Continue with the installable PWA first. Measure installation and repeat usage. Package with Capacitor only after the web product is stable and demand justifies store fees, permissions, review, privacy disclosures, and ongoing maintenance.

## Recommended order of work

1. Configure and test the Netlify email notification manually because the current MCP surface does not support it.
2. Disable the Netlify badge.
3. Implement pilot hardening: AI transparency, onboarding clarity, storage/export safety, accessibility, and performance measurement.
4. Run a small audience-validation cycle and review feedback themes.
5. Implement optional account backup only if users request cross-device recovery.
6. Add receipt scan-to-draft and English voice-entry experiments.
7. Refactor for localization, then add languages and Arabic RTL.
8. Reassess curated themes and native packaging after usage evidence.

## Product boundary to preserve

> Budgital should remain a free, private, browser-first budgeting app that works without an account, bank connection, or commitment.

Cloud backup, AI extraction, voice input, and native distribution should remain explicit opt-in layers and should never make local users feel like they are using an inferior version of the product.
