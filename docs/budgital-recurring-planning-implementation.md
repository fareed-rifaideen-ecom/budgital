

## Backup portability

The existing CSV backup now includes `recurring`, `template`, and `plan` record types in addition to transactions, categories, and legacy budgets. Recurring rules preserve schedule fields, currencies, active state, dates, and category IDs. Templates and monthly plans preserve their planned income and category-budget arrays as escaped JSON cells. Import merges by recurring/template ID and by plan month, so re-importing a backup updates those records instead of duplicating them.
