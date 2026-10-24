# Budgital Cloudflare Pages Migration Plan

**Status:** Proposal for review only. No Cloudflare project, application files, secrets, workflows, or production deployment have been changed.

## Recommendation

Use a **Cloudflare Pages Direct Upload project deployed by GitHub Actions with Wrangler**. This keeps the build reproducible in GitHub Actions, avoids dependence on the exhausted Netlify production-deploy path, and lets us deploy both the Vite `dist/` assets and Cloudflare Pages Functions from the repository.

Cloudflare documents Direct Upload specifically for prebuilt assets and continuous-integration workflows. Its Wrangler deployment can also upload a `functions` directory when that directory exists in the project root. [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) [Cloudflare CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

I do **not** recommend connecting this new Pages project through Cloudflare's native Git integration if the goal is an explicit GitHub Actions pipeline. Cloudflare notes that a Direct Upload project cannot later be switched to Git integration, so we should choose one model and keep it consistent. [Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)

## Target architecture

```text
GitHub main push
  -> GitHub Actions
     -> install dependencies
     -> TypeScript/build validation
     -> pnpm run build
     -> Wrangler Pages deployment
        -> dist/ static assets
        -> functions/ Pages Functions

Browser
  -> Cloudflare Pages static site
  -> /api/gemini/insights      Pages Function
  -> /api/gemini/exchange-rate Pages Function
```

Budgital remains local-first. Budget data, transactions, categories, and preferences remain in browser storage. Cloudflare is used only for static hosting and the optional AI proxy. The Gemini key remains server-side and is never included in the browser bundle.

## Required application migration

### 1. Replace the Netlify Gemini adapter

The current implementation depends on a Node request/response adapter and `process.env.GEMINI_API_KEY`. Cloudflare Pages Functions use the Workers-style `Request`, `Response`, and `context.env` model. Pages Functions are designed for server-side code at the edge and support runtime bindings through `context.env`. [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)

Proposed structure:

```text
functions/
  api/
    gemini/
      insights.js
      exchange-rate.js
  _lib/
    gemini.js
```

The shared function logic will be adapted to:

- Accept a standard `Request`.
- Read `GEMINI_API_KEY` and optional `GEMINI_MODEL` from `context.env`.
- Return standard `Response` objects.
- Preserve the existing validation, aggregate-only AI snapshot, selected-currency context, daily limits, error codes, and privacy guardrails.
- Keep `/api/gemini/insights` and `/api/gemini/exchange-rate` URLs unchanged so the frontend requires no API URL change.

The current in-memory daily limit can be preserved as a lightweight guard, but it is not a durable global quota because edge isolates are independent. That limitation should be documented in the AI transparency copy. A durable quota would require an additional Cloudflare binding such as KV or D1 and is not necessary for the first migration.

### 2. Replace Netlify Forms

Netlify Forms will not collect submissions after the site is moved to Cloudflare Pages. The existing feedback forms must be changed to one of these options:

- **Recommended first migration:** keep the form UI and submit to a new `/api/feedback` Pages Function. During the initial cutover, the function can return a clear success response and log only minimal metadata. This preserves the user experience but does not yet provide durable inbox delivery.
- **Free external delivery:** forward validated submissions to a selected form/email provider with a free tier. This requires choosing and configuring a separate provider and storing its secret in Cloudflare.
- **Cloudflare storage:** store submissions in D1, which adds a database binding and a privacy/data-retention decision.

The migration should not claim that feedback was received until a durable destination is selected and tested. Existing local fallback behavior can remain as a graceful failure path.

### 3. Replace Netlify configuration files

The current `netlify.toml` will not control Cloudflare Pages. We should add:

```text
public/_redirects
public/_headers
```

`public/_redirects` should preserve the SPA route:

```text
/app    /index.html    200
/app/*  /index.html    200
```

The API paths will be handled by Pages Functions, not by Netlify redirects.

`public/_headers` should carry over the important security and caching behavior:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Immutable caching for hashed `/assets/*`
- Revalidation for `/sw.js`

The existing `netlify.toml` can remain temporarily for rollback or the Netlify site, but it will no longer be the active production routing configuration for Cloudflare.

## Cloudflare setup steps

### Step 1: Create the Pages project

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Choose **Create application** → **Pages**.
3. Choose **Direct Upload**.
4. Create a project named `budgital` or another available name.
5. Set the production branch to `main` if prompted.

Do not upload through dashboard drag-and-drop for the final architecture because Cloudflare documents that dashboard drag-and-drop does not currently compile a `functions` folder. Wrangler should be used for deployments containing Pages Functions. [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

### Step 2: Configure Cloudflare secrets

In the Pages project, go to **Settings → Variables and Secrets** and add:

```text
GEMINI_API_KEY       encrypted secret, production
GEMINI_MODEL        optional plain variable or secret, production
```

Cloudflare Pages Functions read these through `context.env`. Secrets are encrypted and are not visible after being set. Configure preview values separately if preview deployments will call Gemini. [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)

### Step 3: Create a narrowly scoped Cloudflare API token

Create an Account API token with:

- Account: Cloudflare Pages — Edit

Also record the Cloudflare Account ID from the Cloudflare dashboard. Cloudflare's CI documentation specifically uses `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for Wrangler deployments. [Cloudflare CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

### Step 4: Add GitHub Actions secrets

In `fareed-rifaideen-ecom/budgital`:

**Settings → Secrets and variables → Actions → New repository secret**

Add:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Do not add `GEMINI_API_KEY` to GitHub Actions. It belongs in Cloudflare Pages runtime secrets and is not needed to build the frontend.

## Proposed GitHub Actions workflow

After you approve the migration, add `.github/workflows/cloudflare-pages.yml`:

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

This follows Cloudflare's documented Wrangler Action pattern, while using Budgital's existing pnpm and Node 22 toolchain. [Cloudflare CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

The first workflow run should be a manual `workflow_dispatch` run or a controlled push after the Cloudflare project and secrets are ready. Once it succeeds, normal pushes to `main` will deploy automatically.

## Validation and cutover strategy

### Before production cutover

1. Build locally with `pnpm build`.
2. Run TypeScript and existing syntax checks.
3. Run the Pages Function locally with Wrangler.
4. Verify `/`, `/app`, `/manus-routes.json`, `/manifest.webmanifest`, and `/sw.js`.
5. Verify both Gemini endpoints with a safe aggregate AED snapshot.
6. Confirm Gemini errors are structured and do not expose the API key.
7. Test light/dark mode, onboarding, currency selection, transaction entry, CSV import/export, receipt OCR, voice entry, and feedback behavior.
8. Deploy a preview branch and inspect the Pages preview URL.

### Production cutover

1. Deploy the approved commit to Cloudflare Pages.
2. Verify the `pages.dev` production URL.
3. Test Gemini and the full smoke-test flow.
4. Add a custom domain only after the Pages deployment is stable.
5. Keep Netlify live during an observation period.
6. Do not change or delete the Netlify site until Cloudflare production and the feedback destination are confirmed.

### Rollback

Rollback is performed by redeploying the previous known-good GitHub commit through the same workflow. The Netlify site remains an additional fallback until the Cloudflare migration is accepted.

## Key risks and decisions for review

1. **Netlify Forms:** this is the largest functional gap. Cloudflare hosting alone will not preserve Netlify Form collection.
2. **Gemini adapter:** the current Node adapter must be rewritten for Pages Functions; copying it unchanged will fail in the Workers runtime.
3. **Direct Upload is a one-way project choice:** Cloudflare states that Direct Upload projects cannot later be switched to Git integration. The recommended plan therefore uses Direct Upload plus GitHub Actions from the beginning.
4. **Cloudflare limits can change:** Pages and Functions availability, quotas, and free-tier limits should be checked in the Cloudflare account before production launch.
5. **Secrets must be configured twice if previews use AI:** production and preview environments are separate runtime configurations.

## Proposed implementation order after approval

1. Create the Cloudflare Pages Direct Upload project.
2. Add and verify Cloudflare API credentials in GitHub Actions secrets.
3. Adapt the Gemini proxy to Pages Functions.
4. Add `_redirects` and `_headers`.
5. Replace or temporarily disable Netlify Forms behavior with an explicit feedback migration path.
6. Add the GitHub Actions workflow.
7. Run local and preview validation.
8. Deploy production to Cloudflare Pages.
9. Verify the live site and keep Netlify available for rollback.
