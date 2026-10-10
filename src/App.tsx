import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coffee,
  Download,
  FileUp,
  Home,
  Landmark,
  Moon,
  MoreHorizontal,
  Plus,
  Receipt,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';

type TransactionType = 'income' | 'expense';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'LKR' | 'INR' | 'AUD' | 'CAD' | 'JPY';
const currencyOptions: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' }, { code: 'EUR', label: 'Euro', symbol: '€' }, { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'LKR', label: 'Sri Lankan Rupee', symbol: 'Rs' }, { code: 'INR', label: 'Indian Rupee', symbol: '₹' }, { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' }, { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
];
function currencySymbol(code: CurrencyCode) { return currencyOptions.find((item) => item.code === code)?.symbol ?? code; }
type View = 'overview' | 'transactions' | 'budgets' | 'data';
type Theme = 'light' | 'dark';
type AiInsight = { headline: string; bullets: string[]; nextStep: string };
type AiMessage = { id: string; role: 'user' | 'assistant'; text: string };
type RangePreset = 'thisMonth' | 'lastMonth' | 'last3' | 'last6' | 'ytd' | 'all' | 'custom';
type DateRange = { start: string; end: string; preset: RangePreset };
type Totals = { income: number; expenses: number; budget: number; left: number; budgetLeft: number; budgetMonths: number };

type Category = {
  id: string;
  name: string;
  color: string;
  kind: 'expense' | 'income' | 'both';
};

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  description: string;
  currency?: CurrencyCode;
  fxRateToBase?: number;
  fxSource?: string;
};

type Budget = {
  categoryId: string;
  amount: number;
};

type BudgitalData = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  isDemo: boolean;
  baseCurrency?: CurrencyCode;
};

type ImportRow = Transaction & { valid: boolean; error?: string; recordType?: 'transaction' | 'category' | 'budget'; importCategory?: Category; importBudget?: Budget };

const STORAGE_KEY = 'budgetly-data-v1';
const SETTINGS_KEY = 'budgetly-settings-v1';
const AI_DAILY_LIMIT = 12;
const AI_USAGE_KEY = 'budgital-ai-usage-v1';
function usageToday() {
  const day = localISO(new Date());
  try {
    const stored = JSON.parse(localStorage.getItem(AI_USAGE_KEY) ?? '{}') as { day?: string; count?: number };
    return stored.day === day ? Math.max(0, Number(stored.count) || 0) : 0;
  } catch { return 0; }
}
function consumeAiUse() {
  const day = localISO(new Date());
  const count = usageToday();
  if (count >= AI_DAILY_LIMIT) return false;
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify({ day, count: count + 1 }));
  return true;
}
function releaseAiUse() {
  const day = localISO(new Date());
  const count = usageToday();
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify({ day, count: Math.max(0, count - 1) }));
}

const colors = ['#c8ee68', '#ffb59d', '#8cc4ff', '#caa7f8', '#f3cc69', '#75d2c1', '#f28c9a', '#9aa9a4'];
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const pad2 = (value: number) => String(value).padStart(2, '0');
const localISO = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const isoDate = (date = new Date()) => localISO(date);
const monthKey = (date: string) => date.slice(0, 7);
const currentMonth = isoDate().slice(0, 7);

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadTheme(): Theme {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { theme?: Theme };
    if (stored.theme === 'light' || stored.theme === 'dark') return stored.theme;
  } catch {
    // Fall through to the system preference when settings are unavailable.
  }
  return systemTheme();
}

const defaultCategories: Category[] = [
  { id: 'rent', name: 'Housing', color: '#8cc4ff', kind: 'expense' },
  { id: 'food', name: 'Groceries', color: '#c8ee68', kind: 'expense' },
  { id: 'dining', name: 'Dining', color: '#ffb59d', kind: 'expense' },
  { id: 'transport', name: 'Transport', color: '#caa7f8', kind: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#f3cc69', kind: 'expense' },
  { id: 'health', name: 'Health', color: '#75d2c1', kind: 'expense' },
  { id: 'salary', name: 'Salary', color: '#75d2c1', kind: 'income' },
  { id: 'other-income', name: 'Other income', color: '#9aa9a4', kind: 'income' },
];

function demoData(): BudgitalData {
  const month = currentMonth;
  const date = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
  const previous = new Date();
  previous.setMonth(previous.getMonth() - 1);
  const previousMonth = previous.toISOString().slice(0, 7);
  return {
    categories: defaultCategories,
    budgets: [
      { categoryId: 'rent', amount: 1600 },
      { categoryId: 'food', amount: 600 },
      { categoryId: 'dining', amount: 320 },
      { categoryId: 'transport', amount: 250 },
      { categoryId: 'subscriptions', amount: 120 },
      { categoryId: 'health', amount: 180 },
    ],
    transactions: [
      { id: makeId(), type: 'income', amount: 5200, date: date(1), categoryId: 'salary', description: 'Monthly paycheck' },
      { id: makeId(), type: 'income', amount: 800, date: date(12), categoryId: 'other-income', description: 'Freelance project' },
      { id: makeId(), type: 'expense', amount: 1600, date: date(2), categoryId: 'rent', description: 'Apartment rent' },
      { id: makeId(), type: 'expense', amount: 538, date: date(6), categoryId: 'food', description: 'Weekly groceries' },
      { id: makeId(), type: 'expense', amount: 422, date: date(9), categoryId: 'dining', description: 'Restaurants & coffee' },
      { id: makeId(), type: 'expense', amount: 180, date: date(11), categoryId: 'transport', description: 'Metro + rideshare' },
      { id: makeId(), type: 'expense', amount: 96, date: date(4), categoryId: 'subscriptions', description: 'Streaming + software' },
      { id: makeId(), type: 'expense', amount: 82, date: date(14), categoryId: 'health', description: 'Pharmacy' },
      { id: makeId(), type: 'expense', amount: 3100, date: `${previousMonth}-12`, categoryId: 'rent', description: 'Previous month snapshot' },
    ],
    isDemo: true,
  };
}

function loadData(): BudgitalData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { const parsed = JSON.parse(stored) as BudgitalData; return { ...parsed, baseCurrency: parsed.baseCurrency ?? 'USD' }; }
  } catch {
    // Fall back to the friendly starter state when storage is unavailable.
  }
  return demoData();
}

function formatCurrency(value: number, currency?: CurrencyCode) {
  let active = currency;
  if (!active) {
    try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { baseCurrency?: CurrencyCode }; active = stored.baseCurrency ?? 'USD'; } catch { active = 'USD'; }
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: active, maximumFractionDigits: active === 'JPY' ? 0 : 0 }).format(Math.abs(value));
}
function amountInBase(transaction: Transaction, baseCurrency: CurrencyCode = 'USD') {
  if (!transaction.currency || transaction.currency === baseCurrency) return transaction.amount;
  const rate = Number(transaction.fxRateToBase);
  return Number.isFinite(rate) && rate > 0 ? transaction.amount * rate : 0;
}
function hasKnownBaseAmount(transaction: Transaction, baseCurrency: CurrencyCode = 'USD') {
  return !transaction.currency || transaction.currency === baseCurrency || (Number(transaction.fxRateToBase) > 0);
}
function payloadConfidence(payload: Record<string, unknown>) { return typeof payload.confidence === 'string' ? payload.confidence : 'low'; }

function formatCompactCurrency(value: number, currency?: CurrencyCode) {
  let active = currency;
  if (!active) { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { baseCurrency?: CurrencyCode }; active = stored.baseCurrency ?? 'USD'; } catch { active = 'USD'; } }
  if (Math.abs(value) >= 1000) return `${currencySymbol(active)}${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return formatCurrency(value, active);
}

const VIEW_IDS: View[] = ['overview', 'transactions', 'budgets', 'data'];

function readViewFromHash(): View {
  const hash = window.location.hash.replace(/^#\/?/, '') as View;
  return VIEW_IDS.includes(hash) ? hash : 'overview';
}

function getCategory(categories: Category[], id: string) {
  return categories.find((category) => category.id === id) ?? { id, name: 'Uncategorized', color: '#9aa9a4', kind: 'both' as const };
}

function getMonthLabel(month: string) {
  return monthFormatter.format(new Date(`${month}-01T12:00:00`));
}

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split('-').map(Number);
  const shifted = new Date(year, value - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}`;
}

const monthLastDay = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return `${month}-${pad2(new Date(year, value, 0).getDate())}`;
};
const addDays = (iso: string, delta: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return localISO(date);
};
const daySpan = (start: string, end: string) => Math.max(Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1, 1);

function buildRange(preset: RangePreset, anchor: string, custom: { start: string; end: string }, transactions: Transaction[]): DateRange {
  switch (preset) {
    case 'lastMonth': {
      const month = shiftMonth(anchor, -1);
      return { preset, start: `${month}-01`, end: monthLastDay(month) };
    }
    case 'last3':
      return { preset, start: `${shiftMonth(anchor, -2)}-01`, end: monthLastDay(anchor) };
    case 'last6':
      return { preset, start: `${shiftMonth(anchor, -5)}-01`, end: monthLastDay(anchor) };
    case 'ytd':
      return { preset, start: `${anchor.slice(0, 4)}-01-01`, end: monthLastDay(anchor) };
    case 'all': {
      if (!transactions.length) return { preset, start: `${anchor}-01`, end: monthLastDay(anchor) };
      const earliest = transactions.reduce((min, item) => (item.date < min ? item.date : min), transactions[0].date);
      const latest = transactions.reduce((max, item) => (item.date > max ? item.date : max), transactions[0].date);
      return { preset, start: earliest, end: latest };
    }
    case 'custom': {
      const start = custom.start <= custom.end ? custom.start : custom.end;
      const end = custom.start <= custom.end ? custom.end : custom.start;
      return { preset, start, end };
    }
    default:
      return { preset: 'thisMonth', start: `${anchor}-01`, end: monthLastDay(anchor) };
  }
}

// Monthly plans are prorated so a partial month compares only its share of the plan.
function budgetFactor(range: DateRange) {
  let total = 0;
  let cursor = range.start.slice(0, 7);
  const lastMonth = range.end.slice(0, 7);
  for (let guard = 0; guard < 600; guard += 1) {
    const monthStart = `${cursor}-01`;
    const monthEnd = monthLastDay(cursor);
    const from = range.start > monthStart ? range.start : monthStart;
    const to = range.end < monthEnd ? range.end : monthEnd;
    total += daySpan(from, to) / Number(monthEnd.slice(8, 10));
    if (cursor === lastMonth) break;
    cursor = shiftMonth(cursor, 1);
  }
  return Math.max(Math.round(total * 100) / 100, 0.01);
}

function formatMonthCount(value: number) {
  return Math.abs(value - Math.round(value)) < 0.05 ? String(Math.round(value)) : value.toFixed(1);
}

function monthsCovered(range: DateRange) {
  const start = range.start.slice(0, 7);
  const end = range.end.slice(0, 7);
  const months = (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + (Number(end.slice(5, 7)) - Number(start.slice(5, 7))) + 1;
  return Math.max(months, 1);
}

function previousRange(range: DateRange): DateRange | null {
  if (range.preset === 'all') return null;
  if (['thisMonth', 'lastMonth', 'last3', 'last6', 'ytd'].includes(range.preset)) {
    const months = monthsCovered(range);
    const endMonth = shiftMonth(range.end.slice(0, 7), -months);
    const startMonth = shiftMonth(endMonth, -(months - 1));
    return { preset: 'custom', start: `${startMonth}-01`, end: monthLastDay(endMonth) };
  }
  const span = daySpan(range.start, range.end);
  const end = addDays(range.start, -1);
  return { preset: 'custom', start: addDays(end, -(span - 1)), end };
}

function rangeLabel(range: DateRange) {
  if (range.preset === 'all') return 'All time';
  if (range.preset === 'ytd') return `${range.start.slice(0, 4)} year to date`;
  const startMonth = range.start.slice(0, 7);
  const endMonth = range.end.slice(0, 7);
  if (startMonth === endMonth) return getMonthLabel(endMonth);
  const startDay = Number(range.start.slice(8, 10));
  const endDay = Number(range.end.slice(8, 10));
  const span = monthsCovered(range);
  if (range.preset === 'custom' && span === 1) return `${getMonthLabel(endMonth).split(' ')[0]} ${startDay} – ${endDay}`;
  return `${getMonthLabel(startMonth)} – ${getMonthLabel(endMonth)}`;
}

const inRange = (date: string, range: DateRange) => date >= range.start && date <= range.end;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => { const media = window.matchMedia(query); const sync = () => setMatches(media.matches); sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync); }, [query]);
  return matches;
}

export function App() {
  const [data, setData] = useState<BudgitalData>(loadData);
  const [view, setView] = useState<View>(readViewFromHash);
  const [anchor, setAnchor] = useState(currentMonth);
  const [preset, setPreset] = useState<RangePreset>('thisMonth');
  const [customRange, setCustomRange] = useState(() => ({ start: `${currentMonth}-01`, end: localISO(new Date()) }));
  const [showRange, setShowRange] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [showAi, setShowAi] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiAsking, setAiAsking] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiFailedQuestion, setAiFailedQuestion] = useState('');
  const [aiUsage, setAiUsage] = useState(usageToday);
  const [splashVisible, setSplashVisible] = useState(true);
  const themeTransition = useRef(false);

  useEffect(() => {
    document.title = 'Budgital — Personal budget workspace';
    document.querySelector('meta[name=description]')?.setAttribute('content', 'Your private Budgital workspace for logging income, expenses, category plans, CSV backups, and optional AI help.');
    document.querySelector('meta[name=robots]')?.setAttribute('content', 'noindex,nofollow');
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => { const timer = window.setTimeout(() => setSplashVisible(false), 720); return () => window.clearTimeout(timer); }, []);

  useEffect(() => {
    const sync = () => setView(readViewFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function goTo(next: View) {
    if (next !== view) window.location.hash = next === 'overview' ? '' : next;
    setView(next);
  }

  const range = useMemo(() => buildRange(preset, anchor, customRange, data.transactions), [preset, anchor, customRange, data.transactions]);

  function applyTheme(next: Theme, origin?: { x: number; y: number }) {
    const root = document.documentElement;
    const viewDocument = document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof viewDocument.startViewTransition !== 'function') {
      root.classList.add('theme-fallback');
      window.setTimeout(() => root.classList.remove('theme-fallback'), 520);
      setTheme(next);
      return;
    }
    const x = origin?.x ?? window.innerWidth - 46;
    const y = origin?.y ?? 34;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    themeTransition.current = true;
    setTheme(next);
    const transition = viewDocument.startViewTransition(() => { root.dataset.theme = next; });
    void transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 640, easing: 'cubic-bezier(.22, 1, .36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  }

  useEffect(() => {
    const root = document.documentElement;
    if (!themeTransition.current) root.dataset.theme = theme;
    themeTransition.current = false;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0d1714' : '#f5f6f1');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { theme?: Theme };
        if (stored.theme === 'light' || stored.theme === 'dark') return;
      } catch {
        // Ignore unreadable settings and follow the system value.
      }
      setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const rangeTransactions = useMemo(() => data.transactions.filter((transaction) => inRange(transaction.date, range)), [data.transactions, range]);
  const rangeExpenses = rangeTransactions.filter((transaction) => transaction.type === 'expense');
  const rangeIncome = rangeTransactions.filter((transaction) => transaction.type === 'income');
  const categorySpend = useMemo(() => {
    const map = new Map<string, number>();
    rangeExpenses.forEach((transaction) => map.set(transaction.categoryId, (map.get(transaction.categoryId) ?? 0) + amountInBase(transaction, data.baseCurrency ?? 'USD')));
    return Array.from(map.entries()).map(([categoryId, amount]) => ({ category: getCategory(data.categories, categoryId), amount })).sort((a, b) => b.amount - a.amount);
  }, [data.categories, rangeExpenses]);
  const totals: Totals = useMemo(() => {
    const income = rangeIncome.reduce((sum, transaction) => sum + amountInBase(transaction, data.baseCurrency ?? 'USD'), 0);
    const expenses = rangeExpenses.reduce((sum, transaction) => sum + amountInBase(transaction, data.baseCurrency ?? 'USD'), 0);
    const budgetMonths = budgetFactor(range);
    const budget = data.budgets.reduce((sum, item) => sum + item.amount, 0) * budgetMonths;
    return { income, expenses, budget, left: income - expenses, budgetLeft: budget - expenses, budgetMonths };
  }, [data.baseCurrency, data.budgets, range, rangeExpenses, rangeIncome]);

  function mutate(next: BudgitalData) {
    setData({ ...next, isDemo: false });
  }

  async function handleSaveTransaction(transaction: Transaction) {
    let savedTransaction = transaction;
    const baseCurrency = data.baseCurrency ?? 'USD';
    if (transaction.currency && transaction.currency !== baseCurrency && transaction.fxSource === 'pending Gemini rate') {
      try {
        const result = await requestAi({ mode: 'fx', from: transaction.currency, to: baseCurrency });
        savedTransaction = { ...transaction, fxRateToBase: Number(result.rate) || 1, fxSource: `Gemini estimate · ${String(result.confidence || 'low')}` };
        setFxMessage(`${transaction.currency} → ${baseCurrency} rate updated automatically. Verify estimates in Data.`);
      } catch (error) {
        setFxMessage(error instanceof Error ? `${error.message} Entry kept at 1:1 until a rate is available.` : 'Rate unavailable. Entry kept at 1:1 until a rate is available.');
      }
    }
    const exists = data.transactions.some((item) => item.id === savedTransaction.id);
    const transactions = exists
      ? data.transactions.map((item) => (item.id === savedTransaction.id ? savedTransaction : item))
      : [savedTransaction, ...data.transactions];
    mutate({ ...data, transactions });
    setShowAdd(false);
    setEditingTransaction(null);
  }

  function handleDeleteTransaction(id: string) {
    mutate({ ...data, transactions: data.transactions.filter((transaction) => transaction.id !== id) });
  }

  function handleAddCategory(name: string, kind: Category['kind']) {
    const category: Category = { id: makeId(), name, color: colors[data.categories.length % colors.length], kind };
    mutate({ ...data, categories: [...data.categories, category] });
    return category;
  }

  function handleBudgetChange(categoryId: string, amount: number) {
    const without = data.budgets.filter((budget) => budget.categoryId !== categoryId);
    mutate({ ...data, budgets: amount > 0 ? [...without, { categoryId, amount }] : without });
  }

  function handleImport(rows: ImportRow[]) {
    const valid = rows.filter((row) => row.valid);
    if (!valid.length) return;
    const importedCategories = valid.flatMap((row) => row.importCategory ? [row.importCategory] : []);
    const categoriesById = new Map(data.categories.map((category) => [category.id, category]));
    importedCategories.forEach((category) => categoriesById.set(category.id, category));
    const importedBudgets = valid.flatMap((row) => row.importBudget ? [row.importBudget] : []);
    const budgetsByCategory = new Map(data.budgets.map((budget) => [budget.categoryId, budget]));
    importedBudgets.forEach((budget) => budgetsByCategory.set(budget.categoryId, budget));
    const importedTransactions = valid.filter((row) => row.recordType !== 'category' && row.recordType !== 'budget').map(({ valid: _valid, error: _error, recordType: _recordType, importCategory: _category, importBudget: _budget, ...row }) => row);
    const transactionsById = new Map(data.transactions.map((transaction) => [transaction.id, transaction]));
    importedTransactions.forEach((transaction) => transactionsById.set(transaction.id, transaction));
    mutate({ ...data, categories: Array.from(categoriesById.values()), budgets: Array.from(budgetsByCategory.values()), transactions: Array.from(transactionsById.values()) });
    setShowImport(false);
  }

  const [fxMessage, setFxMessage] = useState('');
  async function handleBaseCurrencyChange(baseCurrency: CurrencyCode) {
    const oldBase = data.baseCurrency ?? 'USD';
    if (baseCurrency === oldBase) return;
    setFxMessage(`Converting your plans and transactions from ${oldBase} to ${baseCurrency}…`);
    try {
      const baseRatePayload = await requestAi({ mode: 'fx', from: oldBase, to: baseCurrency });
      const oldBaseToNew = Number(baseRatePayload.rate);
      if (!Number.isFinite(oldBaseToNew) || oldBaseToNew <= 0) throw new Error('Gemini returned an invalid base-currency rate.');
      const foreignCurrencies = Array.from(new Set(data.transactions.map((transaction) => transaction.currency).filter((currency): currency is CurrencyCode => Boolean(currency && currency !== oldBase && currency !== baseCurrency))));
      const foreignRates = new Map<CurrencyCode, number>();
      const foreignConfidence = new Map<CurrencyCode, string>();
      for (const from of foreignCurrencies) {
        const payload = await requestAi({ mode: 'fx', from, to: baseCurrency });
        const rate = Number(payload.rate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error(`No usable ${from} → ${baseCurrency} rate was returned.`);
        foreignRates.set(from, rate);
        foreignConfidence.set(from, payloadConfidence(payload));
      }
      const transactions = data.transactions.map((transaction) => {
        const native = transaction.currency ?? oldBase;
        if (native === baseCurrency) return { ...transaction, currency: baseCurrency, fxRateToBase: 1, fxSource: 'same currency' };
        if (native === oldBase) return { ...transaction, currency: baseCurrency, amount: transaction.amount * oldBaseToNew, fxRateToBase: 1, fxSource: `Gemini estimate · ${baseRatePayload.confidence || 'low'}` };
        const rate = foreignRates.get(native);
        return rate ? { ...transaction, fxRateToBase: rate, fxSource: `Gemini estimate · ${foreignConfidence.get(native) ?? 'low'}` } : transaction;
      });
      const budgets = data.budgets.map((budget) => ({ ...budget, amount: budget.amount * oldBaseToNew }));
      const next = { ...data, baseCurrency, budgets, transactions };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      mutate(next);
      setFxMessage(`Converted ${oldBase} → ${baseCurrency}. Gemini estimates are informational; verify before relying on them.`);
    } catch (error) {
      setFxMessage(error instanceof Error ? error.message : 'Currency conversion was not completed.');
    }
  }
  async function refreshExchangeRates() {
    const baseCurrency = data.baseCurrency ?? 'USD';
    const currencies = Array.from(new Set(data.transactions.map((transaction) => transaction.currency).filter((currency): currency is CurrencyCode => Boolean(currency && currency !== baseCurrency))));
    if (!currencies.length) { setFxMessage('Add a non-base-currency transaction first.'); return; }
    setFxMessage('Updating AI exchange estimates…');
    try {
      const rates = new Map<CurrencyCode, number>();
      for (const from of currencies) {
        const result = await requestAi({ mode: 'fx', from, to: baseCurrency, snapshot: { totals: { income: 0, expenses: 0, budget: 0, left: 0 }, categorySpend: [] } });
        rates.set(from, Number(result.rate));
      }
      mutate({ ...data, transactions: data.transactions.map((transaction) => transaction.currency && rates.has(transaction.currency) ? { ...transaction, fxRateToBase: rates.get(transaction.currency), fxSource: 'Gemini estimate' } : transaction) });
      setFxMessage(`Updated ${rates.size} ${rates.size === 1 ? 'rate' : 'rates'} using Gemini estimates. Verify before relying on them.`);
    } catch (error) { setFxMessage(error instanceof Error ? error.message : 'Could not update exchange rates.'); }
  }

  function buildSnapshot() {
    const insights = buildInsights(data, range, totals, categorySpend);
    return {
      period: rangeLabel(range),
      totals: { income: totals.income, expenses: totals.expenses, budget: totals.budget, left: totals.left },
      categorySpend: categorySpend.map(({ category, amount }) => ({ category: category.name, amount })),
      localInsights: insights.map((insight) => insight.title),
    };
  }

  async function requestAi(body: Record<string, unknown>) {
    if (!consumeAiUse()) throw new Error(`Daily AI limit reached (${AI_DAILY_LIMIT} requests). Your limit resets tomorrow.`);
    setAiUsage(usageToday());
    try {
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as Record<string, unknown> & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'The AI service could not respond.');
      return payload;
    } catch (error) {
      releaseAiUse();
      setAiUsage(usageToday());
      throw error;
    }
  }

  async function runAiInsights() {
    setShowAi(true);
    setAiLoading(true);
    setAiError('');
    setAiInsight(null);
    setAiMessages([]);
    setAiFailedQuestion('');
    try {
      const payload = await requestAi({ mode: 'insight', snapshot: buildSnapshot() });
      setAiInsight(payload as unknown as AiInsight);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'The AI service could not respond.');
    } finally {
      setAiLoading(false);
    }
  }

  async function sendFollowUp(question: string, appendUser: boolean) {
    const trimmed = question.trim().slice(0, 400);
    if (!trimmed || aiAsking) return;
    const thread: AiMessage[] = appendUser ? [...aiMessages, { id: makeId(), role: 'user', text: trimmed }] : aiMessages;
    if (appendUser) setAiMessages(thread);
    // Send completed turns only; the pending question travels separately.
    const history = (thread[thread.length - 1]?.role === 'user' ? thread.slice(0, -1) : thread)
      .slice(-8)
      .map(({ role, text }) => ({ role, text }));
    setAiAsking(true);
    setAiError('');
    setAiFailedQuestion('');
    try {
      const payload = await requestAi({ mode: 'chat', question: trimmed, history, snapshot: buildSnapshot() });
      const answer = typeof payload.answer === 'string' ? payload.answer : '';
      if (!answer) throw new Error('The AI service returned an empty answer.');
      setAiMessages((current) => [...current, { id: makeId(), role: 'assistant', text: answer }]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'The AI service could not respond.');
      setAiFailedQuestion(trimmed);
    } finally {
      setAiAsking(false);
    }
  }

  function askAiFollowUp(question: string) {
    void sendFollowUp(question, true);
  }

  function retryAiFollowUp() {
    if (aiFailedQuestion) void sendFollowUp(aiFailedQuestion, false);
  }

  function shiftAnchor(delta: number) {
    setAnchor((current) => shiftMonth(current, delta));
    if (preset === 'custom' || preset === 'all') setPreset('thisMonth');
  }

  function clearData() {
    if (!window.confirm('Clear all transactions and budgets? This cannot be undone.')) return;
    mutate({ categories: defaultCategories, transactions: [], budgets: [], isDemo: false, baseCurrency: data.baseCurrency ?? 'USD' });
  }

  if (splashVisible) return <SplashScreen theme={theme} />;
  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: Home },
    { id: 'transactions' as const, label: 'Transactions', icon: Receipt },
    { id: 'budgets' as const, label: 'Budgets', icon: WalletCards },
    { id: 'data' as const, label: 'Import / export', icon: FileUp },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">B</div>
          <div><div className="brand-name">Budgital</div><div className="brand-caption">Money, made clear.</div></div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">Workspace</p>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => goTo(id)}>
              <Icon size={18} strokeWidth={view === id ? 2.4 : 1.8} /><span>{label}</span>{id === 'data' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note"><span className="local-pulse" /><div><strong>Saved locally</strong><span>Your data stays in this browser.</span></div></div><a className="sidebar-author" href="https://buymeacoffee.com/fareedmrifaideen" target="_blank" rel="noreferrer"><Coffee size={14} /> Lumina Metrics by FMR · Support</a>
          <button className="profile-button"><span className="avatar">JD</span><span className="profile-copy"><strong>Jordan Doe</strong><small>Personal account</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="crumb"><span>Personal workspace</span><ChevronRight size={15} /><strong>{nav.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="range-cluster">
              <div className="range-steps">
                <button onClick={() => shiftAnchor(-1)} aria-label="Previous period"><ChevronLeft size={17} /></button>
                <button onClick={() => shiftAnchor(1)} aria-label="Next period"><ChevronRight size={17} /></button>
              </div>
              <button className="range-picker" onClick={() => setShowRange(true)} aria-expanded={showRange} aria-haspopup="dialog"><CalendarRange size={16} /><span>{rangeLabel(range)}</span><ChevronDown size={15} className="range-caret" /></button>
            </div>
            <div className="topbar-right">
              <ThemeSwitch theme={theme} onChange={applyTheme} />
              <button className="primary-button small topbar-add" onClick={() => { setEditingTransaction(null); setShowAdd(true); }} aria-label="Add transaction"><Plus size={16} /><span>Add transaction</span></button>
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {view === 'overview' && <Overview data={data} range={range} totals={totals} expenses={rangeExpenses} categorySpend={categorySpend} onNavigate={goTo} onAdd={() => setShowAdd(true)} onClear={clearData} onAi={runAiInsights} onOpenRange={() => setShowRange(true)} />}
          {view === 'transactions' && <TransactionsView data={data} range={range} onRangeChange={(nextPreset, custom) => { setPreset(nextPreset); if (custom) setCustomRange(custom); }} onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} onAdd={() => setShowAdd(true)} onOpenRange={() => setShowRange(true)} />}
          {view === 'budgets' && <BudgetsView data={data} month={anchor} onBudgetChange={handleBudgetChange} onAddCategory={handleAddCategory} onShift={shiftAnchor} />}
          {view === 'data' && <DataView data={data} onImport={() => setShowImport(true)} onExport={() => exportCsv(data)} onClear={clearData} baseCurrency={data.baseCurrency ?? 'USD'} onBaseCurrencyChange={handleBaseCurrencyChange} onRefreshRates={refreshExchangeRates} fxMessage={fxMessage} />}
        </div>
      </main>

      <TabBar view={view} onNavigate={goTo} onAdd={() => { setEditingTransaction(null); setShowAdd(true); }} />

      {showRange && <DateRangeSheet range={range} preset={preset} anchor={anchor} custom={customRange} onSelect={(nextPreset) => { setPreset(nextPreset); setShowRange(false); }} onCustom={(custom) => { setCustomRange(custom); setPreset('custom'); }} onShift={shiftAnchor} onClose={() => setShowRange(false)} />}
      {showAdd && <TransactionModal data={data} baseCurrency={data.baseCurrency ?? 'USD'} month={anchor} categories={data.categories} transaction={editingTransaction} onClose={() => { setShowAdd(false); setEditingTransaction(null); }} onSave={handleSaveTransaction} />}
      {showImport && <ImportModal data={data} onClose={() => setShowImport(false)} onImport={handleImport} />}
      {showAi && <AiConversation loading={aiLoading} insight={aiInsight} messages={aiMessages} asking={aiAsking} error={aiError} range={range} onClose={() => setShowAi(false)} onRetry={runAiInsights} onRetryFollowUp={retryAiFollowUp} onAsk={askAiFollowUp} failedQuestion={aiFailedQuestion} aiRemaining={Math.max(AI_DAILY_LIMIT - aiUsage, 0)} />}
    </div>
  );
}

function Overview({ data, range, totals, expenses, categorySpend, onNavigate, onAdd, onClear, onAi, onOpenRange }: { data: BudgitalData; range: DateRange; totals: Totals; expenses: Transaction[]; categorySpend: { category: Category; amount: number }[]; onNavigate: (view: View) => void; onAdd: () => void; onClear: () => void; onAi: () => void; onOpenRange: () => void }) {
  const insights = buildInsights(data, range, totals, categorySpend);
  const percentUsed = totals.budget ? Math.min(totals.expenses / totals.budget, 1.2) : 0;
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const before = previousRange(range);
  const baseCurrency = data.baseCurrency ?? 'USD';
  const sumType = (type: TransactionType, window: DateRange | null) => window ? data.transactions.filter((transaction) => transaction.type === type && inRange(transaction.date, window)).reduce((sum, transaction) => sum + amountInBase(transaction, baseCurrency), 0) : 0;
  const change = (current: number, earlier: number) => earlier > 0 ? Math.round((current / earlier - 1) * 100) : null;
  const expenseChange = change(totals.expenses, sumType('expense', before));
  const incomeChange = change(totals.income, sumType('income', before));
  const comparison = before ? `vs ${rangeLabel(before)}` : 'No earlier period yet';

  return <>
    <section className="page-intro">
      <div>
        <div className="kicker"><Sparkles size={14} /> Your monthly pulse</div>
        <h1>Your money, in plain English.</h1>
        <p>Showing <strong>{rangeLabel(range)}</strong>{totals.budgetMonths > 1.02 ? ` · ${formatMonthCount(totals.budgetMonths)} months of plans combined` : ''}. <button className="inline-link" onClick={onOpenRange}>Change dates</button></p>
      </div>
      <div className="intro-actions">{data.isDemo && <span className="sample-badge"><Sparkles size={13} /> Starter view · edit in Data</span>}<button className="ai-button" onClick={onAi}><Bot size={16} /> Ask Budgital AI</button><button className="primary-button" onClick={onAdd}><Plus size={17} /> Log a transaction</button></div>
    </section>

    <section className="hero-grid">
      <div className="hero-card">
        <div className="hero-top"><div><span className="eyebrow light">Available after spending</span><div className="hero-number">{formatCurrency(totals.left)}</div><span className="hero-meta">{totals.left >= 0 ? 'You’re in a comfortable spot.' : 'A little more went out than came in.'}</span></div><div className="hero-orbit" style={{ '--progress': `${Math.min(Math.max(percentUsed, 0), 1) * 360}deg` } as CSSProperties}><div><strong>{Math.round(Math.min(percentUsed, 1) * 100)}%</strong><small>of budget used</small></div></div></div>
        <div className="hero-bottom"><span>{formatCurrency(totals.expenses)} spent</span><span className="hero-separator">/</span><span>{formatCurrency(totals.budget)} {totals.budgetMonths > 1.02 ? `plan · ${formatMonthCount(totals.budgetMonths)} mo` : 'budget'}</span><span className="hero-bar"><i style={{ width: `${Math.min(percentUsed * 100, 100)}%` }} /></span></div>
      </div>
      <div className="stat-card income-card"><div className="stat-icon positive"><ArrowDownLeft size={18} /></div><div className="stat-label">Income <span>{rangeLabel(range)}</span></div><strong>{formatCurrency(totals.income)}</strong><small>{incomeChange === null ? comparison : <><span className={incomeChange >= 0 ? 'positive-text' : 'negative-text'}>{incomeChange >= 0 ? '+' : '−'}{Math.abs(incomeChange)}%</span> {comparison}</>}</small></div>
      <div className="stat-card expense-card"><div className="stat-icon warm"><ArrowUpRight size={18} /></div><div className="stat-label">Spent <span>{rangeLabel(range)}</span></div><strong>{formatCurrency(totals.expenses)}</strong><small>{expenseChange === null ? comparison : <><span className={expenseChange <= 0 ? 'positive-text' : 'negative-text'}>{expenseChange >= 0 ? '+' : '−'}{Math.abs(expenseChange)}%</span> {comparison}</>}</small></div>
    </section>

    <section className="chart-grid">
      <SpendingDonut data={data} categorySpend={categorySpend} total={totals.expenses} onViewAll={() => onNavigate('budgets')} />
      <TrendChart data={data} range={range} />
    </section>

    <section className="lower-grid">
      <div className="panel insights-panel"><div className="panel-heading"><div><div className="panel-kicker"><Sparkles size={14} /> Smart read</div><h2>A few things worth knowing</h2></div><span className="insight-count">{insights.length} insights</span></div><div className="insight-list">{insights.map((insight) => <div className={`insight ${insight.tone}`} key={insight.title}><span className="insight-bullet">{insight.icon}</span><div><strong>{insight.title}</strong><p>{insight.copy}</p></div><ChevronRight size={16} /></div>)}</div></div>
      <div className="panel recent-panel"><div className="panel-heading"><div><div className="panel-kicker"><Receipt size={14} /> Latest activity</div><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onNavigate('transactions')}>View all <ChevronRight size={15} /></button></div><div className="transaction-list">{recent.length ? recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} category={getCategory(data.categories, transaction.categoryId)} baseCurrency={data.baseCurrency ?? 'USD'} />) : <EmptyState title="Nothing logged yet" copy="Add your first transaction to see it here." />}</div></div>
    </section>
  </>;
}

function SpendingDonut({ data, categorySpend, total, onViewAll }: { data: BudgitalData; categorySpend: { category: Category; amount: number }[]; total: number; onViewAll: () => void }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <div className="panel chart-panel donut-panel"><div className="panel-heading"><div><div className="panel-kicker"><BarChart3 size={14} /> Where it goes</div><h2>Spending by category</h2></div><button className="icon-button" aria-label="Open budgets" onClick={onViewAll}><MoreHorizontal size={19} /></button></div><div className="donut-content"><div className="donut-wrap"><svg viewBox="0 0 180 180" className="donut-chart"><circle cx="90" cy="90" r={radius} fill="none" className="donut-track" strokeWidth="18" />{categorySpend.map(({ category, amount }) => { const portion = total ? amount / total : 0; const dash = portion * circumference; const segment = <circle key={category.id} cx="90" cy="90" r={radius} fill="none" stroke={category.color} strokeWidth="18" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(-90 90 90)" />; offset += dash; return segment; })}</svg><div className="donut-center"><strong>{formatCompactCurrency(total)}</strong><span>total spent</span></div></div><div className="legend">{categorySpend.length ? categorySpend.slice(0, 5).map(({ category, amount }) => <div className="legend-item" key={category.id}><span className="legend-swatch" style={{ background: category.color }} /><span>{category.name}</span><strong>{total ? Math.round(amount / total * 100) : 0}%</strong></div>) : <EmptyState title="No spending yet" copy="Your category mix will show up here." />}</div></div></div>;
}

function TrendChart({ data, range }: { data: BudgitalData; range: DateRange }) {
  const monthCount = Math.min(Math.max(monthsCovered(range), 3), 12);
  const endMonth = range.end.slice(0, 7);
  const months = Array.from({ length: monthCount }, (_, index) => shiftMonth(endMonth, index - (monthCount - 1)));
  const baseCurrency = data.baseCurrency ?? 'USD';
  const values = months.map((month) => data.transactions.filter((transaction) => transaction.type === 'expense' && monthKey(transaction.date) === month).reduce((sum, transaction) => sum + amountInBase(transaction, baseCurrency), 0));
  const max = Math.max(...values, 1);
  return <div className="panel chart-panel trend-panel"><div className="panel-heading"><div><div className="panel-kicker"><BarChart3 size={14} /> Over time</div><h2>Spending trend</h2></div><span className="chart-legend"><i className="legend-line" /> last {monthCount} months</span></div><div className="trend-graph"><div className="y-labels"><span>{formatCompactCurrency(max)}</span><span>{formatCompactCurrency(max / 2)}</span><span>$0</span></div><div className="bars">{values.map((value, index) => <div className="bar-column" key={months[index]}><div className={`bar ${months[index] === endMonth ? 'current' : ''}`} style={{ height: `${Math.max(value / max * 100, value ? 8 : 2)}%` }}><span>{value ? formatCompactCurrency(value) : ''}</span></div><small>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${months[index]}-01T12:00:00`))}</small></div>)}</div></div></div>;
}

function buildInsights(data: BudgitalData, range: DateRange, totals: Totals, categorySpend: { category: Category; amount: number }[]) {
  const insights: { title: string; copy: string; tone: string; icon: string }[] = [];
  const months = totals.budgetMonths;
  const budgetMap = new Map(data.budgets.map((budget) => [budget.categoryId, budget.amount * months]));
  const over = categorySpend.find(({ category, amount }) => (budgetMap.get(category.id) ?? 0) > 0 && amount > (budgetMap.get(category.id) ?? 0));
  if (over) {
    const budget = budgetMap.get(over.category.id) ?? 0;
    const percent = Math.round((over.amount / budget - 1) * 100);
    insights.push({ title: `${over.category.name} is ${percent}% over budget`, copy: `You’ve spent ${formatCurrency(over.amount)} against a ${formatCurrency(budget)} plan${months > 1.02 ? ` across ${formatMonthCount(months)} months` : ''}.`, tone: 'warning', icon: '!' });
  }
  const before = previousRange(range);
  const previousExpenses = before ? data.transactions.filter((transaction) => transaction.type === 'expense' && inRange(transaction.date, before)).reduce((sum, transaction) => sum + amountInBase(transaction, data.baseCurrency ?? 'USD'), 0) : 0;
  if (before && previousExpenses > 0) {
    const delta = Math.round((totals.expenses / previousExpenses - 1) * 100);
    insights.push({ title: `Spending is ${Math.abs(delta)}% ${delta <= 0 ? 'lower' : 'higher'} than ${rangeLabel(before)}`, copy: `${formatCurrency(totals.expenses)} in ${rangeLabel(range)} vs ${formatCurrency(previousExpenses)} in the previous period.`, tone: delta <= 0 ? 'positive' : 'neutral', icon: delta <= 0 ? '↓' : '↑' });
  }
  const largest = categorySpend[0];
  if (largest) insights.push({ title: `${largest.category.name} is your biggest line item`, copy: `It makes up ${Math.round(largest.amount / Math.max(totals.expenses, 1) * 100)}% of spending in ${rangeLabel(range)}.`, tone: 'neutral', icon: '•' });
  if (!insights.length) insights.push({ title: 'You’re ready to build a baseline', copy: 'Log a few transactions and Budgital will start calling out patterns.', tone: 'positive', icon: '✓' });
  if (totals.left >= 0 && totals.income > 0) insights.push({ title: `${formatCurrency(totals.left)} is still unallocated`, copy: 'That’s the room you have after income and spending in this period.', tone: 'positive', icon: '✓' });
  return insights.slice(0, 3);
}

function TransactionRow({ transaction, category, baseCurrency }: { transaction: Transaction; category: Category; baseCurrency: CurrencyCode }) {
  return <div className="transaction-row"><span className="category-icon" style={{ background: `${category.color}44`, color: 'var(--ink)' }}><Tags size={15} /></span><div className="transaction-main"><strong>{transaction.description || category.name}</strong><small>{category.name} · {fullDateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</small></div><strong className={transaction.type === 'income' ? 'positive-text' : 'expense-amount'}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount, transaction.currency)}{transaction.currency && transaction.fxRateToBase && transaction.fxRateToBase !== 1 ? <small className="native-currency-note">≈ {formatCurrency(amountInBase(transaction, baseCurrency), baseCurrency)}</small> : transaction.currency && !hasKnownBaseAmount(transaction) ? <small className="native-currency-note">rate needed</small> : null}</strong></div>;
}

function TransactionsView({ data, range, onRangeChange, onEdit, onDelete, onAdd, onOpenRange }: { data: BudgitalData; range: DateRange; onRangeChange: (preset: RangePreset, custom?: { start: string; end: string }) => void; onEdit: (transaction: Transaction) => void; onDelete: (id: string) => void; onAdd: () => void; onOpenRange: () => void }) {
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const isCompact = useMediaQuery('(max-width: 960px)');
  const categories = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));
  const search = query.trim().toLowerCase();
  const filtered = data.transactions.filter((transaction) => inRange(transaction.date, range)
    && (filter === 'all' || transaction.type === filter)
    && (categoryId === 'all' || transaction.categoryId === categoryId)
    && (!search || `${transaction.description} ${getCategory(data.categories, transaction.categoryId).name} ${transaction.amount}`.toLowerCase().includes(search)));
  const baseCurrency = data.baseCurrency ?? 'USD';
  const visible = [...filtered].sort((a, b) => sort === 'highest' ? amountInBase(b, baseCurrency) - amountInBase(a, baseCurrency) : sort === 'lowest' ? amountInBase(a, baseCurrency) - amountInBase(b, baseCurrency) : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  const income = filtered.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + amountInBase(transaction, baseCurrency), 0);
  const expense = filtered.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + amountInBase(transaction, baseCurrency), 0);
  const isCustomRange = range.preset === 'custom' || range.preset === 'all';
  const from = range.preset === 'all' ? '' : range.start;
  const to = range.preset === 'all' ? '' : range.end;
  const resetFilters = () => { setFilter('all'); setQuery(''); setCategoryId('all'); setSort('newest'); onRangeChange('thisMonth'); };

  return <>
    <section className="page-intro compact">
      <div><div className="kicker"><Receipt size={14} /> Activity ledger</div><h1>Transactions</h1><p><strong>{rangeLabel(range)}</strong> · {visible.length} {visible.length === 1 ? 'entry' : 'entries'} <button className="inline-link" onClick={onOpenRange}>Change dates</button></p></div>
      <button className="primary-button" onClick={onAdd}><Plus size={17} /> Add transaction</button>
    </section>
    <div className="panel ledger-panel">
      <div className="ledger-toolbar">
        <div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'income' ? 'selected' : ''} onClick={() => setFilter('income')}>Income</button><button className={filter === 'expense' ? 'selected' : ''} onClick={() => setFilter('expense')}>Expenses</button></div>
        <input className="search-input" placeholder="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="filter-row">
        <label className="filter-field"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="filter-field"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></label>
        <label className="filter-field"><span>From</span><input type="date" value={from} max={to || undefined} onChange={(event) => event.target.value && onRangeChange('custom', { start: event.target.value, end: to || isoDate() })} /></label>
        <label className="filter-field"><span>To</span><input type="date" value={to} min={from || undefined} onChange={(event) => event.target.value && onRangeChange('custom', { start: from || '1970-01-01', end: event.target.value })} /></label>
      </div>
      <div className="ledger-summary">
        <span><strong>{visible.length}</strong> shown</span>
        <span>In <strong className="positive-text">{formatCurrency(income)}</strong></span>
        <span>Out <strong className="expense-amount">{formatCurrency(expense)}</strong></span>
        <span>Net <strong className={income - expense < 0 ? 'negative-text' : 'positive-text'}>{formatCurrency(income - expense)}</strong></span>
        {(filter !== 'all' || categoryId !== 'all' || search || isCustomRange) && <button className="text-button" onClick={resetFilters}>Reset filters</button>}
      </div>
      <div className="table-wrap">{!isCompact && <table className="table-only"><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th className="align-right">Amount</th><th aria-label="Actions" /></tr></thead><tbody>{visible.map((transaction) => { const category = getCategory(data.categories, transaction.categoryId); return <tr key={transaction.id}><td><div className="table-transaction"><span className="category-icon small" style={{ background: `${category.color}44`, color: 'var(--ink)' }}><Tags size={14} /></span><strong>{transaction.description || category.name}</strong></div></td><td><span className="category-pill" style={{ '--pill-color': category.color } as CSSProperties}>{category.name}</span></td><td>{fullDateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</td><td className={`align-right amount-cell ${transaction.type === 'income' ? 'positive-text' : ''}`}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(amountInBase(transaction, baseCurrency), baseCurrency)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(transaction)} aria-label="Edit transaction"><Settings2 size={15} /></button><button className="icon-button danger" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction"><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table>}{isCompact && <TransactionCards data={data} baseCurrency={baseCurrency} transactions={visible} onEdit={onEdit} onDelete={onDelete} />}</div>
      {!visible.length && <EmptyState title="No transactions match" copy="Try a wider date range or clear the filters." />}
    </div>
  </>;
}

function TransactionCards({ data, baseCurrency, transactions, onEdit, onDelete }: { data: BudgitalData; baseCurrency: CurrencyCode; transactions: Transaction[]; onEdit: (transaction: Transaction) => void; onDelete: (id: string) => void }) {
  return <div className="tx-cards">{transactions.map((transaction) => {
    const category = getCategory(data.categories, transaction.categoryId);
    return <div className="tx-card" key={transaction.id}>
      <span className="category-icon small" style={{ background: `${category.color}44`, color: 'var(--ink)' }}><Tags size={14} /></span>
      <div className="tx-card-main"><strong>{transaction.description || category.name}</strong><small>{category.name} · {fullDateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</small></div>
      <div className="tx-card-side"><div className={`tx-card-amount ${transaction.type === 'income' ? 'positive-text' : 'expense-amount'}`}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount, transaction.currency)}{transaction.currency && transaction.fxRateToBase && transaction.fxRateToBase !== 1 ? <small className="native-currency-note">≈ {formatCurrency(amountInBase(transaction, baseCurrency), baseCurrency)}</small> : transaction.currency && !hasKnownBaseAmount(transaction) ? <small className="native-currency-note">rate needed</small> : null}</div><div className="tx-card-actions"><button className="icon-button" onClick={() => onEdit(transaction)} aria-label="Edit transaction"><Settings2 size={15} /></button><button className="icon-button danger" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction"><Trash2 size={15} /></button></div></div>
    </div>;
  })}</div>;
}

function BudgetsView({ data, month, onBudgetChange, onAddCategory, onShift }: { data: BudgitalData; month: string; onBudgetChange: (categoryId: string, amount: number) => void; onAddCategory: (name: string, kind: Category['kind']) => Category; onShift: (delta: number) => void }) {
  const [newCategory, setNewCategory] = useState('');
  const expenseCategories = data.categories.filter((category) => category.kind !== 'income');
  return <><section className="page-intro compact"><div><div className="kicker"><WalletCards size={14} /> Plan with intention</div><h1>Budgets</h1><p>Give every category a number that feels realistic for <strong>{getMonthLabel(month)}</strong>.</p></div><div className="plan-actions"><div className="range-steps"><button onClick={() => onShift(-1)} aria-label="Previous planning month"><ChevronLeft size={17} /></button><button onClick={() => onShift(1)} aria-label="Next planning month"><ChevronRight size={17} /></button></div><div className="budget-total"><span>Monthly plan</span><strong>{formatCurrency(data.budgets.reduce((sum, budget) => sum + budget.amount, 0))}</strong></div></div></section><div className="budget-layout"><div className="panel budget-panel"><div className="panel-heading"><div><div className="panel-kicker"><CircleDollarSign size={14} /> Category envelopes</div><h2>Monthly budgets</h2></div><span className="muted">Edit inline</span></div><div className="budget-list">{expenseCategories.map((category) => { const budget = data.budgets.find((item) => item.categoryId === category.id)?.amount ?? 0; const spent = data.transactions.filter((transaction) => transaction.type === 'expense' && transaction.categoryId === category.id && monthKey(transaction.date) === month).reduce((sum, transaction) => sum + amountInBase(transaction, data.baseCurrency ?? 'USD'), 0); const ratio = budget ? spent / budget : 0; return <div className="budget-row" key={category.id}><div className="budget-label"><span className="legend-swatch" style={{ background: category.color }} /><strong>{category.name}</strong><small>{formatCurrency(spent)} spent</small></div><div className="budget-track"><span style={{ width: `${Math.min(ratio * 100, 100)}%`, background: ratio > 1 ? '#e07d5b' : category.color }} /></div><div className="budget-value"><span>$</span><input aria-label={`${category.name} monthly budget`} type="number" min="0" value={budget || ''} placeholder="0" onChange={(event) => onBudgetChange(category.id, Number(event.target.value))} /><small>{ratio > 1 ? `${Math.round((ratio - 1) * 100)}% over` : `${formatCurrency(Math.max(budget - spent, 0))} left`}</small></div></div>})}</div></div><div className="panel add-category-panel"><div className="panel-kicker"><Tags size={14} /> Keep it personal</div><h2>Need another category?</h2><p>Add one that matches the way you actually spend. You can budget it right away.</p><div className="add-category-form"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Travel" onKeyDown={(event) => { if (event.key === 'Enter' && newCategory.trim()) { onAddCategory(newCategory.trim(), 'expense'); setNewCategory(''); } }} /><button className="primary-button small" onClick={() => { if (newCategory.trim()) { onAddCategory(newCategory.trim(), 'expense'); setNewCategory(''); } }}><Plus size={16} /> Add</button></div><div className="tip-box"><Sparkles size={16} /><span>Tip: start with a round number, then tune it after two months of real spending.</span></div></div></div></>;
}

function DataView({ data, onImport, onExport, onClear, baseCurrency, onBaseCurrencyChange, onRefreshRates, fxMessage }: { data: BudgitalData; onImport: () => void; onExport: () => void; onClear: () => void; baseCurrency: CurrencyCode; onBaseCurrencyChange: (currency: CurrencyCode) => void; onRefreshRates: () => void; fxMessage: string }) {
  const missingFx = data.transactions.filter((transaction) => transaction.currency && transaction.currency !== baseCurrency && !hasKnownBaseAmount(transaction, baseCurrency)).length;
  return <>
    <section className="page-intro compact"><div><div className="kicker"><FileUp size={14} /> Your data, your rules</div><h1>Import & export</h1><p>Everything stays local. Move a copy whenever you need one.</p></div><span className="local-badge"><span className="local-pulse" /> Local-only storage</span></section>
    <div className="data-grid">
      <div className="panel data-card primary-data"><div className="data-card-icon"><Upload size={21} /></div><div><h2>Import transactions</h2><p>Bring in a CSV from your bank or a spreadsheet. We’ll validate it and show a preview before anything is saved.</p></div><button className="primary-button" onClick={onImport}><FileUp size={17} /> Choose CSV</button><div className="format-note"><Check size={14} /> Basic CSV: date, type, amount, category, description · Budgital backup CSVs also preserve categories, budgets, currency, and rates</div></div>
      <div className="panel data-card"><div className="data-card-icon export"><Download size={21} /></div><div><h2>Export a backup</h2><p>Download your transactions, categories, and budgets as one CSV file you can keep or edit.</p></div><button className="secondary-button" onClick={onExport}><Download size={17} /> Export CSV</button><div className="format-note"><Check size={14} /> {data.transactions.length} transactions ready to export</div></div>
    </div>
    <div className="panel currency-panel"><div className="data-card-icon export"><CircleDollarSign size={21} /></div><div><h2>Multi-currency, one clear base</h2><p>Log entries in USD, EUR, GBP, LKR, INR, AUD, CAD, or JPY. Gemini can refresh cautious conversion estimates for your base currency.</p></div><label className="currency-setting"><span>Base currency</span><select value={baseCurrency} onChange={(event) => onBaseCurrencyChange(event.target.value as CurrencyCode)}>{currencyOptions.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.label}</option>)}</select></label><button className="secondary-button" onClick={onRefreshRates}><Sparkles size={16} /> Update AI rates</button>{fxMessage && <div className="format-note"><Check size={14} /> {fxMessage}</div>}{missingFx > 0 && <div className="format-note warning-note"><ShieldCheckIcon /> {missingFx} foreign {missingFx === 1 ? 'entry needs' : 'entries need'} a verified rate and are excluded from base totals until one is available.</div>}</div>
    <div className="panel safety-panel"><div className="safety-icon"><Landmark size={19} /></div><div><h2>Private by default</h2><p>Budgital does not send your numbers anywhere. Clearing browser storage or using a different browser will create a separate budget.</p></div>{data.isDemo && <button className="text-button" onClick={onClear}><Trash2 size={15} /> Clear starter data</button>}<button className="text-button danger-text" onClick={onClear}><Trash2 size={15} /> Clear all data</button></div>
  </>;
}
function TransactionModal({ data, baseCurrency, month, categories, transaction, onClose, onSave }: { data: BudgitalData; baseCurrency: CurrencyCode; month: string; categories: Category[]; transaction: Transaction | null; onClose: () => void; onSave: (transaction: Transaction) => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction?.amount.toString() ?? '');
  const [date, setDate] = useState(transaction?.date ?? `${month}-${String(new Date().getDate()).padStart(2, '0')}`);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? categories.find((category) => category.kind !== 'income')?.id ?? categories[0]?.id ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(transaction?.currency ?? baseCurrency);
  const [fxRate, setFxRate] = useState(String(transaction?.fxRateToBase ?? ''));
  const available = categories.filter((category) => type === 'income' ? category.kind !== 'expense' : category.kind !== 'income');
  useEffect(() => { if (!available.some((category) => category.id === categoryId)) setCategoryId(available[0]?.id ?? ''); }, [type]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><div className="modal-heading"><div><div className="panel-kicker"><CircleDollarSign size={14} /> {transaction ? 'Update entry' : 'New entry'}</div><h2>{transaction ? 'Edit transaction' : 'Log a transaction'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="type-toggle"><button className={type === 'expense' ? 'selected expense' : ''} onClick={() => setType('expense')}><ArrowUpRight size={16} /> Expense</button><button className={type === 'income' ? 'selected income' : ''} onClick={() => setType('income')}><ArrowDownLeft size={16} /> Income</button></div><div className="form-grid"><label className="full-field"><span>Amount</span><div className="amount-input"><span>{currencySymbol(currency)}</span><input autoFocus inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label><label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>Currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{currencyOptions.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.label}</option>)}</select></label><label><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{available.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>{currency !== baseCurrency && <label><span>1 {currency} = {baseCurrency}</span><input inputMode="decimal" type="number" min="0.000001" step="0.000001" value={fxRate} onChange={(event) => setFxRate(event.target.value)} placeholder="Update via Data → AI rates" /></label>}<label className="full-field"><span>Description <em>optional</em></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Coffee with Sam" /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!Number(amount) || Number(amount) <= 0 || !date || !categoryId} onClick={() => onSave({ id: transaction?.id ?? makeId(), type, amount: Number(amount), date, categoryId, description: description.trim(), currency, fxRateToBase: currency === baseCurrency ? 1 : Number(fxRate) || 1, fxSource: currency === baseCurrency ? 'same currency' : Number(fxRate) > 0 ? 'manual rate' : 'pending Gemini rate' })}>{transaction ? 'Save changes' : 'Add transaction'} <ArrowUpRight size={16} /></button></div></div></div>;
}

function ImportModal({ data, onClose, onImport }: { data: BudgitalData; onClose: () => void; onImport: (rows: ImportRow[]) => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result ?? ''); setFileName(file.name); setRows(parseCsv(text, data.categories)); };
    reader.readAsText(file);
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal import-modal"><div className="modal-heading"><div><div className="panel-kicker"><Upload size={14} /> CSV importer</div><h2>Bring in your transactions</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{!rows.length ? <><button className="dropzone" onClick={() => inputRef.current?.click()}><FileUp size={26} /><strong>{fileName || 'Choose a CSV file'}</strong><span>or drop one here · max 10MB</span><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) parseFile(file); }} /></button><div className="csv-helper"><strong>Use these columns:</strong> date, type, amount, category, description<div className="csv-example">2026-03-12, expense, 24.50, Dining, Lunch</div></div></> : <><div className="import-summary"><div><strong>{rows.filter((row) => row.valid).length} ready to import</strong><span>{rows.filter((row) => !row.valid).length} rows need attention</span></div><button className="text-button" onClick={() => setRows([])}>Choose another file</button></div><div className="import-table"><table><thead><tr><th>Row</th><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Status</th></tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr key={`${row.id}-${index}`}><td>{index + 1}</td><td>{row.date || '—'}</td><td>{row.recordType === 'category' ? 'Category' : row.recordType === 'budget' ? 'Budget' : row.type || '—'}</td><td>{row.recordType === 'category' ? '—' : row.amount ? formatCurrency(row.amount) : '—'}</td><td>{row.recordType === 'category' ? row.description : row.categoryId ? getCategory(data.categories, row.categoryId).name : '—'}</td><td><span className={`status-pill ${row.valid ? 'valid' : 'invalid'}`}>{row.valid ? <><Check size={12} /> Ready</> : row.error}</span></td></tr>)}</tbody></table></div></>}<div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!rows.length || !rows.some((row) => row.valid)} onClick={() => onImport(rows)}><Check size={16} /> Import valid records</button></div></div></div>;
}

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (cell.length || row.length) { row.push(cell); if (row.some((value) => value.trim())) rows.push(row); }
  return rows;
}

function parseCsv(text: string, categories: Category[]): ImportRow[] {
  const records = parseCsvRecords(text);
  if (!records.length) return [];
  const first = records[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = first.includes('date') || first.includes('recordtype') || first.includes('amount');
  const headers = hasHeader ? first : ['recordtype', 'date', 'type', 'amount', 'category', 'description', 'currency', 'fxratetobase'];
  const rows = (hasHeader ? records.slice(1) : records).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()]))) as Record<string, string>[];
  const metadataCategories = rows.filter((values) => (values.recordtype || 'transaction').toLowerCase() === 'category').map((values, index) => ({ id: values.categoryid || `import-category-${index}-${makeId()}`, name: values.category || 'Uncategorized', color: values.categorycolor || colors[index % colors.length], kind: values.categorykind === 'income' || values.categorykind === 'both' ? values.categorykind : 'expense' } as Category));
  const knownCategories = [...categories, ...metadataCategories];
  return rows.map((values, index) => {
    const recordType = (values.recordtype || 'transaction').toLowerCase() as ImportRow['recordType'];
    if (recordType === 'category') {
      const category = metadataCategories.find((item) => item.id === values.categoryid) ?? metadataCategories[index] ?? { id: values.categoryid || `import-category-${index}-${makeId()}`, name: values.category || 'Uncategorized', color: values.categorycolor || colors[index % colors.length], kind: values.categorykind === 'income' || values.categorykind === 'both' ? values.categorykind : 'expense' } as Category;
      return { id: category.id, type: 'expense', amount: 0, date: '', categoryId: category.id, description: category.name, recordType, importCategory: category, valid: true };
    }
    if (recordType === 'budget') {
      const amount = Number(values.budgetamount || values.amount);
      const categoryId = values.categoryid || knownCategories.find((category) => category.name.toLowerCase() === (values.category || '').toLowerCase())?.id || '';
      const budget = { categoryId, amount };
      return { id: `import-budget-${index}-${makeId()}`, type: 'expense', amount, date: '', categoryId, description: `Budget · ${values.category || categoryId}`, recordType, importBudget: budget, valid: Boolean(categoryId && amount > 0), error: !categoryId ? 'Category' : amount > 0 ? undefined : 'Budget amount' };
    }
    const date = values.date || '';
    const type = values.type?.toLowerCase() === 'income' ? 'income' : 'expense';
    const amount = Number(String(values.amount || '').replace(/[$,]/g, ''));
    const categoryName = values.category || 'Uncategorized';
    const existing = knownCategories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase());
    const currency = currencyOptions.some((item) => item.code === values.currency?.toUpperCase()) ? values.currency.toUpperCase() as CurrencyCode : undefined;
    const fxRateToBase = Number(values.fxratetobase || values.fxrate || 0) || undefined;
    const error = !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'Date format' : !amount || amount <= 0 ? 'Amount' : !existing ? 'Category' : undefined;
    return { id: values.id || `import-${index}-${makeId()}`, type, amount, date, categoryId: existing?.id ?? '', description: values.description || categoryName, currency, fxRateToBase, fxSource: fxRateToBase ? 'CSV rate' : undefined, recordType: 'transaction', valid: !error, error };
  });
}

function exportCsv(data: BudgitalData) {
  const header = ['recordType', 'id', 'date', 'type', 'amount', 'category', 'description', 'currency', 'fxRateToBase', 'categoryId', 'categoryColor', 'categoryKind', 'budgetAmount'];
  const rows: (string | number)[][] = [header];
  data.transactions.forEach((transaction) => rows.push(['transaction', transaction.id, transaction.date, transaction.type, transaction.amount.toFixed(2), getCategory(data.categories, transaction.categoryId).name, transaction.description, transaction.currency ?? data.baseCurrency ?? 'USD', transaction.fxRateToBase ? String(transaction.fxRateToBase) : '', transaction.categoryId, '', '', '']));
  data.categories.forEach((category) => rows.push(['category', category.id, '', '', '', category.name, '', '', '', category.id, category.color, category.kind, '']));
  data.budgets.forEach((budget) => rows.push(['budget', `budget-${budget.categoryId}`, '', '', '', getCategory(data.categories, budget.categoryId).name, '', '', '', budget.categoryId, '', '', budget.amount.toFixed(2)]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `budgital-export-${isoDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span><Receipt size={17} /></span><strong>{title}</strong><p>{copy}</p></div>;
}


function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (next: Theme, origin?: { x: number; y: number }) => void }) {
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return <button
    type="button"
    className="theme-switch"
    data-active={theme}
    aria-pressed={theme === 'dark'}
    aria-label={`Switch to ${next} mode`}
    title={`Switch to ${next} mode`}
    onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      onChange(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }}
  >
    <span className="theme-sky" />
    <span className="theme-stars"><i /><i /><i /></span>
    <span className="theme-switch-icons"><Sun className="theme-icon-sun" /><Moon className="theme-icon-moon" /></span>
    <span className="theme-thumb">{theme === 'dark' ? <Moon /> : <Sun />}</span>
  </button>;
}

function DateRangeSheet({ range, preset, anchor, custom, onSelect, onCustom, onShift, onClose }: { range: DateRange; preset: RangePreset; anchor: string; custom: { start: string; end: string }; onSelect: (preset: RangePreset) => void; onCustom: (custom: { start: string; end: string }) => void; onShift: (delta: number) => void; onClose: () => void }) {
  const presets: { id: RangePreset; label: string; hint: string }[] = [
    { id: 'thisMonth', label: 'This month', hint: getMonthLabel(anchor) },
    { id: 'lastMonth', label: 'Last month', hint: getMonthLabel(shiftMonth(anchor, -1)) },
    { id: 'last3', label: 'Last 3 months', hint: `${getMonthLabel(shiftMonth(anchor, -2))} – ${getMonthLabel(anchor)}` },
    { id: 'last6', label: 'Last 6 months', hint: `${getMonthLabel(shiftMonth(anchor, -5))} – ${getMonthLabel(anchor)}` },
    { id: 'ytd', label: 'Year to date', hint: `${anchor.slice(0, 4)} so far` },
    { id: 'all', label: 'All time', hint: 'Everything you have logged' },
  ];
  return <div className="range-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="range-panel" role="dialog" aria-label="Choose a date range">
      <div className="modal-heading"><div><div className="panel-kicker"><CalendarRange size={14} /> Date range</div><h2>{rangeLabel(range)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <div className="range-steps range-steps-wide"><button onClick={() => onShift(-1)} aria-label="Previous period"><ChevronLeft size={17} /> Previous</button><button onClick={() => onShift(1)} aria-label="Next period">Next <ChevronRight size={17} /></button></div>
      <div className="range-presets">{presets.map((item) => <button key={item.id} className={preset === item.id ? 'selected' : ''} onClick={() => onSelect(item.id)}><span>{item.label}<small>{item.hint}</small></span>{preset === item.id && <Check size={15} />}</button>)}</div>
      <div className="range-custom">
        <label><span>From</span><input type="date" value={custom.start} max={custom.end} onChange={(event) => event.target.value && onCustom({ start: event.target.value, end: custom.end })} /></label>
        <label><span>To</span><input type="date" value={custom.end} min={custom.start} onChange={(event) => event.target.value && onCustom({ start: custom.start, end: event.target.value })} /></label>
      </div>
      <p className="range-summary">{preset === 'custom' ? <><strong>Custom range applied.</strong> </> : null}Budget plans are monthly. A range that covers part of a month compares only that share of the plan against the spending inside the selected dates.</p>
    </div>
  </div>;
}

function TabBar({ view, onNavigate, onAdd }: { view: View; onNavigate: (view: View) => void; onAdd: () => void }) {
  const tabs: { id: View; label: string; icon: typeof Home }[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'transactions', label: 'Activity', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: WalletCards },
    { id: 'data', label: 'Data', icon: FileUp },
  ];
  return <nav className="tabbar" aria-label="Primary navigation">
    {tabs.slice(0, 2).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span></button>)}
    <button className="tabbar-add" onClick={onAdd} aria-label="Add transaction"><Plus size={22} /></button>
    {tabs.slice(2).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span></button>)}
  </nav>;
}

function AiConversation({ loading, insight, messages, asking, error, range, failedQuestion, aiRemaining, onClose, onRetry, onRetryFollowUp, onAsk }: { loading: boolean; insight: AiInsight | null; messages: AiMessage[]; asking: boolean; error: string; range: DateRange; failedQuestion: string; aiRemaining: number; onClose: () => void; onRetry: () => void; onRetryFollowUp: () => void; onAsk: (question: string) => void }) {
  const [draft, setDraft] = useState('');
  const suggestions = ['Why is my biggest category so high?', 'Which category grew fastest?', 'How can I free up $200 next month?'];
  const submit = (question: string) => {
    if (!question.trim() || asking) return;
    setDraft('');
    onAsk(question);
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal ai-modal">
      <div className="modal-heading"><div><div className="panel-kicker"><Bot size={14} /> Budgital AI · {rangeLabel(range)}</div><h2>Ask about this period</h2><small className="ai-quota">{aiRemaining} AI {aiRemaining === 1 ? 'request' : 'requests'} left today</small></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <div className="ai-privacy"><ShieldCheckIcon /><span>Only totals, category totals, and your local insights are sent. Individual transactions and descriptions stay in this browser.</span></div>
      <p className="ai-disclaimer">Free-tier Gemini content may be used by Google to improve products. Keep AI off for strictly local-only budgeting.</p>
      {loading && <div className="ai-loading"><span className="loading-orbit"><Sparkles size={17} /></span><strong>Reading your period…</strong><p>Budgital is asking Gemini for a concise second opinion.</p></div>}
      {!loading && <>
        {(insight || messages.length > 0) && <div className="ai-thread">
          {insight && <div className="ai-bubble intro">
            <div className="ai-headline"><span className="ai-result-icon"><Sparkles size={16} /></span><div><strong>{insight.headline}</strong><small>Informational only — not financial advice</small></div></div>
            {insight.bullets.length > 0 && <ul className="ai-points">{insight.bullets.map((bullet) => <li key={bullet}><span>{bullet}</span></li>)}</ul>}
            {insight.nextStep && <div className="ai-next"><strong>One useful next step</strong><p>{insight.nextStep}</p></div>}
          </div>}
          {messages.map((message) => <div key={message.id} className={`ai-bubble ${message.role === 'user' ? 'user' : 'bot'}`}>{message.text}</div>)}
          {asking && <div className="ai-typing"><i /><i /><i /></div>}
        </div>}
        {error && <div className="ai-error"><strong>AI is unavailable right now</strong><p>{error}</p><div className="ai-error-actions">{failedQuestion && <button className="secondary-button" onClick={onRetryFollowUp}>Retry that question</button>}<button className="secondary-button" onClick={onRetry}>Refresh read</button></div></div>}
        {insight && <div className="ai-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(suggestion)}>{suggestion}</button>)}</div>}
        <div className="ai-composer">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(draft); }} placeholder="Ask a follow-up question…" aria-label="Ask a follow-up question" />
          <button onClick={() => submit(draft)} disabled={!draft.trim() || asking} aria-label="Send question"><Send size={17} /></button>
        </div>
      </>}
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button>{insight && <button className="primary-button" onClick={onRetry}><Sparkles size={16} /> Refresh read</button>}</div>
    </div>
  </div>;
}

function ShieldCheckIcon() {
  return <span className="shield-check"><Check size={13} /></span>;
}

function SplashScreen({ theme }: { theme: Theme }) {
  return <div className={`splash-screen ${theme === 'dark' ? 'splash-dark' : ''}`} role="status" aria-label="Loading Budgital"><div className="splash-orbit splash-orbit-one" /><div className="splash-orbit splash-orbit-two" /><div className="splash-logo">B</div><div className="splash-wordmark"><strong>Budgital</strong><span>Money, made clear.</span></div><div className="splash-author">Lumina Metrics by FMR<br /><small>Created by Fareed M. Rifaideen</small></div></div>;
}
