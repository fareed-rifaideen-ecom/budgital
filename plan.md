# Budgetly differentiation and discoverability plan

## Product direction

Budgetly stays a focused, browser-local budget app rather than becoming a bank-aggregation or wealth-management suite. The differentiator is: **free monthly budgeting without account linking, with portable CSV workflows, transparent local insights, dark mode, and optional aggregate-only Gemini assistance**.

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
- **Signature color:** Budgetly lime `#c8ee68`.

## Implementation

- Persist the selected theme (`system`, `light`, or `dark`) alongside browser-local app data.
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

