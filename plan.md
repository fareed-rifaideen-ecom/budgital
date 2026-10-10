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
