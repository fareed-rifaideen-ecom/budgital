# Budgital differentiation and discoverability plan

## Product direction

Budgital stays a focused, browser-local budget app rather than becoming a bank-aggregation or wealth-management suite. The differentiator is: **free monthly budgeting without account linking, with portable CSV workflows, transparent local insights, dark mode, and optional aggregate-only Gemini assistance**.

## Design direction

- **Movement:** Calm editorial finance dashboard with an “ambient operating system” feel: soft canvas, dark ink, lime signal color, and compact data cards.
- **Principles:** Explain before optimizing; keep the data boundary visible; use motion only to orient; make the next action small and obvious.
- **Color philosophy:** Ink green signals trust and focus; lime marks progress and positive action; peach marks attention without alarm; dark mode uses deep forest surfaces so charts and text remain legible.
- **Layout paradigm:** A persistent rail on desktop, compact mobile top bar, asymmetrical hero dashboard, and a public answer-first guide layer beneath the product shell.
- **Signature elements:** Orbit-style budget progress, plain-English insight rows, and the “saved locally” pulse.
- **Interaction:** Month switching, inline budget editing, CSV preview, and AI consent all keep the user in control; AI is never the only way to understand the data.
- **Animation:** Subtle lift on actions, progress transitions, and a restrained loading orbit for AI; no looping decorative motion.
- **Typography:** Manrope for friendly product copy and DM Mono for small chart/CSV numerals.
- **Brand essence:** A calm, private monthly budget for people who want clarity without a financial super-app. Personality: clear, grounded, quietly capable.
- **Brand voice:** Direct, non-judgmental, concrete. Example lines: “Your money, in plain English.” and “Only month totals leave the browser.”
- **Wordmark / mark:** A rounded “B” tile with a cut corner, echoing a budget page tab and a small forward motion.
- **Signature color:** Budgital lime `#c8ee68`.

## Implementation

- Persist the selected theme (`light` or `dark`) alongside browser-local app data.
- Keep deterministic local insights as the baseline. Add an optional `/api/gemini/insights` server proxy that validates and caps an aggregate-only payload, reads `GEMINI_API_KEY` from the managed secret store, and returns a small structured JSON result. No client-side key and no raw transaction descriptions are sent.
- Add a production Node server for the Gemini route plus static output serving; keep a Vite middleware for Preview.
- Add crawlable home copy, `robots.txt`, `sitemap.xml`, public guide pages for monthly budgeting, bank-free budgeting, method comparison, and private AI budgeting, plus JSON-LD and internal links.
- Keep the public content synchronized with the product promise and explicitly disclose free-tier Gemini data-use caveats in the research documentation.

## Project structure

- `src/App.tsx` — local data model, dashboard views, theme state, AI action, and modals.
- `src/styles.css` — responsive product system, dark-mode tokens, AI states, and public content shell.
- `server/gemini.mjs` — shared validated Gemini proxy handler.
- `server.mjs` — production static server and API entry point.
- `public/learn/*` — answer-first, indexable guides.
- `public/robots.txt`, `public/sitemap.xml`, `public/manus-routes.json` — crawl and route declarations.
- `docs/competitor-research.md` — competitor gaps and differentiation evidence.
- `docs/seo-ai-research.md` — verified Google/Gemini/GEO guidance and keyword clusters.

## Iteration 2 — theme, AI conversation, dates, and mobile

### Scope

Address the reported theme, contrast, AI, date-filtering, and mobile/tablet problems without changing the local-first data model, the CSV contract, or the privacy boundary of the AI proxy.

### Implementation

- **Theme system.** Replace the three-way theme with two states (`light`, `dark`). `loadTheme` falls back to `window.matchMedia('(prefers-color-scheme: dark)')` when nothing is stored, a small inline script in `index.html` applies `data-theme` before first paint, and the React effect persists the choice and updates `theme-color`. `applyTheme` animates the switch with `document.startViewTransition` and a clip-path circle expanding from the switch position, with a short cross-fade fallback and a `prefers-reduced-motion` opt-out.
- **Design tokens.** Every light-mode color in `styles.css` was replaced with semantic variables (surfaces, lines, text tiers, accent, hero, solid/on-solid, state colors). The dark palette is defined once on `html[data-theme='dark']`, so components inherit rather than needing per-element overrides. `--solid`/`--on-solid` keep primary buttons readable in both themes, and `--hero-bg`/`--hero-ink` keep the dark hero card dark in dark mode.
- **AI conversation.** The proxy accepts `mode: 'insight'` for the first read and `mode: 'chat'` for follow-ups, with the same aggregate snapshot plus up to 8 cleaned history turns; replies are plain text. The client keeps an `AiMessage` thread, offers suggested questions, shows a typing indicator, and posts only totals, category totals, and local insight headlines.
- **Date ranges.** A `DateRange` value (start, end, preset) replaces the single selected month and drives totals, category spend, insights, the trend chart, and the ledger. Presets cover this month, last month, 3 and 6 months, year to date, all time, and custom from/to dates, with previous/next stepping and comparison against the immediately preceding equal-length period. Budget plans are monthly, so `budgetMonths` scales the plan for multi-month ranges and uses the first logged month for all time.
- **Mobile and tablet.** A bottom tab bar with a center add action replaces the drawer below 900px; tables become card rows on phones; modals and the range picker become bottom sheets; filter fields stack; tablets get a two-column dashboard and a collapsed topbar. Views sync to `location.hash` so the browser back button works.

### Project structure (unchanged plus additions)

- `src/App.tsx` — data model, range math, insight rules, views, and the new theme switch, date sheet, conversation panel, and tab bar.
- `src/styles.css` — tokenized base styles plus the theme, animation, AI, range, and responsive layers.
- `server/gemini.mjs` — aggregate-only validation, guardrails, and the insight/chat modes.
- `index.html` — crawlable copy, metadata, WebApplication and FAQ structured data, and the pre-paint theme script.

## Iteration 3 — Budgital brand, Apple-like public surface, currencies, and performance

### Product direction

- Rebrand visible product copy from Budgetly to **Budgital** while preserving existing `budgetly-*` local-storage keys so current users do not lose data.
- Keep `/app` dedicated to the private workspace. Use `/` as a separate, crawlable landing page for Budgital and Lumina Metrics by FMR.
- Position the author as **Lumina Metrics by FMR**, created by **Fareed M. Rifaideen**, with website, GitHub, LinkedIn, and Buy Me a Coffee links.

### Design direction

- **Movement:** Apple-like calm glassmorphism: generous whitespace, translucent panels, soft atmospheric gradients, rounded geometry, and restrained depth.
- **Principles:** clarity before decoration; one obvious action per surface; motion should explain state; the data boundary stays visible.
- **Palette:** preserve the deep forest ink, Budgital lime, peach attention, sky blue, and lavender category palette. Use lime as the signature brand color and forest as the high-contrast anchor.
- **Landing layout:** editorial hero with a CSS-built product window, short trust strip, three differentiation cards, privacy orbit, author block, and FAQ. No heavy raster dependency was added; the art is CSS/SVG-like DOM so it loads quickly and remains sharp.
- **Animation:** floating glass preview, rotating privacy orbit, animated startup orbit, hover lift, and reduced-motion fallback. App startup shows a branded splash with author credit.

### Implementation

- Lazy-load `App` and `LandingPage` from `src/main.tsx`; the landing route does not load the full dashboard component before the user chooses `/app`.
- `src/LandingPage.tsx` owns public copy, FAQ, author links, JSON-LD, theme switch, and app CTA.
- The app writes private-route metadata (`noindex,nofollow`) while the landing page remains indexable.
- AI usage is capped at 12 browser-tracked requests per local day, a 12-request server-side best-effort client cap, and a configurable project-wide ceiling. The UI shows remaining requests, and the proxy returns a readable 429.
- Transactions can carry a currency and stored conversion rate. The base currency is persisted locally; Gemini's validated `fx` mode can refresh cautious estimates for non-base currencies. Conversion is explicitly described as an estimate to verify.
- Production static assets receive immutable one-year caching while HTML remains revalidated.

## Review hardening — correctness and safety

- Static server resolves nested `index.html` files for trailing-slash learning routes, and `/app` receives an HTTP `X-Robots-Tag: noindex, nofollow` header.
- Budgital CSV backups use a quoted parser and explicit `transaction`, `category`, and `budget` records so a backup can restore the full local workspace, including currency and FX metadata.
- Mixed-currency totals, trends, comparisons, sorting, budget progress, and transaction summaries use base-currency conversion. Missing FX rates are excluded from base totals and surfaced in Data instead of silently assuming 1:1.
- Changing the base currency now requests Gemini estimates, converts budgets and legacy/base transactions, and preserves foreign transactions with new base rates. User-entered FX rates are retained.
- Browser AI usage is refundable when a request fails; the server ignores spoofable forwarding headers and adds a configurable project-wide daily ceiling (`GEMINI_DAILY_PROJECT_LIMIT`, default 120) in addition to the local 12-request UX limit.
- Desktop and compact transaction renderers are mutually exclusive in the DOM, native controls follow the active color scheme, and the landing header reflows at very narrow phone widths.

## Iteration 4 — floating AI, richer onboarding, and brand interaction

The app now adds AED, SAR, and PHP using three-letter currency codes. The AI experience is presented as a floating right-bottom chatbot so users can ask for the first read and follow-up questions without leaving the workspace. The landing page uses the generated light/dark Budgital mark assets, mobile theme access, scroll-triggered reveal motion, a back-to-top control, an author detail card, social/support links, and a concise expanded FAQ set grounded in the new research.

The app adds an approachable “How Budgital works” tutorial reachable from the sidebar and mobile topbar. Its first-impression copy makes the free, no-commitment, no-bank-linking position clear without presenting it as a discount message. The main dashboard remains focused on budgeting rather than showing a risky clear-data action.

## Iteration 5 — trust surface, resilient branding, and motion

The logo now uses local public SVG fallbacks for light and dark themes so the UI does not depend on asynchronous managed-image delivery. The landing header becomes a centered glass pill after the user scrolls, while the app topbar compresses into a translucent glass bar. The landing page now includes CSS-rendered app screenshots/mockups, reversible IntersectionObserver reveal motion, richer hover/active states, a local-first inquiry/feedback/suggestion form, and legal access.

The app now gates first use behind a local terms acceptance screen. Terms, license, disclaimer, and no-liability language is accessible again from the app. A local feedback form is available on both surfaces, and desktop-only panel motion is applied through a media-query class so phones remain calm and performant.

## Iteration 6 — live product previews and landing composition

The landing showcase now embeds the real responsive Budgital app in non-interactive preview frames using an iframe-only preview mode; top-level `/app` still requires terms acceptance. The previous decorative dashboard mockups were removed. The showcase and Help shape Budgital sections now use constrained max-width containers, stable two-column/one-column breakpoints, and theme-aware glass surfaces. Scroll direction writes a direction token and scroll offset used by a floating orbit tied to the app-preview rhythm, while reveal cards animate both into and out of view. The landing pill is more transparent and the currency display uses unambiguous ISO letters for LKR, AED, and SAR where glyph support is inconsistent. Generated light/dark logo marks are wired with local SVG fallbacks.

## Iteration 7 — splash animation, real screenshots, trust signals, GSAP mascot

The splash screen is now a shared CSS-animated component used by both the landing page and the app workspace: an inline SVG Budgital mark whose bars rise in sequence, a drawn baseline, rotating orbit rings, and a lime loading track. It uses no extra network request and no JavaScript animation frames, and the landing splash runs once per browser session so repeat visits are instant. The landing showcase now shows static screenshots captured from the real app with a headless browser (`.tools/capture-app-shots.py`), so the landing page no longer embeds the interactive app. A trust section adds illustrative photography with an explicit "illustrative, not verified testimonials" note. GSAP ScrollTrigger drives a single persistent "Bud" mascot that travels between eight DOM-derived anchors and reverses when scrolling up; GSAP is code-split and imported after first paint, mobile uses a reduced motion profile, resize refresh is debounced, and reduced-motion users get a static page.

## Iteration 8 — uploaded mascot, CTA approach motion, screenshot card fixes

The GSAP mascot now uses the uploaded Budgital artwork (`public/bud-mascot.png`, with a 200px variant for phones) instead of the inline SVG, keeping the transparent character recognisable at both breakpoints. The timeline was rebuilt so each keyframe sits at the scroll progress where its anchor is centred in the viewport, and anchors now sit on the actual call to action of every section: the hero CTA cluster, the third feature card, the new showcase CTA, the privacy link, the feedback button, the trust section, the Support the builder button, the FAQ section, and the final "Open Budgital free" button. Vertical placement is capped so tall sections keep the mascot beside the heading rather than drifting to the section's vertical middle, and `power2.inOut` easing makes the mascot ease into each CTA and replay the journey in reverse on scroll-up. The screenshot gallery was fixed by letting each card size to its own content (`align-self: start` plus content rows) so the two desktop cards no longer inherit the wide card's height. The generated trust photographs are now bundled locally under `public/trust/` because the platform storage path is not served on the preview origin.

## Iteration 9 — scroll-scrubbed mascot video

The mascot is now the uploaded video rather than a travelling image. It is pinned to the right edge with `position: fixed` and never travels across the page; a small inner drift (roughly 32px of vertical travel) keeps it alive as the page scrolls. Scroll position scrubs the clip: frame one plays at the top of the page and the last frame lands at the bottom, so the animation rewinds naturally on scroll-up. Both encodes are prepared with dense keyframes (a keyframe every four frames) and `+faststart`, which keeps seeking responsive while scrubbing; a 400px mobile encode is chosen below 900px, and the poster frame paints instantly. Two implementation details matter: the clip is shot on white, so the fixed layer itself carries the theme blend (`multiply` on light surfaces; `invert` + `hue-rotate(180deg)` with `screen` blending on dark surfaces), because a blended child of a transformed ancestor only blends inside that ancestor and would otherwise show a white box; and the GSAP drift animates an inner element so the fixed layer keeps its blend role. Reduced-motion visitors and browsers that report a real media error get the static transparent mascot artwork instead.

## Iteration 10 — mobile chat and app-shell polish

The AI conversation now behaves as a proper responsive sheet: a floating panel on desktop and a full-width bottom sheet on phones, with a bounded overall height, a scrollable result thread, compact privacy copy, restrained suggestion chips, and a composer that remains available without squeezing the AI answer into a small viewport. The mobile app header is a single horizontally scrollable control row beneath a clear page crumb, preventing the range selector, utilities, theme switch, and add action from colliding. The spending-by-category chart switches from a tall stacked layout to a compact chart-plus-legend grid on phones, with tighter legend rows and ellipsis for long category names. Currency abbreviations such as AED, SAR, and PHP now render with readable spacing in compact chart labels, while symbol currencies remain compact.


## Iteration 11 — free pilot foundation: PWA, performance, and Netlify readiness

### Decision

Begin with a reversible, no-cost audience-validation phase. Budgital remains usable as a guest/local-first app; accounts, cloud backup, OCR, voice input, theme customisation, and app-store packaging remain later phases until user evidence justifies their complexity and data responsibilities.

### Implementation

- Add an installable web-app manifest, local 192px/512px icons, and a production-only service worker. The worker caches only the app shell and static assets, uses network-first navigation, and never intercepts `/api/` or `/.netlify/` requests.
- Add a non-blocking `beforeinstallprompt` card. It appears only when the browser offers installation, can be dismissed for the session, and does not add a header row that could break mobile layouts.
- Prefer local SVG brand marks over remote managed-image URLs so first paint is not delayed by an external asset and the logo remains reliable offline.
- Keep the landing page's first screenshot eager and defer carousel thumbnails; reduce mascot video preload from `auto` to `metadata` so non-critical media does not compete with the first meaningful paint.
- Add `netlify.toml` and a Netlify Function adapter that reuses the existing server-only Gemini validation and aggregate-only payload boundary. Netlify can run the site without Gemini when the key is omitted.
- Keep hashed assets immutable and HTML revalidated. Treat the free Netlify URL as the initial pilot surface; connect a custom domain only after basic audience feedback.

### Deferred until evidence

- Optional sign-in and encrypted cloud backup.
- Receipt image/OCR capture and voice entry.
- Theme palette selector beyond Light/Dark.
- Capacitor/Expo packaging and Google Play/App Store submissions.
- SSR migration. The current split lazy-loaded SPA already avoids loading the dashboard on the public landing route; measure real performance before moving to a framework with server rendering.


### Deployment smoke-test corrections

The first Netlify deploy exposed two platform-specific differences: Netlify does not automatically apply the local server's `/app` SPA fallback, and Netlify Functions require a Web `Response` rather than the local Node-style `{ statusCode, headers, body }` object. The deployment configuration now includes explicit `/app` and `/app/*` fallbacks, while the Gemini adapter converts the shared handler output into a standards-compliant `Response`.

## Pilot feedback fix — Gemini diagnostics, default currency, and theme toggle

- Added an explicit saved default-currency label for new income and expense entries, including AED, SAR, and PHP in the supported list.
- Added a Netlify alias for `/api/gemini/exchange-rate` and clearer upstream error messages.
- Replaced conflicting breakpoint-specific theme-thumb translations with geometry-safe absolute positioning for phone and tablet widths.
- Live testing showed the Netlify Gemini function reaches the proxy but returns an upstream 502; the remaining production action is to verify `GEMINI_API_KEY` in Netlify production environment variables.

## Pilot feedback fix — first-run currency onboarding and toggle bounds

- The required pre-use agreement screen now asks the user to choose a default currency before the workspace opens. The selection is stored with local data and becomes the default for new entries.
- The mobile theme thumb now uses absolute left/right anchoring; dark mode cannot translate the thumb beyond the pill.
- Gemini remains a production configuration issue: the deployed endpoint returns a model/API-key rejection while the same model succeeds locally. Netlify must have a `GEMINI_API_KEY` variable in the Functions/Production scope.
