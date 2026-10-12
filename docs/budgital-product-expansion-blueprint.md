# Budgital Product Expansion Blueprint

**Purpose:** Explore future product directions before implementation  
**Product:** Budgital by Lumina Metrics by FMR  
**Review status:** Recommendation only — no implementation authorized by this document  
**Date:** 12 October 2026

---

## 1. Recommended direction

Budgital should preserve its strongest product promise:

> **A free, private, browser-first budget app that works without an account, bank connection, or commitment.**

The future architecture should add optional cloud features without weakening that promise.

The recommended model is:

1. **Guest mode remains the default.** Users can use Budgital locally without creating an account.
2. **Optional account mode adds encrypted cloud backup and cross-device restore.** It should never be required for ordinary budgeting.
3. **PWA distribution comes before native app-store distribution.** This gives the audience an installable mobile experience without immediate store fees.
4. **GitHub plus Netlify is appropriate for the audience-testing phase.** Keep the repository private until the product and secrets are ready for public release.
5. **Do not migrate the entire app to SSR immediately.** Use static rendering or a hybrid framework for the public landing and guides, while keeping `/app` as a client-side local workspace.
6. **Receipt scanning and voice entry should be assistive workflows, not automatic financial actions.** Every extracted transaction must be reviewed before saving.
7. **Theme customization should use a small set of curated accessible palettes, not an unrestricted color picker.**

This gives Budgital a low-cost path from a local prototype to a validated product without prematurely creating a paid SaaS backend.

---

## 2. Optional accounts and cloud backup

### 2.1 The key product distinction

A WhatsApp-like experience is not just a login form. It requires:

- User identity.
- A cloud data store.
- Secure session management.
- Ownership checks.
- Backup versioning or sync conflict handling.
- Export and deletion controls.
- Recovery if a device is lost.

Budgital can support this, but it changes the privacy model from “data stays in this browser” to “data stays local unless the user explicitly enables cloud backup.” That distinction must be visible everywhere.

### 2.2 Proposed user modes

#### Guest mode — default

- No account.
- Data remains in browser storage.
- CSV export remains the user’s backup method.
- Works offline after the app shell is cached.
- No cloud copy exists.
- Best mode for privacy-sensitive users and first-time evaluation.

#### Optional cloud-backup mode

- User creates or connects an account.
- Local data is not uploaded until the user explicitly selects **Back up to my account**.
- The app shows the last backup time and backup status.
- User can restore a backup onto another device.
- User can disconnect cloud backup and continue locally.
- User can export and delete their cloud data.

#### Future sync mode

Do not implement full real-time multi-device sync first. Start with an explicit backup/restore model. Full sync introduces conflict resolution, deleted-record handling, timestamps, and offline merge complexity.

### 2.3 Backup-first is safer than sync-first

The first cloud version should behave like this:

```text
Local browser data
        │
        ├── Continue locally
        │
        └── User selects “Back up now”
                │
                └── Encrypted HTTPS request
                        │
                        └── One owned backup snapshot
```

The user should be able to choose:

- Back up now.
- Restore from cloud.
- Download local CSV.
- Delete cloud backup.
- Disconnect account.

This avoids silently merging two devices before Budgital has a mature sync model.

### 2.4 Free backend options

#### Recommended first candidate: Supabase

Supabase currently advertises a free plan with 50,000 monthly active users, 500 MB database size, 1 GB file storage, and 5 GB egress. It includes authentication, anonymous sign-ins, OAuth providers, and basic MFA. Free projects may pause after one week of inactivity and the free plan is limited to two active projects. [1]

Supabase fits Budgital because it provides:

- Auth.
- Postgres row-level security.
- A straightforward JSON backup table.
- Optional object storage.
- A JavaScript client that works well with React.

The free plan is suitable for audience validation, not a permanent promise that cloud backups will always remain free.

#### Alternative: Firebase

Firebase’s Spark plan is no-cost and does not require a payment method. Firebase advertises 50,000 monthly active users for authentication, 1 GiB of Firestore storage, 20,000 document writes per day, 50,000 reads per day, and 10 GiB monthly egress for Firestore. [2]

Firebase is strong if the future roadmap includes:

- Android-first distribution.
- Push notifications.
- Crash reporting.
- Analytics.
- Mobile SDK integration.

Supabase is likely easier for a transparent backup database and SQL-based ownership rules. Firebase is attractive if the native mobile roadmap becomes the priority.

### 2.5 Account methods

Recommended order:

1. Email/password with verified email, if a reliable email delivery method is available.
2. Google sign-in as an optional convenience.
3. Apple sign-in only when iOS distribution is being prepared.
4. Avoid phone-number authentication initially because SMS creates recurring cost and abuse risk.

Do not store passwords directly. Use the provider’s managed authentication system. If a custom auth system is ever built, password hashing, reset tokens, session rotation, and ownership checks become mandatory security work.

### 2.6 Data model proposal

Use an explicit ownership boundary:

```text
users
  id
  created_at
  locale
  theme

budget_backups
  id
  user_id
  created_at
  client_version
  schema_version
  device_label_optional
  encrypted_payload
  payload_checksum

backup_events
  id
  user_id
  backup_id
  action
  created_at
```

For the first release, store one or more versioned backup snapshots rather than synchronizing individual rows.

### 2.7 Cloud privacy requirements

- Display a clear opt-in explanation before the first upload.
- Never upload automatically after account creation.
- Encrypt transport with HTTPS.
- Prefer client-side encryption for backup payloads if the product can provide a safe key-recovery experience.
- If client-side encryption is used, make it clear that losing the recovery secret can make the backup unrecoverable.
- Never log transaction descriptions, receipt images, tokens, or backup payloads.
- Enforce user ownership server-side for every backup operation.
- Add account deletion and cloud-data deletion before public launch.
- Keep local CSV export available even for cloud users.

### 2.8 Recommendation

**Approve optional account creation as a later phase, but start with explicit backup/restore rather than real-time synchronization.**

A completely free pilot is realistic with Supabase or Firebase free tiers, but it is not risk-free. Free projects can pause, quotas can change, and usage can grow beyond the free limits.

---

## 3. GitHub and Netlify publishing strategy

### 3.1 GitHub

GitHub Free for personal accounts supports unlimited public repositories and unlimited private repositories with a limited feature set. It also includes GitHub Actions usage allowances and GitHub Pages for public repositories. [3]

Recommended repository stages:

- **Private repository now:** Protect secrets, unfinished code, research files, and experimental branches.
- **Public repository later:** Publish once secrets are removed, environment variables are documented, licenses are selected, and the code is ready for public inspection.
- Use GitHub Issues or Discussions to collect audience feedback after the public beta.

Never put the Gemini API key, Supabase service-role key, database connection string, or signing secret in GitHub.

### 3.2 Netlify

Netlify currently lists a free plan at $0 with Git deployment, custom-domain support, SSL, CDN delivery, functions, and a 300-credit limit. The free plan is suitable for prototypes and audience testing, but usage is subject to the plan’s credit limits and hard-limit behavior. [4]

Netlify supports connecting a project to a Git provider and deploying from the repository. [5]

### 3.3 Audience-testing recommendation

Use the Netlify-provided subdomain first:

```text
budgital.netlify.app
```

Delay purchasing a custom domain until you have:

- A stable brand name.
- A validated landing page.
- Basic privacy and terms pages.
- A feedback loop.
- A decision about whether the app stays browser-first or becomes a store product.

A custom domain is useful later for trust and SEO, but it is not necessary for the first audience reaction.

### 3.4 Free feedback collection

The landing page can use Netlify Forms for low-volume feedback. Netlify documents that Forms are free and unlimited for credit-based plans, while legacy plans have metered limits. [6]

For the first audience test, collect only:

- Feedback type.
- Message.
- Optional email.
- Locale or device type, if useful.

Do not ask for budget data in a public feedback form.

### 3.5 Recommended publishing sequence

1. Keep GitHub repository private.
2. Connect GitHub to Netlify.
3. Deploy to the Netlify subdomain.
4. Test the public build, forms, PWA installation, and mobile layout.
5. Invite a small audience.
6. Review feedback and usage patterns.
7. Decide whether to keep the repo private or publish it under an open-source license.
8. Purchase a domain only after the product positioning is confirmed.

---

## 4. Android and Apple App Store possibility

### 4.1 The important cost reality

Publishing in both stores cannot be completely free.

Google Play requires a developer registration fee. Google’s official setup guide includes registration, payment of the registration fee, developer account type selection, identity verification, and testing/device-verification requirements. [7] The registration fee is currently listed as **US$25 one time** in the Play Console guidance.

Apple’s Developer Program costs **US$99 per membership year**, with local-currency variation. Apple also requires identity information and, for organizations, additional legal-entity verification. [8]

Therefore:

- **PWA installation:** can be tested without store fees.
- **Android Play Store:** low one-time cost, but not zero cost.
- **Apple App Store:** recurring annual developer-program cost.

### 4.2 Best early path: PWA

Budgital is well suited to a Progressive Web App because it already has:

- A responsive mobile UI.
- Browser-local data.
- A public HTTPS deployment target.
- A need for offline-friendly use.

A PWA needs a web app manifest with a name, icons, start URL, and an appropriate display mode. Chrome’s installability guidance also requires HTTPS and includes engagement criteria for the install prompt. [9]

PWA benefits:

- No store registration fee.
- One codebase.
- Fast audience testing.
- Direct deployment through Netlify.
- Home-screen installation on Android and iOS browsers.
- Easy iteration while the product is still changing.

PWA limitations:

- Installation behavior differs between browsers.
- iOS has stricter platform behavior than Android.
- Background processing and notifications are more limited.
- App-store discovery is not automatic.
- Camera and microphone behavior still depends on browser permissions.

### 4.3 Wrapper strategy: Capacitor later

If the PWA gains traction, Capacitor can package the existing React app for Android and iOS and provide native bridges for:

- Camera.
- Microphone.
- Filesystem.
- Notifications.
- Native share sheet.
- Secure storage.

This is a reasonable route because Budgital already has a web-first UI. It is not a shortcut around store costs or store review.

### 4.4 Recommended store roadmap

1. Deploy the website and PWA first.
2. Test installability with real Android and iPhone users.
3. Add camera and voice workflows in the PWA.
4. Measure whether users repeatedly use the installed experience.
5. Build an Android wrapper first if Android audience demand is strong.
6. Consider iOS after the annual Apple developer cost and review effort are justified.

### 4.5 Store policy considerations

A store version will need:

- Privacy policy.
- Terms of use.
- App description and screenshots.
- Permission explanations for camera and microphone.
- Data-safety disclosures.
- Account deletion if accounts are supported.
- Clear statement that Budgital is a budgeting tool, not regulated financial advice.

---

## 5. Guest use and optional cloud use

This should be a central differentiator, not a compromise.

### Recommended first-run choice

Present two clear paths:

```text
Use Budgital locally
No account. Your data stays in this browser.

Create an optional backup account
Restore your budget across devices.
```

The local path should be visually primary or equally prominent. Do not make account creation feel mandatory.

### Important behavior

- Guest users can use every core budgeting feature.
- Cloud-only features should be clearly marked as optional.
- Local users can export a CSV at any time.
- Account users can disconnect cloud backup and continue locally.
- A user must confirm before local data is uploaded.
- Restoring from cloud should show a warning if it will replace current local data.
- Offer merge only after a real sync model exists.

This supports trust and reduces friction during audience testing.

---

## 6. User-selectable theme colors

### Recommendation: curated themes, not a free color picker

A free-form color picker can create unreadable combinations in dark mode and makes screenshots, branding, and accessibility inconsistent.

Start with four or five curated themes:

1. **Budgital Forest** — current forest and lime identity.
2. **Ocean Signal** — deep navy with cyan accent.
3. **Plum Ledger** — charcoal plum with violet accent.
4. **Sandstone** — warm neutral with terracotta accent.
5. **High Contrast** — stronger text and borders for accessibility.

Each theme should define semantic tokens rather than component-specific colors:

```css
[data-palette='forest'] { ... }
[data-palette='ocean'] { ... }
[data-palette='plum'] { ... }
[data-palette='sandstone'] { ... }
[data-palette='contrast'] { ... }
```

### Requirements

- Persist palette selection locally.
- Optionally sync the palette with the user account later.
- Keep category colors distinguishable from theme colors.
- Check WCAG contrast for text, controls, focus states, and charts.
- Avoid changing the meaning of positive, warning, and negative states.
- Include a preview swatch and theme name.
- Test every palette in light and dark modes.
- Respect `prefers-reduced-motion` when theme transitions animate.

### Recommendation

Add theme palettes after the guest/cloud boundary is stable. Theme customization is useful, but it is less strategically important than data safety, PWA installation, and backup reliability.

---

## 7. Performance and SSR

### 7.1 Does Budgital need full SSR?

The public landing page and educational guides benefit from server-rendered or pre-rendered HTML because they are public, searchable, and answer-engine-facing.

The private `/app` workspace does not gain much from SSR because:

- Its main data lives in browser storage.
- The dashboard depends on client-only state.
- User budgets should not be rendered on a public server.
- The app needs hydration and browser APIs anyway.

Full SSR for the entire app would add complexity without solving the main dashboard’s local-data requirement.

### 7.2 Recommended rendering architecture

Use a hybrid approach:

```text
Public landing page and guides  → static generation / pre-rendered HTML
Private budgeting workspace    → client-side application
Optional account pages         → server-rendered or server-assisted routes
AI, backup, OCR APIs           → serverless/server endpoints
```

### 7.3 Options

#### Option A: Keep Vite and pre-render public routes

Pros:

- Lowest migration risk.
- Keeps current app architecture.
- Works well with Netlify static deployment.
- Good for a small number of landing and guide pages.

Cons:

- Requires maintaining a pre-render step.
- Dynamic localized landing content needs deliberate route generation.

#### Option B: Migrate the public layer to Astro

Pros:

- Excellent static output and small client payloads.
- Good fit for marketing pages and content.
- Interactive sections can remain React islands.

Cons:

- Adds a framework boundary.
- Requires deciding how shared Budgital components cross between Astro and React.

#### Option C: Migrate the whole project to Next.js

Netlify documents support for Next.js App Router, SSR, ISR, Server Components, route handlers, image optimization, and internationalization. [10]

Pros:

- Strong hybrid rendering model.
- Integrated routes, metadata, and server functions.
- Good long-term choice if accounts and APIs become central.

Cons:

- Larger migration.
- More server/client boundaries to manage.
- More complexity for a currently local-first app.
- Requires carefully preserving browser-only storage behavior.

### 7.4 Recommendation

Do not migrate to full SSR now. First optimize the current Vite application and pre-render the public pages. Revisit Next.js or Astro only when one of these becomes true:

- Localized landing pages become numerous.
- Account pages require server rendering.
- Public content becomes a major acquisition channel.
- The current route and metadata system becomes difficult to maintain.

Vite supports SSR, but its SSR API is low-level and requires separate client/server entry points, hydration, production builds, and server integration. [11]

### 7.5 Performance improvements before SSR

Prioritize these first:

- Keep landing and app bundles lazy-loaded by route.
- Keep GSAP and ScrollTrigger lazy-loaded.
- Defer the mascot video until after the first meaningful paint.
- Use poster images and reduced-motion fallbacks.
- Convert screenshots and trust images to AVIF/WebP with responsive sizes.
- Avoid loading all screenshot assets before the carousel needs them.
- Add a service worker for the app shell and static assets.
- Use hashed asset caching for immutable files.
- Keep critical landing HTML and CSS small.
- Remove unused icon imports and large dependencies.
- Measure Core Web Vitals on mobile rather than optimizing only desktop.
- Avoid making the splash screen wait on non-critical JavaScript.

The current project already separates the landing and app bundles and lazy-loads parts of the animation experience. That direction should be preserved.

---

## 8. Receipt, bill, and screenshot capture

### 8.1 Feasibility

Receipt capture is feasible in a browser or PWA using the device camera or file picker. Browser camera access requires user permission through APIs such as `getUserMedia`. [12]

Gemini supports image input and multimodal image understanding. Google’s documentation lists image understanding capabilities and supported image formats including PNG, JPEG, WEBP, HEIC, and HEIF. It recommends clear, correctly rotated images and supports inline image data or uploaded files. [13]

### 8.2 Recommended workflow

```text
Take or upload a picture
          ↓
Crop, rotate, and improve the image locally
          ↓
Extract candidate fields
          ↓
Show editable review form
          ↓
User confirms
          ↓
Save transaction locally
          ↓
Delete temporary image unless the user explicitly keeps it
```

Candidate fields:

- Amount.
- Currency.
- Date.
- Merchant or description.
- Suggested category.
- Optional tax or tip.
.

### 8.3 Local OCR versus Gemini

#### Local OCR

Pros:

- Better privacy.
- Can work offline.
- No per-image API usage.

Cons:

- OCR libraries can be large.
- Accuracy may vary for Sinhala, Tamil, Malayalam, and Arabic.
- Receipt layouts are difficult.
- More device CPU and memory use.

#### Gemini image extraction

Pros:

- Better at mixed layouts and contextual field extraction.
- Can understand receipts, screenshots, and visually irregular documents.
- Easier to prototype.

Cons:

- The image leaves the device.
- API quota and cost can become a concern.
- Extraction may be wrong.
- Sensitive receipt images require explicit consent and retention rules.

### 8.4 Privacy design

- Show a warning before the first upload: “This image will be sent to the AI service for extraction.”
- Compress and resize images before upload.
- Do not retain the original image by default.
- Do not include receipt images in routine cloud backups unless explicitly chosen.
- Rate-limit scan requests.
- Show confidence or missing-field warnings.
- Never save the transaction automatically from model output.
- Keep a manual entry fallback.

### 8.5 Recommendation

Start with a **review-first receipt scanner** using Gemini through the existing server proxy, limited by the project’s AI quota. Later evaluate local OCR for offline and privacy-sensitive use.

Do not begin with full receipt archiving. Begin with “scan to draft a transaction.”

---

## 9. Voice input

### 9.1 Feasibility

The Web Speech API provides speech synthesis and speech recognition. The `SpeechRecognition` interface may use a platform-provided service or, in some environments, on-device recognition. Browser availability and behavior vary, so a fallback is required. [14]

### 9.2 Recommended voice workflow

The user could say:

> “Spent 1,250 rupees on groceries today.”

Budgital should produce a draft:

```text
Type: Expense
Amount: 1,250
Currency: LKR
Category: Groceries
Date: Today
Description: Groceries
```

The user confirms or edits before saving.

### 9.3 Do not auto-save voice results

Voice recognition can mishear:

- Numbers.
- Currency names.
- Dates.
- Category names.
- Place names.
- Sinhala, Tamil, Malayalam, or Arabic terms.

The safe product behavior is:

1. Record.
2. Transcribe.
3. Parse.
4. Show the draft.
5. Require confirmation.
6. Save locally.

### 9.4 Multilingual voice input

The voice feature should use the selected locale as a recognition hint:

```text
si-LK
 ta-LK
 ml-IN
 ar-SA
 en-US
```

These are hints, not guarantees. Each target language must be tested on the specific mobile browsers and operating systems that Budgital intends to support.

### 9.5 Voice privacy

The interface must disclose whether recognition is:

- On-device.
- Browser-provider based.
- Sent to Budgital’s server.
- Sent to Gemini or another transcription provider.

The microphone permission should be requested only after the user taps the microphone action.

### 9.6 Recommendation

Start with English voice input as a controlled beta. Add Arabic, Tamil, Sinhala, and Malayalam only after real-device support testing. The manual form must remain the reliable default.

---

## 10. Suggested development roadmap

### Stage 1 — Audience validation with no account

- GitHub private repository.
- Netlify free deployment.
- Netlify subdomain.
- Guest-only local mode.
- PWA manifest and installable app shell.
- Curated theme palettes.
- Feedback collection.
- Performance measurement.

### Stage 2 — Trust and installability

- Privacy policy and terms refinement.
- Offline shell caching.
- Install instructions for Android and iOS.
- App screenshots and store-style landing content.
- Receipt scan-to-draft experiment.
- English voice-entry experiment.

### Stage 3 — Optional cloud backup

- Supabase or Firebase proof of concept.
- Account creation and sign-in.
- Explicit backup and restore.
- Data ownership rules.
- Cloud deletion and export.
- Backup status and conflict warnings.

### Stage 4 — Multilingual and regional readiness

- Language foundation from the separate localization SOP.
- Arabic RTL support.
- Sinhala, Tamil, and Malayalam translation.
- Localized AI responses.
- Localized landing pages.

### Stage 5 — Native distribution decision

- Review PWA retention and install rates.
- Decide whether Android store distribution justifies the one-time fee.
- Decide whether iOS store distribution justifies the recurring fee.
- Wrap with Capacitor only after the web product is stable.

---

## 11. Recommended decisions for review

### Approve now

- Keep guest mode permanent.
- Use GitHub and Netlify for the free audience-testing stage.
- Ship a PWA before store apps.
- Improve performance without a full SSR migration.
- Design account support as optional explicit backup first.
- Use curated themes rather than arbitrary color selection.
- Treat receipt and voice features as review-first draft assistants.

### Defer

- Real-time multi-device sync.
- Phone-number authentication.
- Receipt image storage.
- Full receipt archive and search.
- Full SSR migration.
- Native app-store distribution before audience validation.
- Automatic transaction creation from OCR or voice.

### Main risks to monitor

- Free-tier limits changing or being exceeded.
- Cloud data privacy expectations becoming unclear.
- OCR errors producing incorrect financial records.
- Voice recognition errors with numbers and South Asian languages.
- App-store fees and review requirements arriving before product-market evidence.
- Account features weakening Budgital’s local-first identity.

---

## 12. Final recommendation

Budgital should evolve in layers:

```text
Fast local web app
        ↓
Installable PWA
        ↓
Optional cloud backup
        ↓
Receipt and voice draft assistants
        ↓
Validated native wrappers
```

This sequence keeps the product free and accessible for early users, while leaving room for accounts, cross-device backup, mobile distribution, and AI-assisted data entry later.

The most important design decision is to make cloud backup **optional and explicit**. Users who want privacy and no account should never feel that they are using an inferior version of Budgital.

---

## References

[1]: https://supabase.com/pricing "Supabase Pricing"
[2]: https://firebase.google.com/pricing "Firebase Pricing"
[3]: https://docs.github.com/get-started/learning-about-github/githubs-products "GitHub's plans"
[4]: https://www.netlify.com/pricing/ "Netlify Pricing"
[5]: https://docs.netlify.com/start/quickstarts/deploy-from-repository/ "Deploy from a repository with Netlify"
[6]: https://docs.netlify.com/manage/forms/usage-and-billing/ "Netlify Forms usage and billing"
[7]: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en "Get started with Play Console"
[8]: https://developer.apple.com/programs/enroll/ "Become a member of the Apple Developer Program"
[9]: https://web.dev/articles/install-criteria "What does it take to be installable?"
[10]: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ "Next.js on Netlify"
[11]: https://vite.dev/guide/ssr "Vite Server-Side Rendering"
[12]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MediaDevices.getUserMedia()"
[13]: https://ai.google.dev/gemini-api/docs/image-understanding "Gemini API image understanding"
[14]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API "Web Speech API"
