# Budgital privacy backup, forecasting, and reminders

## Product boundary

Budgital remains local-first. The new backup flow encrypts a complete workspace in the browser before any file or future cloud adapter sees it. No passphrase is sent to a server, and no automatic upload is performed.

## Encrypted snapshot contract

The portable envelope is versioned and contains `kind: budgital-encrypted-snapshot`, `version`, `cipher: AES-GCM-256`, `kdf: PBKDF2-SHA-256`, `iterations`, `salt`, `iv`, `createdAt`, `clientVersion`, and base64url `ciphertext`. The plaintext is the migrated `BudgitalData` object. The future cloud row stores only this envelope plus an opaque snapshot ID, owner/account ID, byte size, created/updated timestamps, and optional client label. It must never store plaintext categories, transactions, passphrases, or derived keys.

The browser derives a non-exportable AES-GCM key from the passphrase with PBKDF2 and a random salt. Each snapshot gets a fresh 96-bit IV. Decryption authenticates the ciphertext before JSON parsing. Wrong passphrases and tampered snapshots fail closed.

## Forecasting

Forecasts are deterministic and local. For the active month, actual expense pace is `monthToDateSpend / elapsedDays * daysInMonth`; projected end-of-month spend is compared with the monthly plan. Category risk uses the same pace when a category has a plan. Completed historical months provide a recent average when available. Recurring active rules are shown as commitments, not silently added to actuals.

## Notifications

Browser notifications are opt-in. Budgital requests permission only after the user presses the enable button. The local preference stores enabled state, lead days, and occurrence keys already notified. The app checks the next seven days on focus/visibility changes and session startup, with one notification per rule/occurrence. If permission is denied or unsupported, the UI remains usable and shows an in-app reminder list instead.

## Provider/auth boundary

A future cloud adapter may use an authenticated owner-scoped API or Supabase RLS. It must provide explicit save/list/restore/delete operations, per-owner authorization, rate limits, and encrypted-envelope-only storage. The current phase does not invent an account or silently sync local data.
