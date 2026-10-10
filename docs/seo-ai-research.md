# Budgital SEO, AEO, GEO, and Gemini research

## Product position to own

Budgital should position itself as a **free, private, local-first budget app with optional explainable AI**. The strongest contrast is not “more features than Monarch or Copilot.” It is “start budgeting without linking a bank account, creating an account, or accepting a recurring subscription.”

The current competitor survey found that most large products sell connected-account automation, a named method, or a broad money dashboard. Budgital can win a narrower job: make one month understandable in a few minutes, with manual/CSV-first control, transparent local calculations, portable backups, and AI that is opt-in rather than the product’s source of truth.

## Keyword and query clusters

These are strategic content targets, not volume estimates. Validate volume and difficulty later with Google Search Console, Keyword Planner, Ahrefs, Semrush, or another keyword data source.

| Cluster | Example queries | Recommended page or feature |
|---|---|---|
| Core product | free budget app; personal budget app; monthly budget planner; private budgeting app; simple expense tracker | Homepage with a clear answer-first value proposition and WebApplication schema |
| Privacy / local-first | budget app without bank account; budget app that does not link to bank; private expense tracker; offline budget app; local budget app | “Budget without linking a bank account” guide and a visible privacy explanation |
| Workflow | how to make a monthly budget; how to track expenses; budget categories list; monthly budget spreadsheet alternative; CSV budget import | Monthly-budget guide, import/export help, and an indexable “how it works” section |
| Budget methods | 50/30/20 vs zero-based budget; envelope budgeting app; zero-based budget planner; flexible budget categories; sinking fund planner | Method comparison guide plus optional templates inside the app |
| AI budgeting | AI budget app; AI spending insights; private AI financial assistant; Gemini budget app; AI expense analysis | Private-AI guide and product feature explanation; do not promise financial advice |
| Competitor alternatives | YNAB alternative free; Monarch alternative privacy; Copilot alternative web; PocketGuard alternative; EveryDollar alternative free | Later comparison pages only when they add original, accurate analysis and link to primary sources |
| Jobs-to-be-done | how much did I spend on dining; why am I over budget; spending by category; month over month spending; budget amount left | Public explainer pages and in-app answer copy that mirrors real questions |

## Verified Google guidance

Google Search Central says the same foundational SEO practices apply to AI Overviews and AI Mode. There are no extra technical requirements, no special AI schema, and no need to create AI-only text files. Eligibility still depends on being indexed and eligible for a normal Search snippet. Google specifically highlights crawlable pages, internal links, textual content, page experience, and structured data that matches visible content.[1]

Google’s SEO starter guide emphasizes anticipating the words readers use, publishing useful page titles and descriptions, and using meaningful internal link text. Google also says that a sitemap can help discovery, while SEO changes may take weeks or months to show an effect.[2]

Google’s structured-data guide recommends JSON-LD, says structured data can help Google understand a page, and warns not to mark up content that is not visible. Markup is not a guarantee of a rich result; validate it with the Rich Results Test.[3]

The GEO research paper defines generative-engine optimization as improving the visibility of content in generative-engine responses. In its benchmark, the authors report improvements of up to 40%, while also noting that results vary by domain and method. This supports a practical strategy—clear answer-first text, specific claims, evidence, and strong internal linking—not a promise that schema alone will create AI citations.[4]

## Gemini implementation facts

Google’s Gemini pricing page says the free tier provides access to Google AI Studio and free input/output tokens for certain models, but also says free-tier content is used to improve Google products. Paid usage says content is not used to improve products. Budgital therefore describes the AI feature as optional and sends only aggregate totals, not raw transaction descriptions.[5]

Google’s rate-limit documentation says quotas are measured across requests per minute, input tokens per minute, and requests per day. Limits are applied per project, not per API key, and free-tier/model limits may change. Budgital handles a 429 response with a user-readable retry message.[6]

Google’s API-key guidance says to treat the key like a password, never check it into source control, never expose it in client-side production code, and use a server-side proxy. Budgital follows that pattern: the key is stored as a project secret and the browser calls `/api/gemini/insights` without receiving the key.[7]

## AI citation / answer-engine design rules

1. Put a direct answer in the first paragraph of every guide.
2. Use one clear H1 and descriptive H2s that match real questions.
3. Use short, quotable definitions such as “50/30/20 is a high-level allocation starting point; zero-based budgeting assigns expected income to specific jobs.”
4. Use verifiable examples and disclose uncertainty. Do not claim a competitor has AI unless its own current documentation supports it.
5. Link related pages with descriptive anchor text, not “click here.”
6. Use Article or WebApplication JSON-LD only where the visible page supports it.
7. Add named authorship/organization, updated dates, and primary-source references as the content library grows.
8. Build original evidence: anonymized spending-method experiments, CSV import benchmarks, and transparent privacy documentation will be more citation-worthy than generic listicles.
9. Track Search Console queries, indexed URLs, referral traffic from AI surfaces, and which pages earn external links. Google reports AI-feature traffic in the normal Web search type, not a separate guaranteed channel.[1]
10. Do not add FAQ schema to empty or hidden content. FAQ copy should be visible and useful even if Google does not grant a rich result.

## References

[1]: https://developers.google.com/search/docs/appearance/ai-features "AI features and your website — Google Search Central"
[2]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "SEO Starter Guide — Google Search Central"
[3]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data "Introduction to structured data markup in Google Search — Google Search Central"
[4]: https://arxiv.org/abs/2311.09735 "GEO: Generative Engine Optimization — Aggarwal et al."
[5]: https://ai.google.dev/gemini-api/docs/pricing "Gemini Developer API pricing — Google AI for Developers"
[6]: https://ai.google.dev/gemini-api/docs/rate-limits "Rate limits — Gemini API"
[7]: https://ai.google.dev/gemini-api/docs/api-key "Using Gemini API keys — Google AI for Developers"

## New FAQ and citation research — October 2026

The expanded FAQ set now targets questions that users and answer engines can quote directly: whether the app is free, whether budgeting works without bank linking, where data is stored, how optional AI handles privacy, how multi-currency conversion works, how to export a backup, and how to start a first month. These questions are useful because they connect product intent with concrete jobs-to-be-done instead of adding generic SEO copy.

A bank-free competitor page from Koody frames manual entry, statement imports, category review, cash and side-hustle flexibility, exports, and privacy as the main reasons people avoid bank linking.[8] Goodbudget differentiates through envelope budgeting, household sharing, mobile availability, and educational content.[9] Budgital should not copy either message. Its sharper angle is “free, no commitment, browser-local, CSV-portable, multi-currency, with aggregate-only AI when requested.” That combination gives the landing page a clear answer to “Why this instead of a bank-linked or method-specific budget app?”

Google’s current people-first guidance says helpful content should offer original value, identify who created it, explain how it was made when relevant, and avoid producing many search-first pages without a real audience need.[10] The FAQ implementation therefore keeps the questions visible, concise, and tied to the working product. It avoids claims about guaranteed rankings or special AI markup. The landing page also exposes the author and the product’s first-hand origin story, which supports the “Who” and “Why” signals Google asks creators to make clear.

For AI citation readiness, the product pages now use short answer-first statements, explicit boundaries, named authorship, descriptive internal links, and FAQ structured data that matches visible content. A U.S. Bank financial-education page provides a useful safety baseline: AI can help organize a budget and explore scenarios, but it should not receive account numbers, passwords, PINs, full addresses, or full bank statements, and it should not replace secure financial tools or personalized advice.[11] Budgital’s aggregate-only proxy and visible “informational estimate” caveat follow the same conservative pattern.

The currency list now uses ISO-style three-letter codes for AED (UAE dirham), SAR (Saudi riyal), and PHP (Philippine peso), alongside the existing currencies. ISO explains that ISO 4217 uses internationally recognized alphabetic and numeric codes to reduce ambiguity in currency representation.[12] Gemini exchange rates remain estimates; the app must not present them as live quotes or financial advice.

### FAQ topics to keep measuring

Track impressions and clicks for “free budget app,” “budget app without bank account,” “private expense tracker,” “budget app with CSV import,” “multi-currency budget app,” “AI spending insights privacy,” “how to make a monthly budget,” “why am I over budget,” and “50/30/20 vs zero-based budget.” Treat these as hypotheses rather than volume claims. Search Console and real user questions should decide which FAQ or guide pages deserve expansion.

## New references

[8]: https://koody.com/blog/budgeting-app-without-bank-linking "Koody — Budgeting app without bank linking"
[9]: https://goodbudget.com/ "Goodbudget — envelope budgeting app"
[10]: https://developers.google.com/search/docs/fundamentals/creating-helpful-content "Creating helpful, reliable, people-first content — Google Search Central"
[11]: https://www.usbank.com/financial-education/save/use-ai-for-budgeting.html "How to use AI for budgeting without oversharing — U.S. Bank"
[12]: https://www.iso.org/iso-4217-currency-codes.html "ISO 4217 currency codes — ISO"
