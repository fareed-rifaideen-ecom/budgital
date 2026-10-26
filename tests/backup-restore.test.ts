import { describe, expect, it } from 'vitest';
import { buildBackupCsv, parseCsv } from '../src/App';

const categories = [
  { id: 'dining', name: 'Dining', color: '#ff9f0a', kind: 'expense' },
  { id: 'salary', name: 'Salary', color: '#30d158', kind: 'income' },
] as const;

const baseData = {
  isDemo: false,
  baseCurrency: 'AED',
  categories: [...categories],
  budgets: [],
  transactions: [
    {
      id: 'tx-recurring-1',
      type: 'expense',
      amount: 42.5,
      date: '2026-10-01',
      categoryId: 'dining',
      description: 'Monthly dinner, family',
      currency: 'AED',
      source: 'recurring',
      recurringId: 'rule-dining',
      occurrenceKey: 'rule-dining:2026-10-01',
    },
  ],
  recurringTransactions: [
    {
      id: 'rule-dining',
      type: 'expense',
      amount: 42.5,
      currency: 'AED',
      categoryId: 'dining',
      description: 'Monthly dinner, family',
      frequency: 'monthly',
      dayOfMonth: 1,
      dayOfWeek: 0,
      monthOfYear: 1,
      startDate: '2026-09-01',
      active: true,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  budgetTemplates: [],
  monthlyPlans: [],
  profile: {
    displayName: 'Fareed Rifaideen',
    workspaceName: 'Personal workspace',
    avatarStyle: 'initials',
    avatarColor: '#8cc4ff',
    updatedAt: '2026-10-26T00:00:00.000Z',
  },
};

describe('Budgital backup and restore', () => {
  it('exports recurring provenance fields and restores them through the parser', () => {
    const csv = buildBackupCsv(baseData as any);
    const imported = parseCsv(csv, [...categories], []);
    const transaction = imported.find((row) => row.recordType === 'transaction');
    const recurring = imported.find((row) => row.recordType === 'recurring');

    expect(csv).toContain('"source"');
    expect(csv).toContain('"recurringId"');
    expect(csv).toContain('"occurrenceKey"');
    expect(transaction).toMatchObject({
      id: 'tx-recurring-1',
      source: 'recurring',
      recurringId: 'rule-dining',
      occurrenceKey: 'rule-dining:2026-10-01',
      description: 'Monthly dinner, family',
      valid: true,
    });
    expect(recurring).toMatchObject({
      recordType: 'recurring',
      importRecurring: expect.objectContaining({ id: 'rule-dining', categoryId: 'dining' }),
      valid: true,
    });
  });

  it('exports and restores a local profile record', () => {
    const csv = buildBackupCsv(baseData as any);
    const imported = parseCsv(csv, [...categories], []);
    const profile = imported.find((row) => row.recordType === 'profile');

    expect(csv).toContain('profileDisplayName');
    expect(profile).toMatchObject({
      recordType: 'profile',
      valid: true,
      importProfile: {
        displayName: 'Fareed Rifaideen',
        workspaceName: 'Personal workspace',
        avatarStyle: 'initials',
        avatarColor: '#8cc4ff',
      },
    });
  });

  it('keeps quoted commas and legacy transaction CSVs compatible', () => {
    const legacyCsv = [
      'date,type,amount,category,description',
      '2026-10-12,expense,24.50,Dining,"Lunch, family"',
    ].join('\n');
    const imported = parseCsv(legacyCsv, [...categories], []);

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      date: '2026-10-12',
      amount: 24.5,
      categoryId: 'dining',
      description: 'Lunch, family',
      valid: true,
    });
    expect(imported[0].source).toBeUndefined();
    expect(imported[0].recurringId).toBeUndefined();
    expect(imported[0].occurrenceKey).toBeUndefined();
  });

  it('flags an existing ID without creating an invalid record', () => {
    const csv = [
      'recordType,id,date,type,amount,category,description,source,recurringId,occurrenceKey',
      'transaction,tx-recurring-1,2026-10-01,expense,42.50,Dining,"Monthly dinner, family",recurring,rule-dining,rule-dining:2026-10-01',
    ].join('\n');
    const imported = parseCsv(csv, [...categories], [baseData.transactions[0] as any]);

    expect(imported[0]).toMatchObject({
      valid: true,
      warning: 'Updates existing ID',
      recurringId: 'rule-dining',
      occurrenceKey: 'rule-dining:2026-10-01',
    });
  });
});
