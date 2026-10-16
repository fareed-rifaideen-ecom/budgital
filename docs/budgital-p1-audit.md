# Budgital Pilot P1 Audit

Date: 2026-10-16

## Lighthouse baseline

Live URL: https://budgital.netlify.app/

Desktop Lighthouse run:

- Performance: 81
- Accessibility: 96
- Best Practices: 100
- SEO: 100
- FCP: 2.46 s
- LCP: 3.37 s
- TBT: 0 ms
- CLS: 0
- TTI: 3.37 s

Mobile-oriented Lighthouse performance preset:

- Performance: 55
- Accessibility: 96
- Best Practices: 100
- SEO: 100
- FCP: 3.56 s
- LCP: 6.02 s
- TBT: 538 ms
- CLS: 0
- TTI: 6.96 s

The main remaining performance concern is mobile LCP and JavaScript work during the initial landing-page load. CLS is already stable at zero in both runs.

## Mobile smoke testing

A 390 x 844 Android Chrome-style render was checked for `/` and `/app`.

- Landing page: available; header, CTA, theme control, mascot, and hero visual fit without visible clipping.
- App onboarding: available; terms checkbox, currency select, and agreement button fit inside the onboarding card.
- App after onboarding in the sandbox browser: dashboard loaded; navigation, date controls, theme control, Add transaction, feedback, terms, and floating AI controls were visible.
- Browser console layout check: no horizontal overflow (`scrollWidth` 1265 equals `clientWidth` 1265) in the interactive browser session.
- The browser session confirmed default currency options including USD, EUR, GBP, LKR, INR, AUD, CAD, JPY, AED, SAR, and PHP.
- The production endpoint returned HTTP 200 for `/app`.

This is a browser-based emulation/smoke pass, not a physical handset test. Physical Android Chrome and iOS Safari should still be checked before a broad launch.

## AI error classification implemented

The client and Gemini proxy now distinguish:

- AI disabled / local-only mode
- Daily application limit
- Gemini not configured
- Invalid Gemini API key
- Gemini free-tier/rate limit
- Gemini busy/unavailable
- Network/service failure
- Request validation failure
- Invalid or unreadable Gemini response

Retry actions are shown only for retryable conditions. Configuration, key, validation, daily-limit, and local-only states provide corrective messaging without misleading retry buttons.
