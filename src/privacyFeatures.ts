export type EncryptedSnapshotEnvelope = {
  kind: 'budgital-encrypted-snapshot';
  version: 1;
  cipher: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  createdAt: string;
  clientVersion: string;
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SNAPSHOT_KIND = 'budgital-encrypted-snapshot' as const;
const SNAPSHOT_VERSION = 1 as const;
const PBKDF2_ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function deriveKey(passphrase: string, salt: Uint8Array) {
  if (!passphrase.trim()) throw new Error('Enter a passphrase to protect this backup.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptSnapshot(payload: unknown, passphrase: string): Promise<EncryptedSnapshotEnvelope> {
  if (!crypto?.subtle) throw new Error('This browser does not support encrypted backups.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  return { kind: SNAPSHOT_KIND, version: SNAPSHOT_VERSION, cipher: 'AES-GCM-256', kdf: 'PBKDF2-SHA-256', iterations: PBKDF2_ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), createdAt: new Date().toISOString(), clientVersion: 'budgital-web-1', ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}
export async function createEncryptedSnapshot(payload: unknown, passphrase: string) {
  return encryptSnapshot(payload, passphrase);
}
export async function decryptSnapshot<T>(envelope: EncryptedSnapshotEnvelope, passphrase: string): Promise<T> {
  if (envelope?.kind !== SNAPSHOT_KIND || envelope.version !== SNAPSHOT_VERSION || envelope.cipher !== 'AES-GCM-256' || envelope.kdf !== 'PBKDF2-SHA-256') throw new Error('This is not a supported Budgital encrypted backup.');
  try {
    const key = await deriveKey(passphrase, base64ToBytes(envelope.salt));
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(base64ToBytes(envelope.iv)) }, key, new Uint8Array(base64ToBytes(envelope.ciphertext)));
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch { throw new Error('The passphrase is incorrect or this backup was changed.'); }
}

export type ForecastCategory = { categoryId: string; planned: number; actual: number; projected: number; variance: number; risk: 'watch' | 'over' | 'on-track' };
export type MonthlyForecast = { month: string; plannedIncome: number; actualIncome: number; plannedSpend: number; actualSpend: number; projectedSpend: number; projectedVariance: number; completion: number; recurringCommitments: number; categories: ForecastCategory[] };
export function buildMonthlyForecast(input: { month: string; today: string; plannedIncome: number; categoryBudgets: { categoryId: string; amount: number }[]; transactions: { date: string; type: 'income' | 'expense'; amount: number; categoryId: string; fxRateToBase?: number; currency?: string }[]; baseCurrency: string; recurringCommitments: number }): MonthlyForecast {
  const [year, monthNumber] = input.month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const isCurrent = input.today.slice(0, 7) === input.month;
  const elapsed = isCurrent ? Math.min(Math.max(Number(input.today.slice(8, 10)), 1), daysInMonth) : input.today > `${input.month}-31` ? daysInMonth : 0;
  const completion = elapsed / daysInMonth;
  const toBase = (item: { amount: number; currency?: string; fxRateToBase?: number }) => !item.currency || item.currency === input.baseCurrency ? item.amount : Number(item.fxRateToBase) > 0 ? item.amount * Number(item.fxRateToBase) : 0;
  const inMonth = input.transactions.filter((item) => item.date.startsWith(input.month));
  const actualIncome = inMonth.filter((item) => item.type === 'income').reduce((sum, item) => sum + toBase(item), 0);
  const actualSpend = inMonth.filter((item) => item.type === 'expense').reduce((sum, item) => sum + toBase(item), 0);
  const plannedSpend = input.categoryBudgets.reduce((sum, item) => sum + item.amount, 0);
  const projectedSpend = isCurrent && completion > 0 ? actualSpend / completion : actualSpend;
  const categories = input.categoryBudgets.map((budget) => {
    const actual = inMonth.filter((item) => item.type === 'expense' && item.categoryId === budget.categoryId).reduce((sum, item) => sum + toBase(item), 0);
    const projected = isCurrent && completion > 0 ? actual / completion : actual;
    const variance = budget.amount - projected;
    const risk: ForecastCategory['risk'] = variance < 0 ? 'over' : projected > budget.amount * 0.85 ? 'watch' : 'on-track';
    return { categoryId: budget.categoryId, planned: budget.amount, actual, projected, variance, risk };
  });
  return { month: input.month, plannedIncome: input.plannedIncome, actualIncome, plannedSpend, actualSpend, projectedSpend, projectedVariance: plannedSpend - projectedSpend, completion, recurringCommitments: input.recurringCommitments, categories };
}
