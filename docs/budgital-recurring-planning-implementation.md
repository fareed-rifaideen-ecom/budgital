

## Backup portability

The existing CSV backup now includes `recurring`, `template`, and `plan` record types in addition to transactions, categories, and legacy budgets. Recurring rules preserve schedule fields, currencies, active state, dates, and category IDs. Templates and monthly plans preserve their planned income and category-budget arrays as escaped JSON cells. Import merges by recurring/template ID and by plan month, so re-importing a backup updates those records instead of duplicating them.


## Recurring transaction provenance

Backup CSVs now preserve `source`, `recurringId`, and `occurrenceKey` for transaction rows. Older CSVs without these columns remain valid; missing values are treated as optional. This keeps catch-up transactions linked to their recurring rule after export and restore, allowing future edits, audits, and duplicate checks to retain their original provenance.
