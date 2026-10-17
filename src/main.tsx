import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerPwa } from './pwa';
import './styles.css';

const isAppRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');
const routeModule = isAppRoute ? import('./App') : import('./LandingPage');
const Route = lazy(() => routeModule.then((module: any) => ({
  default: isAppRoute ? module.App : module.LandingPage,
})));

registerPwa();

function RouteLoading() {
  return <div className={`route-shell ${isAppRoute ? 'route-shell-app' : 'route-shell-home'}`} role="status" aria-live="polite" aria-label="Loading Budgital">
    <div className="route-shell-mark" aria-hidden="true">B</div>
    <p className="route-shell-kicker">Budgital</p>
    <h1>{isAppRoute ? 'Your money, in plain English.' : 'Money, made clear.'}</h1>
    <p>{isAppRoute ? 'Opening your private browser workspace…' : 'A calmer way to budget, right in your browser.'}</p>
  </div>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<RouteLoading />}>
      <Route />
    </Suspense>
  </React.StrictMode>,
);
