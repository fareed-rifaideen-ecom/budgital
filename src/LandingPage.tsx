import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, ChevronDown, Coffee, Moon, ShieldCheck, Sparkles, Sun, WalletCards, Zap } from 'lucide-react';

type LandingTheme = 'light' | 'dark';
const SETTINGS_KEY = 'budgetly-settings-v1';

function getTheme(): LandingTheme {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { theme?: LandingTheme };
    if (stored.theme === 'light' || stored.theme === 'dark') return stored.theme;
  } catch { /* use OS preference */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function LandingPage() {
  const [theme, setTheme] = useState<LandingTheme>(getTheme);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.title = 'Budgital — A calmer way to budget';
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', 'Budgital is a private, browser-first personal budget app for tracking income, expenses, category budgets, insights, and portable CSV backups.');
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  const faqs = [
    ['Does Budgital connect to my bank?', 'No. Budgital keeps your budget in the browser and gives you CSV import and export, so you stay in control of the source data.'],
    ['What makes Budgital different?', 'It is intentionally smaller than a financial super-app: one calm workspace for income, expenses, monthly envelopes, transparent insights, and optional aggregate-only AI.'],
    ['Can I use Gemini without sending transactions?', 'Yes. The optional AI assistant receives aggregate totals and category totals, not individual descriptions or transaction rows.'],
  ];
  return <div className="landing-page">
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Budgital home"><span className="brand-mark">B</span><span><strong>Budgital</strong><small>Money, made clear.</small></span></a>
      <nav className="landing-links" aria-label="Landing page navigation"><a href="#difference">Why Budgital</a><a href="#privacy">Privacy</a><a href="#faq">FAQ</a></nav>
      <div className="landing-actions"><button className="landing-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><a className="button button-dark" href="/app">Open the app <ArrowRight size={16} /></a></div>
    </header>

    <main>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Browser-first personal budgeting</div>
          <h1>Your money, <em>in plain English.</em></h1>
          <p className="hero-lede">Budgital makes the everyday budget feel lighter: log what comes in, plan what goes out, and see the next useful move without linking a bank account.</p>
          <div className="hero-ctas"><a className="button button-dark button-large" href="/app">Build your first clear month <ArrowRight size={17} /></a><a className="text-link" href="#difference">See how it works <ChevronDown size={15} /></a></div>
          <div className="hero-proof"><span><ShieldCheck size={15} /> Local by default</span><span><Check size={15} /> CSV in, CSV out</span><span><Sparkles size={15} /> Optional AI</span></div>
        </div>
        <div className="hero-art" aria-label="Budgital dashboard preview">
          <div className="orb orb-a" /><div className="orb orb-b" />
          <div className="glass-window">
            <div className="window-top"><span className="window-dots"><i /><i /><i /></span><span>Budgital / Overview</span><span className="window-pill">Oct 2026</span></div>
            <div className="window-inner"><div className="window-kicker">YOUR MONTHLY PULSE</div><h2>$3,082 <small>available</small></h2><div className="window-progress"><span /></div><div className="window-grid"><div className="mini-card"><small>Spent this month</small><strong>$2,918</strong><span className="up">↓ 6% vs Sep</span></div><div className="mini-card accent"><small>Dining</small><strong>72%</strong><span>of budget used</span></div></div><div className="window-insight"><span className="insight-spark"><Sparkles size={14} /></span><div><strong>Small signal</strong><p>Dining is the category worth watching next.</p></div></div></div>
          </div>
        </div>
      </section>

      <section className="trust-strip"><span>Designed for people who want</span><strong>clarity</strong><strong>privacy</strong><strong>momentum</strong><span>without a financial super-app.</span></section>

      <section className="landing-section" id="difference"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-dot" /> A smaller, calmer system</div><h2>Less dashboard noise.<br /><em>More useful next steps.</em></h2><p>Budgital is deliberately focused. It gives your money a home, not another stream of notifications.</p></div><div className="feature-grid"><article className="feature-card feature-dark"><span className="feature-icon"><WalletCards size={20} /></span><h3>See the month at a glance</h3><p>Category envelopes, remaining budget, and month-over-month movement live together in one quiet surface.</p><span className="feature-number">01</span></article><article className="feature-card feature-lime"><span className="feature-icon"><Zap size={20} /></span><h3>Turn numbers into language</h3><p>Plain-English local insights tell you what changed and where a small adjustment could help.</p><span className="feature-number">02</span></article><article className="feature-card feature-glass"><span className="feature-icon"><BarChart3 size={20} /></span><h3>Keep your data portable</h3><p>Import a CSV, export a backup, or start fresh. Your budget is not trapped behind an account.</p><span className="feature-number">03</span></article></div></section>

      <section className="split-section" id="privacy"><div className="privacy-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="privacy-core"><ShieldCheck size={28} /><span>Local first</span></div></div><div className="split-copy"><div className="eyebrow"><span className="eyebrow-dot" /> A visible boundary</div><h2>Your budget should feel <em>private.</em></h2><p>Budgital stores your working data in this browser. Optional AI is a second opinion, not the foundation: only the selected period's aggregate totals and category totals are sent to Gemini.</p><ul className="check-list"><li><Check size={15} /> No bank connection required</li><li><Check size={15} /> Export whenever you want</li><li><Check size={15} /> AI stays optional and rate-limited</li></ul><a className="text-link" href="/app#data">Read the data boundary in the app <ArrowRight size={15} /></a></div></section>

      <section className="author-section"><div className="author-mark">FMR</div><div><div className="eyebrow"><span className="eyebrow-dot" /> Made by an independent builder</div><h2>Lumina Metrics <em>by FMR.</em></h2><p>Budgital is created by <strong>Fareed M. Rifaideen</strong> — a product-minded builder exploring calmer, more human tools for everyday decisions.</p><div className="author-links"><a href="https://fareed-rifaideen.netlify.app/" target="_blank" rel="noreferrer">Website</a><a href="https://github.com/fareed-rifaideen-ecom" target="_blank" rel="noreferrer">GitHub</a><a href="https://www.linkedin.com/in/fareed03" target="_blank" rel="noreferrer">LinkedIn</a><a className="coffee-link" href="https://buymeacoffee.com/fareedmrifaideen" target="_blank" rel="noreferrer"><Coffee size={15} /> Buy me a coffee</a></div></div></section>

      <section className="faq-section" id="faq"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-dot" /> Straight answers</div><h2>Questions people ask<br /><em>before they begin.</em></h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
    </main>

    <footer className="landing-footer"><a className="landing-brand" href="/"><span className="brand-mark">B</span><span><strong>Budgital</strong><small>Lumina Metrics by FMR</small></span></a><div><span>© 2026 Lumina Metrics by FMR</span><a href="/app">Open app</a><a href="https://buymeacoffee.com/fareedmrifaideen" target="_blank" rel="noreferrer"><Coffee size={14} /> Support the builder</a></div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Budgital', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', description: 'A private browser-first personal budget app with CSV workflows, monthly category budgets, plain-English insights, and optional aggregate-only AI.', author: { '@type': 'Person', name: 'Fareed M. Rifaideen', url: 'https://fareed-rifaideen.netlify.app/' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }) }} />
  </div>;
}
