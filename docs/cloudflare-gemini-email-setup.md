# Budgital Cloudflare Gemini and Email Setup

This setup is for the Cloudflare Pages project named `budgital` in the Cloudflare account `budgital`.

## 1. Open the project settings

In Cloudflare Dashboard, open **Workers & Pages**, choose the `budgital` account, open the Pages project, and go to **Settings → Variables and Secrets**.

Create the following Production settings:

| Name | Type | Value |
|---|---|---|
| `GEMINI_API_KEY` | Encrypted secret | The rotated Google AI Studio Gemini key |
| `GEMINI_MODEL` | Plain variable | `gemini-flash-lite-latest` |
| `RESEND_API_KEY` | Encrypted secret | API key from Resend |
| `FEEDBACK_TO_EMAIL` | Plain variable | The inbox that should receive Budgital feedback |
| `FEEDBACK_FROM_EMAIL` | Plain variable | A verified sender such as `Budgital <feedback@your-domain.com>` |

The three email settings are used by the Cloudflare Pages Function at `POST /api/feedback`. The Gemini settings are used by the Pages Functions at `/api/gemini/insights` and `/api/gemini/exchange-rate`.

Never use `VITE_` in front of any secret. Vite variables are eligible for browser exposure; these values must remain server-side in Pages Functions.

## 2. Set up Gemini

1. Open Google AI Studio.
2. Create or use the rotated Gemini API key.
3. Copy it without adding it to the repository or GitHub Actions.
4. In Cloudflare Pages, add it as the encrypted Production secret `GEMINI_API_KEY`.
5. Add `GEMINI_MODEL` as `gemini-flash-lite-latest` unless a different supported model is intentionally selected.
6. Redeploy the Pages project after saving the variables. Pages Functions receive the values at runtime through `context.env`.

The browser never receives the Gemini key. The app sends only its validated aggregate AI snapshot to the server-side Function.

## 3. Set up email notifications with Resend

Resend is the initial provider used by the Cloudflare feedback Function because it exposes a simple HTTPS email API that a Pages Function can call with `fetch`.

1. Create or sign in to a Resend account.
2. Create an API key with the smallest permission that can send email.
3. Verify the sending domain in Resend. For a temporary test, use the sender address Resend permits for your account; for production, use a domain you control.
4. Add the API key to Cloudflare as the encrypted Production secret `RESEND_API_KEY`.
5. Set `FEEDBACK_TO_EMAIL` to the inbox where you want feedback delivered.
6. Set `FEEDBACK_FROM_EMAIL` to a verified sender, for example `Budgital <feedback@your-domain.com>`.
7. Save the settings and redeploy.

The Function sends only the submitted feedback fields. It does not include budget transactions, category totals, AI snapshots, or local-storage data.

## 4. What users will see

When email delivery succeeds, the form shows a sent confirmation. If the provider is missing, unavailable, or rejects the request, the app stores the note locally as a fallback and tells the user that delivery could not be completed.

The endpoint validates the feedback type, message length, optional reply email, origin, body size, and request rate. A honeypot field and structured error responses provide basic abuse protection without requiring an account system.

## 5. Local development

Do not create a committed `.dev.vars` file. If testing Pages Functions locally with Wrangler, use an ignored local secrets file containing test-only values:

```text
GEMINI_API_KEY=replace-with-a-test-key
GEMINI_MODEL=gemini-flash-lite-latest
RESEND_API_KEY=replace-with-a-test-key
FEEDBACK_TO_EMAIL=you@example.com
FEEDBACK_FROM_EMAIL=Budgital <feedback@example.com>
```

Use a verified sender before attempting a real email. A missing provider configuration should return a safe `503` response and must not reveal secret values.

## References

[1]: https://developers.cloudflare.com/pages/functions/bindings/ "Cloudflare Pages Functions bindings"
[2]: https://developers.cloudflare.com/workers/configuration/secrets/ "Cloudflare Workers secrets"
[3]: https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/ "Cloudflare Workers tutorial for sending email with Resend"
[4]: https://resend.com/docs/api-reference/emails/send-email "Resend send email API"
