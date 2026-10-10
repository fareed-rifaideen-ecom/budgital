import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const App = lazy(() => import('./App').then((module) => ({ default: module.App })));
const LandingPage = lazy(() => import('./LandingPage').then((module) => ({ default: module.LandingPage })));
const isAppRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');

function RouteLoading() {
  return <div className="splash-screen" role="status" aria-label="Loading Budgital"><div className="splash-orbit splash-orbit-one" /><div className="splash-orbit splash-orbit-two" /><div className="splash-logo">B</div><div className="splash-wordmark"><strong>Budgital</strong><span>Money, made clear.</span></div><div className="splash-author">Lumina Metrics by FMR<br /><small>Created by Fareed M. Rifaideen</small></div></div>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<RouteLoading />}>
      {isAppRoute ? <App /> : <LandingPage />}
    </Suspense>
  </React.StrictMode>,
);
