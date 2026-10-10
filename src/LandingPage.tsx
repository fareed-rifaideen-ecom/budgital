import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUp, BarChart3, Check, ChevronDown, Coffee, Code2, Globe2, BriefcaseBusiness, Moon, ShieldCheck, Sparkles, Sun, WalletCards, X, Zap } from 'lucide-react';

type LandingTheme = 'light' | 'dark';
const SETTINGS_KEY = 'budgetly-settings-v1';
const LIGHT_MARK = '/manus-storage/async-images/guwKSoPjBUZwsI5QiSwHyO/image-1.webp';
const DARK_MARK = '/manus-storage/async-images/guwKSoPjBUZwsI5QiSwHyO/image-2.webp';

function getTheme(): LandingTheme {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { theme?: LandingTheme };
    if (stored.theme === 'light' || stored.theme === 'dark') return stored.theme;
  } catch { /* use OS preference */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const faqs = [
  ['Does Budgital connect to my bank?', 'No. Budgital keeps your budget in the browser and gives you CSV import and export, so you stay in control of the source data.'],
  ['Is Budgital free to use?', 'Yes. Budgital is a free browser-first budgeting workspace with no subscription commitment required to start tracking a month.'],
  ['What makes Budgital different from a bank-linked budget app?', 'It is intentionally smaller than a financial super-app: one calm workspace for income, expenses, monthly envelopes, transparent insights, and optional aggregate-only AI without a required bank connection.'],
  ['Can I budget without linking a bank account?', 'Yes. Add entries manually or import a CSV, set category budgets, and export a portable backup whenever you want.'],
  ['Does Budgital store my transactions on a server?', 'Your working budget stays in this browser. The optional AI feature sends aggregate totals and category totals only; individual descriptions and transaction rows stay local.'],
  ['Can I use multiple currencies in Budgital?', 'Yes. You can record USD, EUR, GBP, LKR, INR, AUD, CAD, JPY, AED, SAR, and PHP, choose a base currency, and request cautious Gemini conversion estimates.'],
  ['Are Gemini exchange rates live or financial advice?', 'No. They are informational estimates that may be stale or uncertain. Verify an exchange rate before making a financial decision.'],
  ['Can I export my budget if I stop using Budgital?', 'Yes. The export includes transactions, categories, budgets, currencies, and conversion metadata so your data remains portable.'],
  ['Who is Budgital for?', 'It is for people who want a clear monthly budget without committing to a bank aggregator, a paid financial super-app, or a complicated accounting workflow.'],
  ['How do I start my first budget?', 'Open the app, review the starter view or clear it from Data, set a base currency, add income and expenses, then give each spending category a realistic monthly number.'],
];

export function LandingPage() {
  const [theme, setTheme] = useState<LandingTheme>(getTheme);
  const [openFaq, setOpenFaq] = useState(0);
  const [authorOpen, setAuthorOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.title = 'Budgital — A calmer way to budget';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Budgital is a free, private, browser-first personal budget app for income, expenses, category budgets, multi-currency tracking, insights, and portable CSV backups.');
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
  }, [theme]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible')), { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    const onScroll = () => setShowTop(window.scrollY > 620);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  const mark = theme === 'dark' ? DARK_MARK : LIGHT_MARK;
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return <div className="landing-page">
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Budgital home"><span className="brand-mark"><img src={mark} alt="" /></span><span><strong>Budgital</strong><small>Money, made clear.</small></span></a>
      <nav className="landing-links" aria-label="Landing page navigation"><a href="#difference">Why Budgital</a><a href="#privacy">Privacy</a><a href="#faq">FAQ</a></nav>
      <div className="landing-actions"><button className="landing-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><a className="button button-dark" href="/app">Open the app <ArrowRight size={16} /></a></div>
    </header>

    <main>
      <section className="landing-hero" data-reveal>
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Browser-first personal budgeting</div>
          <h1>Your money, <em>in plain English.</em></h1>
          <p className="hero-lede">Budgital makes the everyday budget feel lighter: log what comes in, plan what goes out, and see the next useful move without linking a bank account.</p>
          <div className="hero-ctas"><a className="button button-dark button-large" href="/app">Build your first clear month <ArrowRight size={17} /></a><a className="text-link" href="#difference">See how it works <ChevronDown size={15} /></a></div>
          <button className="mobile-theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Use {theme === 'dark' ? 'light' : 'dark'} mode</button>
          <div className="hero-proof"><span><ShieldCheck size={15} /> Local by default</span><span><Check size={15} /> CSV in, CSV out</span><span><Sparkles size={15} /> Optional AI</span></div>
        </div>
        <div className="hero-art" aria-label="Budgital dashboard preview"><div className="orb orb-a" /><div className="orb orb-b" /><div className="glass-window"><div className="window-top"><span className="window-dots"><i /><i /><i /></span><span>Budgital / Overview</span><span className="window-pill">Oct 2026</span></div><div className="window-inner"><div className="window-kicker">YOUR MONTHLY PULSE</div><h2>$3,082 <small>available</small></h2><div className="window-progress"><span /></div><div className="window-grid"><div className="mini-card"><small>Spent this month</small><strong>$2,918</strong><span className="up">↓ 6% vs Sep</span></div><div className="mini-card accent"><small>Dining</small><strong>72%</strong><span>of budget used</span></div></div><div className="window-insight"><span className="insight-spark"><Sparkles size={14} /></span><div><strong>Small signal</strong><p>Dining is the category worth watching next.</p></div></div></div></div></div>
      </section>

      <section className="trust-strip" data-reveal><span>Designed for people who want</span><strong>clarity</strong><strong>privacy</strong><strong>momentum</strong><span>without a financial super-app.</span></section>

      <section className="landing-section" id="difference" data-reveal><div className="section-intro"><div className="eyebrow"><span className="eyebrow-dot" /> A smaller, calmer system</div><h2>Less dashboard noise.<br /><em>More useful next steps.</em></h2><p>Budgital is deliberately focused. It gives your money a home, not another stream of notifications.</p></div><div className="feature-grid"><article className="feature-card feature-dark"><span className="feature-icon"><WalletCards size={20} /></span><h3>See the month at a glance</h3><p>Category envelopes, remaining budget, and month-over-month movement live together in one quiet surface.</p><span className="feature-number">01</span></article><article className="feature-card feature-lime"><span className="feature-icon"><Zap size={20} /></span><h3>Turn numbers into language</h3><p>Plain-English local insights tell you what changed and where a small adjustment could help.</p><span className="feature-number">02</span></article><article className="feature-card feature-glass"><span className="feature-icon"><BarChart3 size={20} /></span><h3>Keep your data portable</h3><p>Import a CSV, export a backup, or start fresh. Your budget is not trapped behind an account.</p><span className="feature-number">03</span></article></div></section>

      <section className="split-section" id="privacy" data-reveal><div className="privacy-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="privacy-core"><ShieldCheck size={28} /><span>Local first</span></div></div><div className="split-copy"><div className="eyebrow"><span className="eyebrow-dot" /> A visible boundary</div><h2>Your budget should feel <em>private.</em></h2><p>Budgital stores your working data in this browser. Optional AI is a second opinion, not the foundation: only the selected period's aggregate totals and category totals are sent to Gemini.</p><ul className="check-list"><li><Check size={15} /> No bank connection required</li><li><Check size={15} /> Export whenever you want</li><li><Check size={15} /> AI stays optional and rate-limited</li></ul><a className="text-link" href="/app#data">Read the data boundary in the app <ArrowRight size={15} /></a></div></section>

      <section className="author-section" data-reveal><button className="author-mark" onClick={() => setAuthorOpen(true)} aria-label="Open author details"><img src={mark} alt="" /></button><div><div className="eyebrow"><span className="eyebrow-dot" /> Made by an independent builder</div><button className="author-title" onClick={() => setAuthorOpen(true)}>Lumina Metrics <em>by FMR.</em></button><p>Budgital is created by <strong>Fareed M. Rifaideen</strong> — a product-minded builder exploring calmer, more human tools for everyday decisions.</p><button className="support-builder" onClick={() => setAuthorOpen(true)}><Coffee size={15} /> Support the builder <ArrowRight size={14} /></button></div></section>

      <section className="faq-section" id="faq" data-reveal><div className="section-intro"><div className="eyebrow"><span className="eyebrow-dot" /> Straight answers</div><h2>Questions people ask<br /><em>before they begin.</em></h2><p className="faq-helper">Short answers for private budgeting, AI-assisted insights, currencies, and getting started without a commitment.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
    </main>

    <footer className="landing-footer"><a className="landing-brand" href="/"><span className="brand-mark"><img src={mark} alt="" /></span><span><strong>Budgital</strong><small>Lumina Metrics by FMR</small></span></a><div><span>© 2026 Lumina Metrics by FMR</span><a href="/app">Open app</a><button className="support-builder footer-support" onClick={() => setAuthorOpen(true)}><Coffee size={14} /> Support the builder</button></div></footer>

    {authorOpen && <div className="author-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthorOpen(false); }}><section className="author-modal" role="dialog" aria-modal="true" aria-labelledby="author-title"><button className="icon-button author-close" onClick={() => setAuthorOpen(false)} aria-label="Close author details"><X size={18} /></button><div className="author-modal-mark"><img src={mark} alt="" /></div><div className="eyebrow"><span className="eyebrow-dot" /> Lumina Metrics by FMR</div><h2 id="author-title">Built from a real need.</h2><p>Fareed M. Rifaideen is passionate about finding creative solutions that make everyday life easier. Budgital started as a tool to solve his own budgeting problem, then became something worth sharing with the community for free.</p><div className="author-modal-links"><a href="https://fareed-rifaideen.netlify.app/" target="_blank" rel="noreferrer"><Globe2 size={16} /> Website</a><a href="https://github.com/fareed-rifaideen-ecom" target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub</a><a href="https://www.linkedin.com/in/fareed03" target="_blank" rel="noreferrer"><BriefcaseBusiness size={16} /> LinkedIn</a><a className="coffee-link" href="https://buymeacoffee.com/fareedmrifaideen" target="_blank" rel="noreferrer"><Coffee size={16} /> Buy me a Coffee</a></div></section></div>}
    {showTop && <button className="back-to-top" onClick={scrollTop} aria-label="Back to top"><ArrowUp size={17} /><span>Top</span></button>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Budgital', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', description: 'A free private browser-first personal budget app with CSV workflows, monthly category budgets, multi-currency tracking, plain-English insights, and optional aggregate-only AI.', author: { '@type': 'Person', name: 'Fareed M. Rifaideen', url: 'https://fareed-rifaideen.netlify.app/' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }) }} />
  </div>;
}
