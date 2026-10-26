export type ReminderPreferences = { enabled: boolean; leadDays: number; notified: Record<string, string> };
export const REMINDER_KEY = 'budgital-reminders-v1';
export const defaultReminderPreferences: ReminderPreferences = { enabled: false, leadDays: 7, notified: {} };
export function loadReminderPreferences(): ReminderPreferences {
  try { const value = JSON.parse(localStorage.getItem(REMINDER_KEY) ?? 'null') as Partial<ReminderPreferences> | null; return { ...defaultReminderPreferences, ...value, notified: value?.notified ?? {} }; } catch { return defaultReminderPreferences; }
}
export function saveReminderPreferences(value: ReminderPreferences) { localStorage.setItem(REMINDER_KEY, JSON.stringify(value)); }
export function browserNotificationState() { if (!('Notification' in window)) return 'unsupported' as const; return Notification.permission; }
export async function enableBrowserReminders() { if (!('Notification' in window)) return 'unsupported' as const; return Notification.requestPermission(); }
export type UpcomingReminder = { key: string; description: string; date: string; amount: number; currency: string; type: 'income' | 'expense' };
export function upcomingRecurringReminders(rules: { id: string; description: string; amount: number; currency: string; type: 'income' | 'expense'; frequency: 'monthly' | 'weekly' | 'yearly'; dayOfMonth?: number; dayOfWeek?: number; monthOfYear?: number; startDate: string; endDate?: string; active: boolean }[], today: string, days = 7): UpcomingReminder[] {
  const start = new Date(`${today}T12:00:00`); const end = new Date(start); end.setDate(end.getDate() + days); const result: UpcomingReminder[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    for (let offset = 0; offset <= days; offset += 1) {
      const date = new Date(start); date.setDate(start.getDate() + offset); const iso = date.toISOString().slice(0, 10);
      if (iso < rule.startDate || (rule.endDate && iso > rule.endDate)) continue;
      const matches = rule.frequency === 'weekly' ? date.getDay() === (rule.dayOfWeek ?? new Date(`${rule.startDate}T12:00:00`).getDay()) : rule.frequency === 'yearly' ? date.getMonth() + 1 === (rule.monthOfYear ?? Number(rule.startDate.slice(5, 7))) && date.getDate() === (rule.dayOfMonth ?? Number(rule.startDate.slice(8, 10))) : date.getDate() === Math.min(rule.dayOfMonth ?? 1, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());
      if (matches) { result.push({ key: `${rule.id}:${iso}`, description: rule.description, date: iso, amount: rule.amount, currency: rule.currency, type: rule.type }); break; }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function sendReminderNotification(reminder: UpcomingReminder) { if (!('Notification' in window) || Notification.permission !== 'granted') return false; new Notification(`${reminder.type === 'expense' ? 'Upcoming payment' : 'Upcoming income'} · ${reminder.description}`, { body: `${reminder.date} · ${reminder.currency} ${reminder.amount.toFixed(2)}`, tag: `budgital-${reminder.key}` }); return true; }
