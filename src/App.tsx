import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileUp,
  Home,
  Landmark,
  Menu,
  MoreHorizontal,
  Plus,
  Receipt,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';

type TransactionType = 'income' | 'expense';
type View = 'overview' | 'transactions' | 'budgets' | 'data';

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
};

type Budget = {
  categoryId: string;
  amount: number;
};

type BudgetlyData = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  isDemo: boolean;
};

type ImportRow = Transaction & { valid: boolean; error?: string };

const STORAGE_KEY = 'budgetly-data-v1';
const colors = ['#c8ee68', '#ffb59d', '#8cc4ff', '#caa7f8', '#f3cc69', '#75d2c1', '#f28c9a', '#9aa9a4'];
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
const monthKey = (date: string) => date.slice(0, 7);
const currentMonth = isoDate().slice(0, 7);

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

function demoData(): BudgetlyData {
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

function loadData(): BudgetlyData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as BudgetlyData;
  } catch {
    // Fall back to the friendly starter state when storage is unavailable.
  }
  return demoData();
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.abs(value));
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return formatCurrency(value);
}

function getCategory(categories: Category[], id: string) {
  return categories.find((category) => category.id === id) ?? { id, name: 'Uncategorized', color: '#9aa9a4', kind: 'both' as const };
}

function getMonthLabel(month: string) {
  return monthFormatter.format(new Date(`${month}-01T12:00:00`));
}

function shiftMonth(month: string, delta: number) {
  const value = new Date(`${month}-01T12:00:00`);
  value.setMonth(value.getMonth() + delta);
  return value.toISOString().slice(0, 7);
}

export function App() {
  const [data, setData] = useState<BudgetlyData>(loadData);
  const [view, setView] = useState<View>('overview');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const monthTransactions = useMemo(
    () => data.transactions.filter((transaction) => monthKey(transaction.date) === selectedMonth),
    [data.transactions, selectedMonth],
  );
  const monthExpenses = monthTransactions.filter((transaction) => transaction.type === 'expense');
  const monthIncome = monthTransactions.filter((transaction) => transaction.type === 'income');
  const totals = useMemo(() => {
    const income = monthIncome.reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);
    const budget = data.budgets.reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, budget, left: income - expenses, budgetLeft: budget - expenses };
  }, [data.budgets, monthExpenses, monthIncome]);

  function mutate(next: BudgetlyData) {
    setData({ ...next, isDemo: false });
  }

  function handleSaveTransaction(transaction: Transaction) {
    const exists = data.transactions.some((item) => item.id === transaction.id);
    const transactions = exists
      ? data.transactions.map((item) => (item.id === transaction.id ? transaction : item))
      : [transaction, ...data.transactions];
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
    const validRows = rows.filter((row) => row.valid).map(({ valid: _valid, error: _error, ...row }) => row);
    if (!validRows.length) return;
    mutate({ ...data, transactions: [...validRows, ...data.transactions] });
    setShowImport(false);
  }

  function clearData() {
    if (!window.confirm('Clear all transactions and budgets? This cannot be undone.')) return;
    mutate({ categories: defaultCategories, transactions: [], budgets: [], isDemo: false });
  }

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: Home },
    { id: 'transactions' as const, label: 'Transactions', icon: Receipt },
    { id: 'budgets' as const, label: 'Budgets', icon: WalletCards },
    { id: 'data' as const, label: 'Import / export', icon: FileUp },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark">B</div>
          <div><div className="brand-name">Budgetly</div><div className="brand-caption">Money, made clear.</div></div>
          <button className="icon-button sidebar-close" onClick={() => setShowMobileNav(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">Workspace</p>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setShowMobileNav(false); }}>
              <Icon size={18} strokeWidth={view === id ? 2.4 : 1.8} /><span>{label}</span>{id === 'data' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note"><span className="local-pulse" /><div><strong>Saved locally</strong><span>Your data stays in this browser.</span></div></div>
          <button className="profile-button"><span className="avatar">JD</span><span className="profile-copy"><strong>Jordan Doe</strong><small>Personal account</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="crumb"><span>Personal workspace</span><ChevronRight size={15} /><strong>{nav.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions">
            <button className="month-picker" onClick={() => setSelectedMonth(selectedMonth === currentMonth ? shiftMonth(selectedMonth, -1) : currentMonth)}><CalendarDays size={16} /><span>{getMonthLabel(selectedMonth)}</span><ChevronDown size={15} /></button>
            <button className="primary-button small" onClick={() => { setEditingTransaction(null); setShowAdd(true); }}><Plus size={16} /> Add transaction</button>
          </div>
        </header>

        <div className="content-wrap">
          {view === 'overview' && <Overview data={data} selectedMonth={selectedMonth} totals={totals} monthExpenses={monthExpenses} onNavigate={setView} onAdd={() => setShowAdd(true)} onClear={clearData} />}
          {view === 'transactions' && <TransactionsView data={data} month={selectedMonth} onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} onAdd={() => setShowAdd(true)} />}
          {view === 'budgets' && <BudgetsView data={data} month={selectedMonth} onBudgetChange={handleBudgetChange} onAddCategory={handleAddCategory} />}
          {view === 'data' && <DataView data={data} onImport={() => setShowImport(true)} onExport={() => exportCsv(data)} onClear={clearData} />}
        </div>
      </main>

      {showAdd && <TransactionModal data={data} month={selectedMonth} categories={data.categories} transaction={editingTransaction} onClose={() => { setShowAdd(false); setEditingTransaction(null); }} onSave={handleSaveTransaction} />}
      {showImport && <ImportModal data={data} onClose={() => setShowImport(false)} onImport={handleImport} />}
    </div>
  );
}

function Overview({ data, selectedMonth, totals, monthExpenses, onNavigate, onAdd, onClear }: { data: BudgetlyData; selectedMonth: string; totals: { income: number; expenses: number; budget: number; left: number; budgetLeft: number }; monthExpenses: Transaction[]; onNavigate: (view: View) => void; onAdd: () => void; onClear: () => void }) {
  const categorySpend = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((transaction) => map.set(transaction.categoryId, (map.get(transaction.categoryId) ?? 0) + transaction.amount));
    return Array.from(map.entries()).map(([categoryId, amount]) => ({ category: getCategory(data.categories, categoryId), amount })).sort((a, b) => b.amount - a.amount);
  }, [data.categories, monthExpenses]);
  const insights = buildInsights(data, selectedMonth, totals, categorySpend);
  const percentUsed = totals.budget ? Math.min(totals.expenses / totals.budget, 1.2) : 0;
  const recent = [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return <>
    <section className="page-intro">
      <div><div className="kicker"><Sparkles size={14} /> Your monthly pulse</div><h1>Your money, in plain English.</h1><p>Here’s what’s happening with your spending in <strong>{getMonthLabel(selectedMonth)}</strong>.</p></div>
      <div className="intro-actions">{data.isDemo && <button className="ghost-button" onClick={onClear}><Trash2 size={15} /> Clear sample data</button>}<button className="primary-button" onClick={onAdd}><Plus size={17} /> Log a transaction</button></div>
    </section>

    <section className="hero-grid">
      <div className="hero-card">
        <div className="hero-top"><div><span className="eyebrow light">Available after spending</span><div className="hero-number">{formatCurrency(totals.left)}</div><span className="hero-meta">{totals.left >= 0 ? 'You’re in a comfortable spot.' : 'A little more went out than came in.'}</span></div><div className="hero-orbit" style={{ '--progress': `${Math.min(Math.max(percentUsed, 0), 1) * 360}deg` } as CSSProperties}><div><strong>{Math.round(Math.min(percentUsed, 1) * 100)}%</strong><small>of budget used</small></div></div></div>
        <div className="hero-bottom"><span>{formatCurrency(totals.expenses)} spent</span><span className="hero-separator">/</span><span>{formatCurrency(totals.budget)} budget</span><span className="hero-bar"><i style={{ width: `${Math.min(percentUsed * 100, 100)}%` }} /></span></div>
      </div>
      <div className="stat-card income-card"><div className="stat-icon positive"><ArrowDownLeft size={18} /></div><div className="stat-label">Income <span>this month</span></div><strong>{formatCurrency(totals.income)}</strong><small><span className="positive-text">+8.4%</span> vs last month</small></div>
      <div className="stat-card expense-card"><div className="stat-icon warm"><ArrowUpRight size={18} /></div><div className="stat-label">Spent <span>this month</span></div><strong>{formatCurrency(totals.expenses)}</strong><small><span className="negative-text">+4.1%</span> vs last month</small></div>
    </section>

    <section className="chart-grid">
      <SpendingDonut data={data} categorySpend={categorySpend} total={totals.expenses} onViewAll={() => onNavigate('budgets')} />
      <TrendChart data={data} selectedMonth={selectedMonth} />
    </section>

    <section className="lower-grid">
      <div className="panel insights-panel"><div className="panel-heading"><div><div className="panel-kicker"><Sparkles size={14} /> Smart read</div><h2>A few things worth knowing</h2></div><span className="insight-count">{insights.length} insights</span></div><div className="insight-list">{insights.map((insight) => <div className={`insight ${insight.tone}`} key={insight.title}><span className="insight-bullet">{insight.icon}</span><div><strong>{insight.title}</strong><p>{insight.copy}</p></div><ChevronRight size={16} /></div>)}</div></div>
      <div className="panel recent-panel"><div className="panel-heading"><div><div className="panel-kicker"><Receipt size={14} /> Latest activity</div><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onNavigate('transactions')}>View all <ChevronRight size={15} /></button></div><div className="transaction-list">{recent.length ? recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} category={getCategory(data.categories, transaction.categoryId)} />) : <EmptyState title="Nothing logged yet" copy="Add your first transaction to see it here." />}</div></div>
    </section>
  </>;
}

function SpendingDonut({ data, categorySpend, total, onViewAll }: { data: BudgetlyData; categorySpend: { category: Category; amount: number }[]; total: number; onViewAll: () => void }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <div className="panel chart-panel donut-panel"><div className="panel-heading"><div><div className="panel-kicker"><BarChart3 size={14} /> Where it goes</div><h2>Spending by category</h2></div><button className="icon-button" aria-label="Open budgets" onClick={onViewAll}><MoreHorizontal size={19} /></button></div><div className="donut-content"><div className="donut-wrap"><svg viewBox="0 0 180 180" className="donut-chart"><circle cx="90" cy="90" r={radius} fill="none" stroke="#edf0e9" strokeWidth="18" />{categorySpend.map(({ category, amount }) => { const portion = total ? amount / total : 0; const dash = portion * circumference; const segment = <circle key={category.id} cx="90" cy="90" r={radius} fill="none" stroke={category.color} strokeWidth="18" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(-90 90 90)" />; offset += dash; return segment; })}</svg><div className="donut-center"><strong>{formatCompactCurrency(total)}</strong><span>total spent</span></div></div><div className="legend">{categorySpend.length ? categorySpend.slice(0, 5).map(({ category, amount }) => <div className="legend-item" key={category.id}><span className="legend-swatch" style={{ background: category.color }} /><span>{category.name}</span><strong>{total ? Math.round(amount / total * 100) : 0}%</strong></div>) : <EmptyState title="No spending yet" copy="Your category mix will show up here." />}</div></div></div>;
}

function TrendChart({ data, selectedMonth }: { data: BudgetlyData; selectedMonth: string }) {
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(selectedMonth, index - 5));
  const values = months.map((month) => data.transactions.filter((transaction) => transaction.type === 'expense' && monthKey(transaction.date) === month).reduce((sum, transaction) => sum + transaction.amount, 0));
  const max = Math.max(...values, 1);
  return <div className="panel chart-panel trend-panel"><div className="panel-heading"><div><div className="panel-kicker"><BarChart3 size={14} /> Over time</div><h2>Spending trend</h2></div><span className="chart-legend"><i className="legend-line" /> monthly spend</span></div><div className="trend-graph"><div className="y-labels"><span>{formatCompactCurrency(max)}</span><span>{formatCompactCurrency(max / 2)}</span><span>$0</span></div><div className="bars">{values.map((value, index) => <div className="bar-column" key={months[index]}><div className={`bar ${months[index] === selectedMonth ? 'current' : ''}`} style={{ height: `${Math.max(value / max * 100, value ? 8 : 2)}%` }}><span>{value ? formatCompactCurrency(value) : ''}</span></div><small>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${months[index]}-01T12:00:00`))}</small></div>)}</div></div></div>;
}

function buildInsights(data: BudgetlyData, selectedMonth: string, totals: { income: number; expenses: number; budget: number; left: number; budgetLeft: number }, categorySpend: { category: Category; amount: number }[]) {
  const insights: { title: string; copy: string; tone: string; icon: string }[] = [];
  const budgetMap = new Map(data.budgets.map((budget) => [budget.categoryId, budget.amount]));
  const over = categorySpend.find(({ category, amount }) => (budgetMap.get(category.id) ?? 0) > 0 && amount > (budgetMap.get(category.id) ?? 0));
  if (over) {
    const budget = budgetMap.get(over.category.id) ?? 0;
    const percent = Math.round((over.amount / budget - 1) * 100);
    insights.push({ title: `${over.category.name} is ${percent}% over budget`, copy: `You’ve spent ${formatCurrency(over.amount)} against a ${formatCurrency(budget)} plan.`, tone: 'warning', icon: '!' });
  }
  const previousMonth = shiftMonth(selectedMonth, -1);
  const previousExpenses = data.transactions.filter((transaction) => transaction.type === 'expense' && monthKey(transaction.date) === previousMonth).reduce((sum, transaction) => sum + transaction.amount, 0);
  if (previousExpenses > 0) {
    const delta = Math.round((totals.expenses / previousExpenses - 1) * 100);
    insights.push({ title: `Spending is ${Math.abs(delta)}% ${delta <= 0 ? 'lower' : 'higher'} than last month`, copy: `${formatCurrency(totals.expenses)} this month vs ${formatCurrency(previousExpenses)} in ${getMonthLabel(previousMonth)}.`, tone: delta <= 0 ? 'positive' : 'neutral', icon: delta <= 0 ? '↓' : '↑' });
  }
  const largest = categorySpend[0];
  if (largest) insights.push({ title: `${largest.category.name} is your biggest line item`, copy: `It makes up ${Math.round(largest.amount / Math.max(totals.expenses, 1) * 100)}% of total spending this month.`, tone: 'neutral', icon: '•' });
  if (!insights.length) insights.push({ title: 'You’re ready to build a baseline', copy: 'Log a few transactions and Budgetly will start calling out patterns.', tone: 'positive', icon: '✓' });
  if (totals.left >= 0 && totals.income > 0) insights.push({ title: `${formatCurrency(totals.left)} is still unallocated`, copy: 'That’s the room you have after income and spending so far.', tone: 'positive', icon: '✓' });
  return insights.slice(0, 3);
}

function TransactionRow({ transaction, category }: { transaction: Transaction; category: Category }) {
  return <div className="transaction-row"><span className="category-icon" style={{ background: `${category.color}44`, color: '#17362e' }}><Tags size={15} /></span><div className="transaction-main"><strong>{transaction.description || category.name}</strong><small>{category.name} · {fullDateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</small></div><strong className={transaction.type === 'income' ? 'positive-text' : 'expense-amount'}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount)}</strong></div>;
}

function TransactionsView({ data, month, onEdit, onDelete, onAdd }: { data: BudgetlyData; month: string; onEdit: (transaction: Transaction) => void; onDelete: (id: string) => void; onAdd: () => void }) {
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [query, setQuery] = useState('');
  const transactions = data.transactions.filter((transaction) => monthKey(transaction.date) === month && (filter === 'all' || transaction.type === filter) && `${transaction.description} ${getCategory(data.categories, transaction.categoryId).name}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  return <><section className="page-intro compact"><div><div className="kicker"><Receipt size={14} /> Activity ledger</div><h1>Transactions</h1><p>Everything in and out for <strong>{getMonthLabel(month)}</strong>.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add transaction</button></section><div className="panel ledger-panel"><div className="ledger-toolbar"><div className="segmented"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'income' ? 'selected' : ''} onClick={() => setFilter('income')}>Income</button><button className={filter === 'expense' ? 'selected' : ''} onClick={() => setFilter('expense')}>Expenses</button></div><input className="search-input" placeholder="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th className="align-right">Amount</th><th aria-label="Actions" /></tr></thead><tbody>{transactions.map((transaction) => { const category = getCategory(data.categories, transaction.categoryId); return <tr key={transaction.id}><td><div className="table-transaction"><span className="category-icon small" style={{ background: `${category.color}44` }}><Tags size={14} /></span><strong>{transaction.description || category.name}</strong></div></td><td><span className="category-pill" style={{ '--pill-color': category.color } as CSSProperties}>{category.name}</span></td><td>{fullDateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</td><td className={`align-right amount-cell ${transaction.type === 'income' ? 'positive-text' : ''}`}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(transaction)} aria-label="Edit transaction"><Settings2 size={15} /></button><button className="icon-button danger" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction"><Trash2 size={15} /></button></div></td></tr>})}</tbody></table>{!transactions.length && <EmptyState title="No transactions found" copy="Try another filter or log a new transaction." />}</div></div></>;
}

function BudgetsView({ data, month, onBudgetChange, onAddCategory }: { data: BudgetlyData; month: string; onBudgetChange: (categoryId: string, amount: number) => void; onAddCategory: (name: string, kind: Category['kind']) => Category }) {
  const [newCategory, setNewCategory] = useState('');
  const expenseCategories = data.categories.filter((category) => category.kind !== 'income');
  return <><section className="page-intro compact"><div><div className="kicker"><WalletCards size={14} /> Plan with intention</div><h1>Budgets</h1><p>Give every category a number that feels realistic for <strong>{getMonthLabel(month)}</strong>.</p></div><div className="budget-total"><span>Monthly plan</span><strong>{formatCurrency(data.budgets.reduce((sum, budget) => sum + budget.amount, 0))}</strong></div></section><div className="budget-layout"><div className="panel budget-panel"><div className="panel-heading"><div><div className="panel-kicker"><CircleDollarSign size={14} /> Category envelopes</div><h2>Monthly budgets</h2></div><span className="muted">Edit inline</span></div><div className="budget-list">{expenseCategories.map((category) => { const budget = data.budgets.find((item) => item.categoryId === category.id)?.amount ?? 0; const spent = data.transactions.filter((transaction) => transaction.type === 'expense' && transaction.categoryId === category.id && monthKey(transaction.date) === month).reduce((sum, transaction) => sum + transaction.amount, 0); const ratio = budget ? spent / budget : 0; return <div className="budget-row" key={category.id}><div className="budget-label"><span className="legend-swatch" style={{ background: category.color }} /><strong>{category.name}</strong><small>{formatCurrency(spent)} spent</small></div><div className="budget-track"><span style={{ width: `${Math.min(ratio * 100, 100)}%`, background: ratio > 1 ? '#e07d5b' : category.color }} /></div><div className="budget-value"><span>$</span><input aria-label={`${category.name} monthly budget`} type="number" min="0" value={budget || ''} placeholder="0" onChange={(event) => onBudgetChange(category.id, Number(event.target.value))} /><small>{ratio > 1 ? `${Math.round((ratio - 1) * 100)}% over` : `${formatCurrency(Math.max(budget - spent, 0))} left`}</small></div></div>})}</div></div><div className="panel add-category-panel"><div className="panel-kicker"><Tags size={14} /> Keep it personal</div><h2>Need another category?</h2><p>Add one that matches the way you actually spend. You can budget it right away.</p><div className="add-category-form"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Travel" onKeyDown={(event) => { if (event.key === 'Enter' && newCategory.trim()) { onAddCategory(newCategory.trim(), 'expense'); setNewCategory(''); } }} /><button className="primary-button small" onClick={() => { if (newCategory.trim()) { onAddCategory(newCategory.trim(), 'expense'); setNewCategory(''); } }}><Plus size={16} /> Add</button></div><div className="tip-box"><Sparkles size={16} /><span>Tip: start with a round number, then tune it after two months of real spending.</span></div></div></div></>;
}

function DataView({ data, onImport, onExport, onClear }: { data: BudgetlyData; onImport: () => void; onExport: () => void; onClear: () => void }) {
  return <><section className="page-intro compact"><div><div className="kicker"><FileUp size={14} /> Your data, your rules</div><h1>Import & export</h1><p>Everything stays local. Move a copy whenever you need one.</p></div><span className="local-badge"><span className="local-pulse" /> Local-only storage</span></section><div className="data-grid"><div className="panel data-card primary-data"><div className="data-card-icon"><Upload size={21} /></div><div><h2>Import transactions</h2><p>Bring in a CSV from your bank or a spreadsheet. We’ll validate it and show a preview before anything is saved.</p></div><button className="primary-button" onClick={onImport}><FileUp size={17} /> Choose CSV</button><div className="format-note"><Check size={14} /> Expected columns: date, type, amount, category, description</div></div><div className="panel data-card"><div className="data-card-icon export"><Download size={21} /></div><div><h2>Export a backup</h2><p>Download your transactions, categories, and budgets as one CSV file you can keep or edit.</p></div><button className="secondary-button" onClick={onExport}><Download size={17} /> Export CSV</button><div className="format-note"><Check size={14} /> {data.transactions.length} transactions ready to export</div></div></div><div className="panel safety-panel"><div className="safety-icon"><Landmark size={19} /></div><div><h2>Private by default</h2><p>Budgetly does not send your numbers anywhere. Clearing browser storage or using a different browser will create a separate budget.</p></div><button className="text-button danger-text" onClick={onClear}><Trash2 size={15} /> Clear all data</button></div></>;
}

function TransactionModal({ data, month, categories, transaction, onClose, onSave }: { data: BudgetlyData; month: string; categories: Category[]; transaction: Transaction | null; onClose: () => void; onSave: (transaction: Transaction) => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction?.amount.toString() ?? '');
  const [date, setDate] = useState(transaction?.date ?? `${month}-${String(new Date().getDate()).padStart(2, '0')}`);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? categories.find((category) => category.kind !== 'income')?.id ?? categories[0]?.id ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const available = categories.filter((category) => type === 'income' ? category.kind !== 'expense' : category.kind !== 'income');
  useEffect(() => { if (!available.some((category) => category.id === categoryId)) setCategoryId(available[0]?.id ?? ''); }, [type]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><div className="modal-heading"><div><div className="panel-kicker"><CircleDollarSign size={14} /> {transaction ? 'Update entry' : 'New entry'}</div><h2>{transaction ? 'Edit transaction' : 'Log a transaction'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="type-toggle"><button className={type === 'expense' ? 'selected expense' : ''} onClick={() => setType('expense')}><ArrowUpRight size={16} /> Expense</button><button className={type === 'income' ? 'selected income' : ''} onClick={() => setType('income')}><ArrowDownLeft size={16} /> Income</button></div><div className="form-grid"><label className="full-field"><span>Amount</span><div className="amount-input"><span>$</span><input autoFocus inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label><label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{available.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label className="full-field"><span>Description <em>optional</em></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Coffee with Sam" /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!Number(amount) || Number(amount) <= 0 || !date || !categoryId} onClick={() => onSave({ id: transaction?.id ?? makeId(), type, amount: Number(amount), date, categoryId, description: description.trim() })}>{transaction ? 'Save changes' : 'Add transaction'} <ArrowUpRight size={16} /></button></div></div></div>;
}

function ImportModal({ data, onClose, onImport }: { data: BudgetlyData; onClose: () => void; onImport: (rows: ImportRow[]) => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result ?? ''); setFileName(file.name); setRows(parseCsv(text, data.categories)); };
    reader.readAsText(file);
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal import-modal"><div className="modal-heading"><div><div className="panel-kicker"><Upload size={14} /> CSV importer</div><h2>Bring in your transactions</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{!rows.length ? <><button className="dropzone" onClick={() => inputRef.current?.click()}><FileUp size={26} /><strong>{fileName || 'Choose a CSV file'}</strong><span>or drop one here · max 10MB</span><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) parseFile(file); }} /></button><div className="csv-helper"><strong>Use these columns:</strong> date, type, amount, category, description<div className="csv-example">2026-03-12, expense, 24.50, Dining, Lunch</div></div></> : <><div className="import-summary"><div><strong>{rows.filter((row) => row.valid).length} ready to import</strong><span>{rows.filter((row) => !row.valid).length} rows need attention</span></div><button className="text-button" onClick={() => setRows([])}>Choose another file</button></div><div className="import-table"><table><thead><tr><th>Row</th><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Status</th></tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr key={`${row.id}-${index}`}><td>{index + 1}</td><td>{row.date || '—'}</td><td>{row.type || '—'}</td><td>{row.amount ? formatCurrency(row.amount) : '—'}</td><td>{row.categoryId ? getCategory(data.categories, row.categoryId).name : '—'}</td><td><span className={`status-pill ${row.valid ? 'valid' : 'invalid'}`}>{row.valid ? <><Check size={12} /> Ready</> : row.error}</span></td></tr>)}</tbody></table></div></>}<div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!rows.length || !rows.some((row) => row.valid)} onClick={() => onImport(rows)}><Check size={16} /> Import valid rows</button></div></div></div>;
}

function parseCsv(text: string, categories: Category[]): ImportRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].toLowerCase().split(',').map((cell) => cell.trim());
  const hasHeader = first.includes('date') || first.includes('amount');
  const headers = hasHeader ? first : ['date', 'type', 'amount', 'category', 'description'];
  const records = hasHeader ? lines.slice(1) : lines;
  return records.map((line, index) => {
    const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const values = Object.fromEntries(headers.map((header, headerIndex) => [header, cells[headerIndex] ?? '']));
    const date = values.date;
    const type = values.type?.toLowerCase() === 'income' ? 'income' : 'expense';
    const amount = Number(String(values.amount).replace(/[$,]/g, ''));
    const categoryName = values.category || 'Uncategorized';
    const existing = categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase());
    const error = !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'Date format' : !amount || amount <= 0 ? 'Amount' : !existing ? 'Category' : undefined;
    return { id: `import-${index}-${makeId()}`, type: type as TransactionType, amount, date, categoryId: existing?.id ?? '', description: values.description || categoryName, valid: !error, error };
  });
}

function exportCsv(data: BudgetlyData) {
  const rows = [['date', 'type', 'amount', 'category', 'description'], ...data.transactions.map((transaction) => [transaction.date, transaction.type, transaction.amount.toFixed(2), getCategory(data.categories, transaction.categoryId).name, transaction.description])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `budgetly-export-${isoDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span><Receipt size={17} /></span><strong>{title}</strong><p>{copy}</p></div>;
}
