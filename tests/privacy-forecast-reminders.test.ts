import { describe, expect, it } from 'vitest';
import { createEncryptedSnapshot, decryptSnapshot, buildMonthlyForecast } from '../src/privacyFeatures';
import { upcomingRecurringReminders } from '../src/localReminders';

describe('encrypted snapshots', () => {
  it('round-trips payloads and rejects a wrong passphrase', async () => {
    const payload = { schemaVersion: 5, transactions: [{ id: 't1', amount: 42 }], secret: 'private' };
    const envelope = await createEncryptedSnapshot(payload, 'correct horse battery staple');
    expect(envelope.kind).toBe('budgital-encrypted-snapshot');
    expect(envelope.ciphertext).not.toContain('private');
    await expect(decryptSnapshot(envelope, 'wrong')).rejects.toThrow('passphrase');
    await expect(decryptSnapshot<typeof payload>(envelope, 'correct horse battery staple')).resolves.toEqual(payload);
  });
});

describe('monthly forecast', () => {
  it('projects current pace and flags a category that will exceed plan', () => {
    const forecast = buildMonthlyForecast({ month: '2026-10', today: '2026-10-15', plannedIncome: 5000, categoryBudgets: [{ categoryId: 'dining', amount: 200 }, { categoryId: 'rent', amount: 1000 }], transactions: [{ date: '2026-10-03', type: 'expense', amount: 120, categoryId: 'dining', currency: 'USD' }, { date: '2026-10-01', type: 'expense', amount: 1000, categoryId: 'rent', currency: 'USD' }], baseCurrency: 'USD', recurringCommitments: 1000 });
    expect(forecast.projectedSpend).toBeGreaterThan(forecast.actualSpend);
    expect(forecast.categories.find((item) => item.categoryId === 'dining')?.risk).toBe('over');
    expect(forecast.recurringCommitments).toBe(1000);
  });
});

describe('recurring reminders', () => {
  it('finds a monthly payment in the configured lead window', () => {
    const reminders = upcomingRecurringReminders([{ id: 'rent', description: 'Rent', amount: 1000, currency: 'AED', type: 'expense', frequency: 'monthly', dayOfMonth: 20, startDate: '2026-01-01', active: true }], '2026-10-15', 7);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].key).toBe('rent:2026-10-20');
  });
});
