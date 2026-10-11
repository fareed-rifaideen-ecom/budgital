# Budgital outcomes

- **Record and organize money movement** — Let me log income and expenses with amount, date, category, and optional description; create and manage transaction categories for organizing income and spending.
- **Manage monthly category budgets** — Let me set a monthly budget for each expense category and show the amount spent and remaining for each category in the selected month, including clear over-budget states.
- **Show the personal budget dashboard** — Provide a dashboard summarizing monthly income, expenses, total budget, and remaining budget.
- **Visualize category and month-over-month spending** — Visualize spending by category with a clear category breakdown chart and display a month-over-month spending trend chart.
- **Explain the budget in plain English** — Generate plain-English insights such as category overspending percentages and notable month-to-month changes.
- **Move data through CSV files** — Import transactions from CSV with validation and a preview before saving; export budget and transaction data to CSV.
- **Keep the app local** — Persist all app data locally in the browser.
- **Offer a persistent dark theme** — Offer exactly Dark and Light with no System option; start from the operating system preference on first load and wait for the user to choose before overriding it; persist the choice locally; apply it before first paint; update the browser theme color; animate the switch smoothly; keep every surface, label, chip, chart, table, focus state, and over-budget state legible in dark mode.
- **Add optional privacy-scoped Gemini insights** — Provide an explicit AI action that sends only selected month totals, category totals, and existing local insights through a server-side Gemini proxy; keep individual transaction descriptions and the API key out of client code; show the payload boundary, loading state, rate-limit/error state, retry action, and an informational-not-financial-advice disclosure; keep deterministic local insights available when AI is off.
- **Create a crawlable SEO/AEO/GEO public surface** — Provide a descriptive homepage title and meta description, canonical/Open Graph/Twitter metadata, WebApplication JSON-LD, robots rules, an XML sitemap, internal links, and visible answer-first guide pages for monthly budgeting, bank-free budgeting, budget-method comparison, and private AI budgeting.
- **Document differentiation and research evidence** — Keep a competitor gap report plus a keyword, AI citation, Gemini security, rate-limit, and data-use research document with primary-source links; do not claim special AI markup or guaranteed rankings.

## Iteration 2 — theme, AI conversation, dates, mobile

- **Two-state theme switch** — Provide only Dark and Light. On first load, read the operating system preference and start in dark mode when the system default is dark. Persist the user's choice and apply it before first paint so no wrong-theme flash occurs. Animate the change smoothly: an animated switch with a moving sun/moon thumb plus a circular reveal expanding from the switch itself, with a reduced-motion fallback.
- **Dark mode legibility** — Every surface, heading, label, muted caption, input, chip, card, chart, table, and modal stays readable in dark mode; no light-mode text or panel colors remain on dark backgrounds, and primary buttons keep high contrast in both themes.
- **AI follow-up questions** — After the first AI read, the user can ask follow-up questions in the same panel; the conversation shows the question and the answer, keeps up to 8 prior turns as context, offers suggested questions, handles loading and errors, and stays aggregate-only with no individual transactions or descriptions transmitted.
- **Improved date filtering** — Offer This month, Last month, Last 3 months, Last 6 months, Year to date, All time, and a custom from/to range; apply one selection to the dashboard, totals, charts, insights, and ledger together; provide previous/next period stepping; compare against the immediately preceding equal-length period; and add category, sort, search, and from/to filters with a filtered running total and a reset action.
- **Mobile-first layout** — Phones get a bottom tab bar with a center add action instead of a drawer, a compact topbar, stacked filter fields, ledger entries as tappable cards instead of a wide table, bottom-sheet modals, safe-area padding, and no clipped or wrapped button labels. Tablets get a two-column dashboard, full-width cards, and the same readable hierarchy, and views are addressable so the browser back button works.
- **Discoverability additions** — Publish FAQ structured data for the money questions answer engines ask, keep exactly one h1 per document, and keep the sitemap current.

## Iteration 3 — Budgital brand, landing, currencies, and performance

- **Rebrand without data loss** — The visible product name is Budgital; the app page is reachable at `/app`; existing `budgetly-*` local-storage keys remain compatible so existing browser data is preserved.
- **Dedicated SEO/AEO/GEO landing page** — `/` is a separate public landing page with answer-first copy, Budgital positioning, FAQ structured data, internal links, author details, dark/light theme, smooth scroll-friendly anchors, Apple-like glass effects, and a clear link to `/app`; `/app` remains dedicated to app functions and is marked noindex after app hydration.
- **Apple-like visual language** — Use the existing forest/lime/peach/blue palette with appropriate gradients, translucent glass panels, rounded surfaces, depth, soft hover motion, and reduced-motion fallbacks across the public surface and branded loading state.
- **Branded splash and author** — Before the app workspace appears, show the Budgital logo/wordmark, “Lumina Metrics by FMR,” and “Created by Fareed M. Rifaideen.” Keep author/support access available in the app sidebar and landing page.
- **Author links and support** — Show Fareed M. Rifaideen’s website, GitHub, LinkedIn, and Buy Me a Coffee links; use a visible coffee mark/icon for the Buy Me a Coffee action.
- **Safer sample-data affordance** — Remove “Clear sample data” from the main dashboard action row; expose starter-data clearing under Data / Import & export instead.
- **AI chatbot and daily limit** — Keep follow-up questions in a conversation; show the remaining daily AI allowance; enforce a 12-request browser-local limit, a 12-request server-side per-client best-effort cap, and a configurable 120-request project-wide ceiling; preserve aggregate-only snapshots and readable error states.
- **Multi-currency tracking** — Allow USD, EUR, GBP, LKR, INR, AUD, CAD, and JPY per transaction; persist a base currency; convert foreign entries into base totals using a stored rate; offer a Gemini-powered rate refresh action with a clear “estimate—verify” caveat.
- **Faster first load** — Lazy-load landing/app routes, keep the landing hero CSS-built rather than adding a large raster asset, and cache hashed production assets immutably while revalidating HTML.
- **SEO documents remain valid** — Keep `manus-routes.json`, `robots.txt`, `sitemap.xml`, route metadata, public guides, and visible author/FAQ content synchronized with the Budgital routes.

## Review hardening outcomes

- **Preserve a full local backup:** CSV export/import must round-trip quoted descriptions, transactions, categories, budgets, currencies, and FX rates; imported records must merge without duplicating IDs.
- **Keep multi-currency totals trustworthy:** mixed-currency comparisons, trends, sorting, summaries, budgets, and transaction views must use the active base currency; missing FX rates must not be treated as 1:1 and must be surfaced to the user.
- **Harden AI usage:** failed AI requests must release the browser allowance; the server must ignore spoofable forwarding headers and enforce a configurable project-wide daily ceiling.
- **Serve discoverable guide pages correctly:** trailing-slash learning URLs must return their static guide HTML, while `/app` must be noindex at the HTTP layer.
- **Improve responsive/performance behavior:** do not mount both transaction representations at once; native controls must follow dark mode; the landing header must remain usable at narrow phone widths.

## Iteration 4 outcomes

- **Extend currency support:** Add AED, SAR, and PHP to transaction entry, base-currency selection, import/export validation, formatting, and Gemini FX requests using the codes AED, SAR, and PHP.
- **Make AI a floating chatbot:** Keep the aggregate-only insight and follow-up flow, but open it from a persistent right-bottom floating control; make the panel usable on desktop, tablet, and phone without obscuring the bottom tab bar.
- **Add responsive landing theme access:** Keep the Light/Dark toggle available on mobile landing pages as well as desktop, with system preference still used only before the first explicit choice.
- **Use a distinctive two-theme logo:** Create and use minimalist Budgital marks optimized for both light and dark surfaces; keep the mark legible at small app-icon sizes and avoid generated wordmark text inside the asset.
- **Add scroll utility and motion:** Provide a back-to-top control on both landing and app pages; make it compact, accessible, and positioned safely across desktop, tablet, and phone layouts. Add reduced-motion-safe scroll reveal triggers to the landing page.
- **Make the author interactive:** Clicking “Lumina Metrics by FMR” or the author mark must open a brief author card explaining Fareed M. Rifaideen’s motivation, free/community intent, website, GitHub, LinkedIn, and Buy Me a Coffee links with recognizable icons.
- **Noticeable builder support CTA:** Animate the Support the Builder action gently and add a smooth hover treatment without making the CTA obstructive or misleading.
- **Expand answer-first FAQs:** Add visible questions about free use, bank-free budgeting, local storage, multi-currency, FX estimates, exports, AI privacy, and starting a first month; keep FAQ structured data synchronized with the visible answers.
- **Add a practical app tutorial:** Provide a short in-app workflow guide covering transactions, category budgets, date ranges, CSV portability, AI boundaries, and the free/no-commitment model; make it reachable on mobile and desktop.
- **Keep SEO/AEO/GEO evidence current:** Record the new competitor, people-first content, AI privacy, currency-code, and FAQ research with source URLs in the research report.

## Iteration 5 outcomes

- **Reliable logo visibility:** Serve local light and dark Budgital SVG marks from `public/` and use them in the landing page, app sidebar, splash screen, consent screen, and author card.
- **Interactive landing motion:** Make scroll reveals reversible when scrolling down and back up; add smooth scrolling, click feedback, hover lift, card mockup interaction, reduced-motion handling, and a floating glass pill header after scrolling.
- **App glass header and desktop motion:** Compress the app header into a transparent/glass state after scrolling and add extra panel hover/breathe motion only on desktop widths.
- **Landing app imagery:** Add multiple responsive visual mockups showing the desktop dashboard, mobile view, trend chart, and insight surface without blocking page speed on external images.
- **Feedback forms:** Add inquiry, feedback, and suggestion forms on both landing and app surfaces. Keep the first implementation local-first with browser storage and clear copy that notes it is not transmitted to a server.
- **Terms and first-use consent:** Add terms of use, license, disclaimer, and creator no-liability language to both surfaces. Require explicit checkbox agreement before the app workspace becomes usable, and persist the acceptance locally.

## Iteration 6 outcomes

- **Balanced landing composition:** Constrain the app showcase and Help shape Budgital card to readable max widths, remove stretched grid behavior, and preserve stable light/dark contrast.
- **Real app previews:** Replace decorative mockup cards with live responsive previews from the actual `/app` interface. Keep top-level app consent intact; allow only iframe preview mode to bypass the consent gate.
- **Scroll choreography:** Add direction-aware scroll tokens, an app-related orbit motion, reversible reveal cards, and smooth up/down transitions with reduced-motion support.
- **Transparent pill:** Increase landing header transparency and preserve readable borders, blur, and contrast in both themes.
- **Currency clarity:** Use clear ISO currency letters for currencies whose symbols render inconsistently in category totals and compact chart labels.
- **Brand refresh:** Generate and insert a new distinctive light/dark Budgital mark with reliable local fallbacks.

## Iteration 7 outcomes

- **Splash animation:** Add an animated Budgital logo and a creative loading animation to the splash screen on both the landing page and the app, without adding a network request or delaying first paint.
- **Remove Scroll-triggered clarity tile:** Delete that showcase tile from the landing page.
- **Static real screenshots:** Replace embedded live app previews with static screenshots captured from the real app, and remove the iframe preview bypass from the app route.
- **Trust signals:** Generate and add photographs of people who look relieved and in control, with an honest illustrative-photography note.
- **GSAP ScrollTrigger:** Implement the referenced GSAP guide on the landing page with a persistent Bud mascot that follows the scroll narrative between section anchors and reverses when scrolling up, including mobile and reduced-motion profiles.
