# Budgital Language Implementation Improvement SOP Blueprint

**Document type:** Future implementation blueprint / standard operating procedure  
**Product:** Budgital — browser-first personal budgeting workspace  
**Planned languages:** English, Sinhala, Tamil, Malayalam, Arabic  
**Status:** Planning only — no localization implementation is authorized by this document  
**Owner:** Lumina Metrics by FMR  
**Author:** Fareed M. Rifaideen  
**Last updated:** 11 October 2026

---

## 1. Purpose

This SOP defines how to introduce multilingual support to Budgital safely and systematically at a later date.

It is designed to prevent common localization failures such as:

- Translating only visible buttons while leaving charts, errors, legal copy, or onboarding in English.
- Breaking mobile layouts because translated text is longer.
- Treating Arabic as a normal left-to-right translation instead of implementing proper RTL behavior.
- Translating user-created transaction descriptions or category names unexpectedly.
- Sending the wrong language instructions to the AI chatbot.
- Creating duplicate or thin localized landing pages that are weak for SEO, AEO, and GEO.
- Changing CSV field names between languages and breaking data portability.

> **Core principle:** Localization is a product architecture upgrade, not a string-replacement exercise.

---

## 2. Approved language scope

| Language | Locale | Direction | Initial priority | Notes |
|---|---|---:|---:|---|
| English | `en` | LTR | Baseline | Existing source language and fallback locale |
| Arabic | `ar` | RTL | Phase 1 | Requires layout mirroring and Arabic typography QA |
| Tamil | `ta` | LTR | Phase 2 | Relevant to Sri Lanka, India, Singapore, Malaysia, and diaspora users |
| Sinhala | `si` | LTR | Phase 2 | Important for Sri Lankan users |
| Malayalam | `ml` | LTR | Phase 3 | Relevant to Kerala and Gulf-region users |

### 2.1 Locale policy

- Use the full locale code in application state, for example `ar`, `ta`, `si`, and `ml`.
- Keep internal currency codes stable: `USD`, `AED`, `SAR`, `PHP`, `LKR`, and so on.
- Do not translate locale codes, currency codes, CSV headers, transaction types, or storage keys.
- English must remain a complete fallback locale. Missing translations must never render a blank label.
- The application must allow manual language selection even when browser language detection suggests another locale.

---

## 3. Product boundaries

### 3.1 Translate application-owned content

The following must be localized:

- Landing page copy.
- Navigation and sidebar labels.
- Dashboard headings, labels, chart descriptions, and empty states.
- Transactions, budgets, import/export, currency settings, and feedback flows.
- Tutorial and onboarding instructions.
- Terms, disclaimer, privacy boundary, and no-liability messaging.
- AI chatbot controls, quota messages, errors, suggestions, and privacy disclosures.
- Toasts, validation errors, confirmations, loading states, and accessibility labels.
- Built-in category names and default insights for new users.
- SEO metadata, FAQ content, Open Graph fields, and structured data on public pages.

### 3.2 Do not automatically translate user-owned content

The following remain exactly as entered by the user:

- User-created category names.
- Transaction descriptions.
- Imported CSV descriptions.
- Personal notes.
- Custom labels stored in browser data.

A language switch must not mutate existing personal data.

### 3.3 Data portability rule

CSV import/export must remain language-neutral and backward compatible.

- Keep canonical CSV field names stable.
- Accept the existing Budgital backup format in every UI language.
- Do not translate CSV headers based on the selected interface language unless a separate opt-in import mapping is deliberately designed.
- Preserve categories, budgets, currencies, FX rates, FX source metadata, and descriptions during round trips.
- Add an explicit localized explanation that CSV field names remain standardized for compatibility.

---

## 4. Localization architecture

### 4.1 Translation module structure

Create a dedicated module rather than keeping translated strings inside components:

```text
src/i18n/
  config.ts              # supported locales, direction, display names
  index.ts               # locale provider and translation helper
  types.ts               # translation schema and typed keys
  formatters.ts          # dates, numbers, percentages, currencies
  en.ts                  # complete source dictionary
  ar.ts                  # Arabic dictionary
  ta.ts                  # Tamil dictionary
  si.ts                  # Sinhala dictionary
  ml.ts                  # Malayalam dictionary
```

If the implementation later uses an established i18n package, it must still preserve this conceptual separation.

### 4.2 Translation key rules

Use semantic keys, not English sentences as keys:

```ts
// Good
t('dashboard.availableAfterSpending')
t('transactions.empty.title')
t('ai.quota.remaining', { count })

// Avoid
t('You have money left after spending')
```

Recommended namespaces:

```text
common
brand
nav
landing
dashboard
transactions
budgets
data
currency
tutorial
ai
legal
feedback
validation
accessibility
insights
```

### 4.3 Interpolation and pluralization

Do not concatenate translated fragments manually.

```ts
t('insights.overBudget', {
  category: categoryName,
  percent: overBudgetPercent,
})
```

Support plural forms for quantities such as:

- `1 transaction` / `2 transactions`.
- `1 insight` / `3 insights`.
- `1 entry needs a rate` / `4 entries need a rate`.
- AI quota remaining messages.

Use the locale-aware `Intl.PluralRules` behavior rather than assuming English pluralization applies to every language.

### 4.4 Missing-key behavior

In development:

- Log missing translation keys.
- Display a visible warning in development only.
- Include locale and key in the warning.

In production:

- Fall back to English.
- Never display `undefined`, an empty button, or a raw internal key.

---

## 5. Language selection and persistence

### 5.1 Selection order

Use this order when determining the initial locale:

1. Explicit user preference stored in browser storage.
2. Browser language preferences.
3. English fallback.

Do not automatically overwrite a saved preference because the browser language changes.

### 5.2 Storage

Add a versioned language field to the existing local settings object, for example:

```ts
{
  theme: 'dark',
  language: 'ar'
}
```

The language preference is non-sensitive and may remain in browser storage.

### 5.3 Selector requirements

The language selector must:

- Display native language names: `English`, `සිංහල`, `தமிழ்`, `മലയാളം`, `العربية`.
- Be available on the landing page and inside the application.
- Work on desktop, tablet, and narrow mobile screens.
- Have an accessible label.
- Update the document language and direction immediately.
- Avoid changing the user’s stored financial data.
- Be usable before consent is accepted on the app terms gate, if the user needs the language to understand the terms.

---

## 6. RTL implementation for Arabic

Arabic must activate a document-level direction mode:

```html
<html lang="ar" dir="rtl">
```

### 6.1 RTL areas to test

- Landing navigation and mobile menu.
- Application sidebar and mobile tab bar.
- Header breadcrumbs and date controls.
- Hero card and income/spending stat cards.
- Budget rows and progress bars.
- Transaction table and mobile transaction cards.
- Import/export cards and modal forms.
- Feedback and legal modals.
- AI chatbot launcher, panel, messages, suggestions, and composer.
- Tooltips, close buttons, arrows, chevrons, and previous/next controls.
- Author modal and footer links.

### 6.2 CSS rules

Prefer logical properties:

```css
margin-inline-start
margin-inline-end
padding-inline
inset-inline-start
inset-inline-end
border-start-start-radius
```

Avoid hard-coding left/right unless the visual behavior intentionally remains physical.

### 6.3 Direction exceptions

Some content should remain visually LTR:

- Currency codes and standardized CSV examples.
- ISO dates where machine readability matters.
- Transaction IDs.
- Email addresses and URLs.
- Chart timelines when chronological left-to-right reading is clearer.
- Code snippets and technical field names.

Use a localized wrapper with `dir="ltr"` for these exceptions rather than reversing the whole page.

### 6.4 Icon behavior

Review directional icons individually:

- Back and forward arrows should mirror where they represent navigation direction.
- Download, upload, external-link, and trend icons should not be mirrored automatically.
- Financial increase/decrease symbols should retain their intended meaning.
- The donut chart and bar chart should remain geometrically stable.

---

## 7. Typography and visual design

### 7.1 Font strategy

Test script-capable fonts before implementation. A likely fallback plan is:

```css
:root {
  --font-ui: Inter, system-ui, sans-serif;
}

html[lang='si'] {
  --font-ui: 'Noto Sans Sinhala', system-ui, sans-serif;
}

html[lang='ta'] {
  --font-ui: 'Noto Sans Tamil', system-ui, sans-serif;
}

html[lang='ml'] {
  --font-ui: 'Noto Sans Malayalam', system-ui, sans-serif;
}

html[lang='ar'] {
  --font-ui: 'Noto Sans Arabic', system-ui, sans-serif;
}
```

The final font choice must be validated for:

- Numeral legibility.
- Weight availability.
- Mobile rendering.
- Dark-mode contrast.
- File size and first-load performance.

### 7.2 Text expansion rules

- Avoid fixed-height text containers.
- Allow headings and buttons to wrap.
- Use `min-height` rather than rigid `height` for text-heavy cards.
- Ensure labels remain readable at 320px width.
- Avoid reducing script text below a comfortable reading size to force a layout fit.
- Test long translations in the dashboard, header, chart legend, Smart Read, tutorial, and legal screens.

### 7.3 Brand and voice

The Budgital brand should remain recognizable across languages:

- Calm and plain-spoken.
- Helpful rather than corporate.
- Privacy-conscious without fear-based wording.
- Financially responsible without presenting as a financial advisor.
- Free and accessible without sounding cheap or low quality.

Native translators should adapt tone naturally rather than translate every phrase literally.

---

## 8. Dates, numbers, percentages, and currencies

Centralize all formatting in `src/i18n/formatters.ts`.

Use:

```ts
new Intl.NumberFormat(locale, options)
new Intl.DateTimeFormat(locale, options)
new Intl.NumberFormat(locale, {
  style: 'percent',
  maximumFractionDigits: 0,
})
```

### 8.1 Required formatting tests

Test each locale for:

- Month labels such as October 2026.
- Date-range labels.
- Thousands separators.
- Decimal separators.
- Negative amounts.
- Percentages.
- Currency placement.
- Zero values.
- Large values.
- Values with missing FX conversion.

### 8.2 Currency policy

The selected interface language must not silently change the selected base currency.

Currency display should remain explicit:

```text
AED 12,521
SAR 11,855
PHP 8,400
```

When the locale has a familiar symbol, the UI may show the symbol, but the currency code must remain available wherever ambiguity is possible.

### 8.3 Arabic numeral policy

At implementation time, choose and document whether Arabic uses:

- Latin digits: `12,521 AED`.
- Arabic-Indic digits: `١٢٬٥٢١ د.إ`.

The preferred default should be validated with target users in the relevant Arabic-speaking markets. Do not mix numeral systems inconsistently across charts, cards, forms, and CSV previews.

---

## 9. AI chatbot localization

### 9.1 Interface translation

Translate all AI UI states:

- Ask Budgital AI.
- Start a conversation.
- Ask a follow-up question.
- Send.
- Retry.
- Refresh insight.
- AI unavailable.
- Daily limit reached.
- Data privacy boundary.
- Informational-only disclaimer.

### 9.2 Response language instruction

The server-side Gemini request should receive the selected locale and an explicit instruction such as:

```text
Respond in Arabic. Use clear, practical budgeting language. Keep currency codes unambiguous. Do not provide regulated financial advice.
```

The instruction must be generated from a controlled locale configuration, not accepted as arbitrary browser prompt text.

### 9.3 AI quality requirements

For each language, verify that AI responses:

- Use the selected language consistently.
- Preserve currency codes and numeric accuracy.
- Do not invent transactions.
- Do not expose individual descriptions if the aggregate-only boundary is retained.
- Retain the financial-information disclaimer.
- Respect the daily usage limit.
- Handle mixed-language follow-up questions predictably.

### 9.4 Failure behavior

If the AI cannot respond in a requested language:

- Keep the interface in the selected language.
- Explain the limitation clearly.
- Offer an English response only with an explicit user action or clearly disclosed fallback.
- Do not silently switch the entire app language.

---

## 10. Legal, consent, and financial-safety content

The terms gate must be translated before it becomes mandatory for that locale.

Required localized legal content:

- Terms of use.
- Local browser-storage behavior.
- AI data boundary.
- AI usage-limit explanation.
- Informational-only disclaimer.
- No financial advice statement.
- No responsibility/liability statement for the creator.
- Free-use and no-commitment wording.
- Feedback submission notice, if feedback is stored or transmitted.

Legal translations should be reviewed by a fluent human reviewer familiar with the target language. Machine translation alone is not sufficient for legal or financial disclaimers.

> The localized legal text must not create stronger or weaker promises than the approved English version.

---

## 11. Landing page SEO, AEO, and GEO

The public landing page should be localized independently from the private app workspace.

### 11.1 Localized routes

Recommended future route structure:

```text
/
/ar/
/ta/
/si/
/ml/
```

The app route should remain focused on product functionality and should continue to use appropriate indexing controls.

### 11.2 Per-language metadata

Every public language route should have:

- Localized `<title>`.
- Localized meta description.
- Canonical URL.
- Open Graph title and description.
- Twitter/X card metadata where relevant.
- `lang` and `dir` attributes.
- `hreflang` alternates.
- Language-specific FAQ structured data.
- Language-specific WebApplication structured data where appropriate.
- Sitemap entry.

### 11.3 Native search research

Before translating SEO copy, research each language separately:

- How users search for personal budget apps.
- How users describe budgeting without bank linking.
- Local terms for income, expenses, savings, and monthly budget.
- Local currency-intent queries such as AED and SAR budgeting.
- Privacy-related and CSV-related questions.
- AI budgeting questions and concerns.

Do not translate English keywords literally and assume they have the same search demand.

### 11.4 AEO/GEO content pattern

Each localized landing page should answer questions directly with:

- Short definitions.
- Clear step lists.
- Specific product boundaries.
- Honest limitations.
- Stable terminology.
- Citable, self-contained paragraphs.
- FAQ answers written for humans first.

Avoid keyword stuffing and avoid creating near-duplicate translated pages with no local relevance.

---

## 12. Translation workflow

### 12.1 Source preparation

Before translating:

1. Freeze the English key schema for the release.
2. Extract all user-facing strings.
3. Classify each string by namespace and context.
4. Add translator comments for ambiguous terms.
5. Mark placeholders and formatting variables.
6. Identify strings that must not be translated, such as CSV headers or currency codes.
7. Identify strings with grammatical gender, pluralization, or sentence-order differences.

### 12.2 Translator brief

Every translator should receive:

- Product description.
- Target audience.
- Brand voice.
- Screenshot of the current UI.
- Context for each string.
- Character and layout constraints.
- Approved financial terminology.
- Terms that must remain in English, such as Budgital and Gemini.
- Examples of preferred and prohibited wording.

### 12.3 Review process

For every language:

1. Native translation.
2. Independent linguistic review.
3. Product-context review in the actual interface.
4. RTL review for Arabic.
5. Financial/legal review for sensitive copy.
6. Final sign-off and version tagging.

### 12.4 Translation glossary

Create a glossary with approved translations for recurring concepts:

- Income.
- Expense.
- Spending.
- Budget.
- Category.
- Available after spending.
- Amount left.
- Base currency.
- Exchange rate.
- Import.
- Export.
- Local storage.
- Privacy.
- Informational only.
- No bank connection.
- Free to use.

The same concept must not be translated three different ways across the dashboard, landing page, and AI chatbot.

---

## 13. Testing and quality assurance

### 13.1 Required test matrix

Test all five locales across:

- Landing page.
- App terms gate.
- Overview.
- Transactions.
- Budgets.
- Import/export.
- Currency settings.
- Feedback form.
- Legal modal.
- AI chatbot.
- Dark mode.
- Light mode.
- Mobile width: 320px and 390px.
- Tablet width: approximately 768px.
- Desktop width: 1280px or wider.

### 13.2 Functional checks

- Language selection persists after refresh.
- Language selection does not delete or mutate budget data.
- Switching language does not change base currency.
- CSV export remains compatible.
- CSV import validates correctly.
- AI responses use the selected language.
- AI daily quota continues to work.
- Terms consent is stored correctly.
- Theme switching continues to work.
- Back-to-top and navigation controls remain usable.
- Browser back/forward behavior remains correct.

### 13.3 Visual checks

Check for:

- Clipped labels.
- Overlapping chart center text.
- Buttons wider than their cards.
- Overflow in the mobile header.
- Broken RTL arrows.
- Reversed chart meaning.
- Low-contrast translated text in dark mode.
- Font fallback squares or missing glyphs.
- Inconsistent line height.
- Modal content exceeding viewport height.
- Long legal text becoming unreadable.

### 13.4 Accessibility checks

- Correct `lang` and `dir` values.
- Keyboard navigation in every locale.
- Screen-reader labels translated.
- Focus indicators remain visible.
- Text remains readable at 200% zoom.
- Form errors are announced.
- Directional icons have meaningful labels.
- Charts have text summaries independent of color.

### 13.5 Acceptance thresholds

A locale is not ready for release until:

- No critical missing translation keys remain.
- No horizontal scrolling occurs at supported mobile widths except intentional thumbnail rails.
- No legal, consent, AI privacy, or financial-safety text remains unintentionally in English.
- CSV round-trip tests pass.
- Dark and light contrast checks pass.
- Arabic RTL checks pass where applicable.
- Native reviewer signs off on terminology and tone.

---

## 14. Performance strategy

Multilingual support must not make the app feel slower.

Recommended approach:

- Lazy-load non-English translation dictionaries.
- Keep English in the initial bundle if it is the default.
- Avoid loading every script font on every route.
- Preload only the active locale’s critical font when justified by testing.
- Keep public localized landing pages statically renderable.
- Do not load translation libraries larger than the product requires.
- Keep the app splash screen independent of translation loading where possible.
- Display the first meaningful localized shell quickly, then hydrate secondary content.
- Measure bundle size before and after each additional locale.

Performance targets should include:

- No visible blank screen while the locale dictionary loads.
- No duplicate splash sequence.
- No blocking network call required to display the core app shell.
- No third-party translation API required for ordinary UI rendering.

---

## 15. Security and privacy considerations

- Do not send the full local budget dataset to a translation service.
- Do not use an external translation API at runtime for user-entered financial data.
- Translation files must be treated as application code and reviewed for injection risks.
- AI language instructions must be server-controlled and validated.
- Do not place secrets in translation dictionaries.
- Preserve the existing aggregate-only Gemini boundary.
- Keep locale selection separate from user financial records.
- Ensure localized feedback forms make the same storage/transmission behavior clear.

---

## 16. Recommended implementation sequence

### Phase 0 — Decision and preparation

- Confirm supported locales and launch order.
- Confirm whether Arabic uses Latin or Arabic-Indic digits.
- Approve glossary and brand voice.
- Confirm translation ownership and review budget.
- Capture baseline screenshots and bundle metrics.

### Phase 1 — Technical foundation

- Add locale registry and typed translation schema.
- Add provider/helper and fallback behavior.
- Add persistent language preference.
- Add `lang` and `dir` document updates.
- Centralize number/date/currency formatting.
- Extract common application strings.

### Phase 2 — English cleanup

- Complete the English dictionary.
- Remove remaining user-facing hardcoded strings.
- Add translation context comments.
- Add missing-key diagnostics.
- Stabilize responsive layouts before adding other languages.

### Phase 3 — Arabic RTL foundation

- Implement logical CSS properties.
- Add RTL layout mode.
- Test app shell, forms, charts, modals, and chat.
- Validate Arabic fonts and digit policy.
- Complete Arabic legal and consent review.

### Phase 4 — South Asian languages

- Add Tamil and Sinhala.
- Add Malayalam after the workflow is stable.
- Validate script fonts and mobile text density.
- Review localized financial terminology with native speakers.

### Phase 5 — AI and content localization

- Localize AI interface.
- Add controlled response-language instructions.
- Translate tutorial, legal content, FAQ, and structured data.
- Create localized landing routes and metadata.

### Phase 6 — Release and monitoring

- Run the full locale/viewport/theme matrix.
- Publish one locale at a time if possible.
- Monitor missing-key logs, language switching, feedback, and AI failures.
- Collect native-user feedback before expanding the next locale.

---

## 17. Suggested launch order

Recommended order:

1. **Arabic** — solves the largest architectural issue early and expands Gulf/MENA reach.
2. **Tamil** — strong relevance across Sri Lanka, India, Singapore, Malaysia, and diaspora users.
3. **Sinhala** — directly relevant to Sri Lankan users and the product’s regional context.
4. **Malayalam** — valuable for Kerala and Gulf-region users, especially with AED/SAR support.

An alternative is to launch Sinhala and Tamil together as a Sri Lanka-focused release, then add Arabic and Malayalam after the RTL and font workflows are proven.

---

## 18. Definition of done

The multilingual upgrade is complete only when:

- All approved UI surfaces are translated through a structured dictionary.
- English fallback is complete and missing keys are detectable.
- Sinhala, Tamil, Malayalam, and Arabic dictionaries are reviewed by fluent speakers.
- Arabic uses a tested RTL layout without horizontal overflow.
- Dates, numbers, percentages, and currencies are locale-aware.
- User-created content remains unchanged when language switches.
- CSV import/export remains backward compatible.
- AI interface and response-language behavior are localized and privacy-safe.
- Terms, disclaimer, and consent content are translated and reviewed.
- Public localized landing routes include correct SEO/AEO/GEO metadata.
- Dark mode, light mode, mobile, tablet, desktop, and accessibility checks pass.
- The initial page experience remains fast and does not introduce a duplicate or blocking loading sequence.
- The release is documented with locale versions, glossary version, reviewer sign-off, and known limitations.

---

## 19. Future maintenance SOP

For every future feature:

1. Add English translation keys before implementing the UI.
2. Add translator context and placeholder definitions.
3. Update all supported dictionaries or record a tracked missing translation.
4. Test the feature in LTR and RTL where applicable.
5. Test long text at mobile width.
6. Update the glossary if terminology changes.
7. Update localized SEO content if the feature affects public positioning.
8. Verify AI language behavior if the feature changes AI prompts or responses.
9. Include localization checks in the release checklist.
10. Never merge a user-facing string directly into JSX without a documented exception.

---

## 20. Practical recommendation

Budgital should adopt multilingual support, but implementation should begin only after the English interface has a complete translation key inventory and the responsive layout has been stabilized.

The highest-risk area is not translation accuracy alone. It is the interaction between:

- Longer translated text.
- Small mobile cards.
- Arabic RTL layout.
- Script-specific fonts.
- Financial number formatting.
- AI language consistency.
- Legal and privacy wording.

A careful phased rollout will let Budgital gain regional reach without sacrificing its current strengths: clarity, privacy, calm visual design, and fast browser-first use.
