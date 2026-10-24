# Budgital Netlify-to-Cloudflare Migration Blueprint

**Status:** Phase 0 approved and complete. The Cloudflare target account is connected, email notifications are selected for feedback, and no DNS, secret, or production deployment changes have been made.

## 1. Verified current state

The connected Cloudflare integration is active and the approved target account is:

- **Cloudflare account:** `budgital`
- **Account ID:** `a94be54d78515779240db95470f36643`
- **Existing Cloudflare Pages projects:** none

The referenced migration task confirms that the original goal is to move the existing browser-first Budgital app from Netlify to Cloudflare while keeping the local-first privacy model.

The current project is `/home/ubuntu/budgetly` on branch `main` at commit `424b400`. The existing Netlify site remains the active fallback at `https://budgital.netlify.app`.

Local migration work already prepared but not committed consists of:

```text
functions/_lib/gemini.js
functions/api/gemini/insights.js
functions/api/gemini/exchange-rate.js
public/_redirects
public/_headers
```

The existing Netlify configuration and Netlify Functions remain in place so the current site can continue operating during migration.

## 2. Target outcome

Budgital will run on Cloudflare Pages at a new `pages.dev` address first, with the option to attach a custom domain later.

```text
Current fallback:
https://budgital.netlify.app

Cloudflare validation and initial production:
https://<cloudflare-project>.pages.dev

Optional final public address:
https://<your-custom-domain>
```

The migration will preserve:

- Browser-only budget storage.
- Income and expense logging.
- Category envelopes and budget tracking.
- Multi-currency support, including AED, SAR, and PHP.
- Currency selection and conversion flow.
- AI insights, follow-up chat, and exchange-rate estimation.
- Receipt OCR and camera capture.
- Local voice transaction entry.
- CSV import and export.
- Terms, disclaimer, onboarding consent, and local-data messaging.
- PWA manifest, service worker, responsive design, themes, and landing-page animations.
- Existing `/` and `/app` routes.

Cloudflare will host the frontend and optional server-side AI proxy. It will not become a database for user budgets.

## 3. Deployment model decision

Use **Cloudflare Pages Direct Upload with Wrangler from GitHub Actions**.

The pipeline will build the project in GitHub Actions and upload the generated `dist/` directory to the Cloudflare Pages project. Wrangler will also discover and deploy the root-level `functions/` directory.

This model is preferable to Cloudflare's native Git integration for this migration because:

- It makes the build command explicit and reproducible.
- It keeps deployment in the existing GitHub workflow.
- It allows us to run validation before upload.
- It separates source-code pushes from production deployment logic.
- It avoids relying on Netlify's exhausted operational-credit deployment path.

Cloudflare documents that Direct Upload is intended for prebuilt assets and CI/CD. It also documents that a Direct Upload project cannot later be switched to native Git integration, so the project type must be chosen intentionally. [1] [2]

## 4. Target repository structure

After implementation, the relevant structure will be:

```text
budgital/
├── .github/
│   └── workflows/
│       └── cloudflare-pages.yml
├── functions/
│   ├── _lib/
│   │   └── gemini.js
│   ├── _middleware.js              optional later
│   └── api/
│       ├── gemini/
│       │   ├── insights.js
│       │   └── exchange-rate.js
│       └── feedback.js             phase 2, after feedback destination decision
├── public/
│   ├── _headers
│   ├── _redirects
│   └── ...existing static assets...
├── server/
│   └── gemini.mjs                  retained for Netlify rollback
├── netlify/
│   └── functions/gemini.mjs        retained for Netlify rollback
├── src/
│   └── ...existing React application...
├── dist/                           generated; not committed
└── netlify.toml                    retained temporarily for rollback
```

The `dist/` folder remains generated output and stays ignored by Git. Pages deployment uses the generated output rather than committing it.

## 5. Gemini Function migration

### Current Netlify behavior

The current frontend sends requests to:

```text
POST /api/gemini/insights
POST /api/gemini/exchange-rate
```

Netlify redirects both paths to a single Netlify Function. The shared Node handler currently uses `process.env.GEMINI_API_KEY`, a Node request stream, and a Node response object.

### Cloudflare behavior

Cloudflare Pages Functions use the Workers-style request context:

```js
export async function onRequest(context) {
  const request = context.request;
  const env = context.env;
  return new Response(...);
}
```

The new files preserve the frontend URLs but expose separate Pages Function routes:

```text
functions/api/gemini/insights.js
functions/api/gemini/exchange-rate.js
```

The shared Cloudflare handler will preserve:

- `insight` mode.
- `chat` mode.
- `fx` mode.
- Selected currency in the prompt.
- Aggregate-only snapshot validation.
- Input length limits.
- Sanitization of user-provided text.
- JSON response validation.
- Structured error codes.
- Daily per-client and project best-effort limits.
- No transaction rows or descriptions sent to Gemini.
- No API key exposure in the browser.

The current in-memory daily limit is only best-effort in an edge environment because different isolates may not share memory. It should remain as a safety layer for the first migration. A durable global quota can be added later with Cloudflare KV or D1 if needed.

Cloudflare's migration documentation confirms that Netlify and Pages use similar directory conventions but different handler syntax. Netlify handlers accept event/context and return Netlify response objects; Pages Functions export `onRequest`-style handlers and return `Response` objects. [3]

## 6. Gemini secrets and environment variables

### Cloudflare Pages runtime settings

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Open the Budgital Pages project.
3. Go to **Settings → Variables and Secrets**.
4. Add `GEMINI_API_KEY`.
5. Paste the currently rotated Google AI Studio key.
6. Choose **Encrypt**.
7. Apply it to **Production**.
8. Save.

Optional:

```text
GEMINI_MODEL=gemini-flash-lite-latest
```

`GEMINI_MODEL` may be a normal variable. `GEMINI_API_KEY` must be encrypted.

If Cloudflare preview deployments will call Gemini, configure the key separately for the Preview environment. Do not assume a Production secret is available to Preview.

Pages Functions access the key only through:

```js
context.env.GEMINI_API_KEY
```

Cloudflare documents that secrets are encrypted bindings and are available programmatically through `context.env`. [4]

### GitHub Actions secrets

The GitHub repository needs only deployment credentials:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The Cloudflare API token should be a custom token limited to the Cloudflare Pages account permission with Edit access. The Gemini key must not be added to GitHub Actions because the build does not need it and the key belongs at Cloudflare runtime.

## 7. Routing and headers migration

### SPA redirects

The current Netlify route rules will be moved from `netlify.toml` into `public/_redirects`:

```text
/app    /index.html    200
/app/*  /index.html    200
```

Vite copies these files to `dist/` during the build. Cloudflare Pages will then serve React for direct navigation to `/app` and nested app paths.

### Static headers

The current asset and security behavior will be moved into `public/_headers`:

```text
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: public, max-age=0, must-revalidate

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

Important limitation: Cloudflare documents that `_headers` rules do not apply to Pages Function responses. The Gemini Function must therefore set its own `Cache-Control`, `Content-Type`, `X-Content-Type-Options`, and related headers in code. [5]

## 8. Feedback-form migration decision

Netlify Forms will not continue collecting submissions after the move. Cloudflare's migration guidance explicitly recommends replacing Netlify form handling with Pages Function logic that stores or forwards submissions. [3]

The migration will treat feedback as a separate decision rather than silently pretending it is still collected.

### Approved approach

The selected destination is **email notifications**. The Cloudflare migration will expose `POST /api/feedback`, validate and rate-limit the submission, and forward accepted feedback to the owner through an email/webhook provider configured with a server-side secret. The app will show success only after the provider accepts the message; otherwise it will preserve the local fallback and show a clear failure state.

### Implementation approach

First deploy the site with the existing feedback UI changed to an explicit Cloudflare-ready endpoint contract:

```text
POST /api/feedback
```

Then choose one durable destination:

1. **Cloudflare D1:** store feedback in a small database table. This is the most integrated option but adds data-retention and deletion responsibilities.
2. **Airtable or another external form destination:** forward validated feedback to a provider with a free tier. This adds an external connector and provider dependency.
3. **Email/webhook service:** send notifications to the owner. This requires a provider secret and delivery monitoring.
4. **Temporary local-only fallback:** do not claim delivery; show that the note was saved locally only.

Before enabling the new form endpoint, define:

- Allowed fields.
- Maximum lengths.
- Spam protection or rate limiting.
- Retention period.
- Owner notification behavior.
- User-facing success and failure copy.
- Deletion process.

The first Cloudflare cutover should not delete the current Netlify Forms configuration until a replacement destination is tested.

## 9. Cloudflare project creation

Using the connected Cloudflare account:

1. Create a new Pages Direct Upload project named `budgital` if available.
2. If unavailable, use a close project name such as `budgital-app`.
3. Set the production branch to `main` if Cloudflare requests one.
4. Do not configure a custom domain yet.
5. Add the encrypted Gemini production secret.
6. Add the optional model variable.
7. Record the Pages project name and generated `pages.dev` URL.

The currently connected account has no Pages projects, so this will create a clean migration target rather than modify an existing Cloudflare application.

## 10. GitHub Actions workflow

After the Cloudflare project exists and its deployment credentials are configured, add:

```yaml
name: Deploy Budgital to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  deployments: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v6

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build production bundle
        run: pnpm run build

      - name: Deploy Pages assets and Functions
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=budgital
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

The workflow will run only after the code is committed and pushed. A manual `workflow_dispatch` run should be used for the first deployment so the cutover is intentional.

The workflow must not include `GEMINI_API_KEY` in its environment. The API key is a Cloudflare Pages runtime secret.

Cloudflare's official CI guide uses Wrangler with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, a Pages project name, and a static output directory. [2]

## 11. Staged migration sequence

### Phase 0 — Review and freeze

- Approve this blueprint.
- Confirm the Cloudflare account and project name.
- Decide the feedback destination.
- Keep Netlify production unchanged.
- Do not change DNS.

### Phase 1 — Local migration implementation

- Keep Netlify Function files intact.
- Add and review Pages Function files.
- Add `_redirects` and `_headers`.
- Add a local Wrangler configuration only if needed.
- Adapt feedback handling or explicitly defer it.
- Add the GitHub Actions workflow only after the implementation is locally valid.
- Run `pnpm build` and syntax checks.

### Phase 2 — Cloudflare project setup

- Create Pages Direct Upload project.
- Add encrypted `GEMINI_API_KEY` for Production.
- Add optional `GEMINI_MODEL`.
- Create narrow Pages Edit API token.
- Add Cloudflare secrets to GitHub Actions.
- Do not add the Gemini key to GitHub.

### Phase 3 — Preview validation

- Deploy a controlled preview branch or preview deployment.
- Verify static routes and PWA assets.
- Verify `/api/gemini/insights`.
- Verify `/api/gemini/exchange-rate`.
- Confirm the selected currency is preserved in AI context.
- Verify structured error behavior with missing or invalid configuration.
- Verify the feedback path honestly reports its delivery state.

### Phase 4 — Production Pages deployment

- Run the workflow manually or merge the approved commit to `main`.
- Verify the generated `pages.dev` URL.
- Verify the exact production deployment commit.
- Run mobile and desktop smoke checks.
- Run Lighthouse on the Cloudflare URL.
- Compare LCP and JavaScript behavior against the current Netlify site.

### Phase 5 — Domain cutover

Only after Cloudflare is stable:

- Add the custom domain in Pages.
- Follow Cloudflare's DNS instructions.
- Update the relevant CNAME record to the Pages `pages.dev` hostname.
- Wait for DNS and certificate activation.
- Test the custom domain on desktop and mobile.
- Keep `budgital.netlify.app` available as fallback.

Cloudflare's migration guide states that a custom domain can be assigned to the Pages project and that the DNS record should point to the Pages `pages.dev` subdomain. [6]

### Phase 6 — Netlify retirement decision

After an observation period:

- Keep the Netlify site dormant as a fallback, or
- Remove it only after Cloudflare, Gemini, PWA, feedback, and domain behavior are all accepted.

Do not delete the Netlify site as part of the first Cloudflare deployment.

## 12. Validation matrix

The implementation will be considered ready for cutover only when the following are verified:

### Static and routing

- `/` returns the landing page.
- `/app` returns the app shell.
- Direct reload on `/app` does not show a 404.
- `/manus-routes.json` is valid.
- Manifest and service worker load.
- Hashed assets receive immutable caching.
- Service worker remains revalidating.
- Security headers are present on static responses.

### Privacy and onboarding

- Terms gate still blocks first use.
- Default currency selection persists.
- Dashboard shows the selected currency.
- No budget data is sent to Cloudflare except aggregate data explicitly submitted to Gemini.
- AI transparency copy remains accurate.
- Clear-data and CSV conflict-resolution safeguards remain intact.

### AI

- AED insight request succeeds with the configured key.
- Follow-up chat retains currency context.
- Exchange-rate requests use the correct endpoint.
- Missing key produces a safe configuration error.
- Invalid key does not expose the key or upstream secret.
- Gemini 400, 429, and 503 responses preserve structured client handling.
- Daily limits remain best-effort and are communicated accurately.

### Capture features

- Gallery receipt upload opens.
- Camera capture opens on supported mobile browsers.
- OCR failure produces an actionable message.
- Voice permission guidance is clear.
- Voice parsing does not save a transaction before user confirmation.
- Multi-currency voice commands preserve explicit currency codes.

### Feedback

- The form submits to the selected Cloudflare destination.
- Success is shown only after the destination confirms acceptance.
- Failure leaves the local fallback available.
- No Netlify-only form attributes remain in the active Cloudflare path.

### Performance and devices

- Mobile landing page loads without the desktop mascot becoming LCP.
- `/app` first paint remains lightweight.
- Light and dark themes render correctly.
- No horizontal overflow appears at mobile and tablet widths.
- PWA installation remains available.

## 13. Rollback plan

Rollback is intentionally simple:

1. Leave `budgital.netlify.app` online during migration.
2. If Cloudflare Pages fails, direct users back to the Netlify URL or keep the custom domain pointed at its previous destination.
3. Re-run the GitHub Actions workflow with the previous known-good commit if the Cloudflare deployment itself is faulty.
4. Keep the Netlify Function and `netlify.toml` files until the Cloudflare migration is accepted.
5. Do not rotate or delete the Gemini key until the Cloudflare Function has been verified.

Because all core user data is local in each user's browser, moving hosting does not migrate or delete budget records.

## 14. Cost and operational boundaries

The hosting plan is designed to use Cloudflare's free Pages path and GitHub Actions. Actual limits and account policies remain subject to Cloudflare's current plan terms.

Potential future usage costs or limits include:

- Gemini API usage.
- High-volume Pages Function invocations.
- D1, KV, or external feedback storage if selected.
- Custom domain registration, if a new domain is purchased.

The first migration will not introduce accounts, cloud backup, or centralized budget storage. Those features would change the privacy and cost model and should remain separate future phases.

## 15. Approval gates

No implementation or Cloudflare mutation should begin until these decisions are approved:

1. Use Cloudflare Pages Direct Upload rather than native Cloudflare Git integration.
2. Use GitHub Actions plus Wrangler for deployments.
3. Create the Pages project in account `d423d20a76930b0d5327f5896878cde5`.
4. Keep `budgital.netlify.app` live during migration.
5. Store `GEMINI_API_KEY` only as an encrypted Cloudflare Pages runtime secret.
6. Decide the replacement destination for feedback submissions.
7. Test on the `pages.dev` address before changing any custom-domain DNS.

## References

[1]: https://developers.cloudflare.com/pages/get-started/direct-upload/ "Cloudflare Pages Direct Upload"
[2]: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/ "Cloudflare Pages Direct Upload with continuous integration"
[3]: https://developers.cloudflare.com/pages/migrations/migrating-from-netlify/ "Cloudflare migration guide from Netlify to Pages"
[4]: https://developers.cloudflare.com/pages/functions/bindings/ "Cloudflare Pages Functions bindings, variables, and secrets"
[5]: https://developers.cloudflare.com/pages/migrations/migrating-from-netlify/ "Cloudflare headers and redirects migration behavior"
[6]: https://developers.cloudflare.com/pages/configuration/custom-domains/ "Cloudflare Pages custom domains"
