import React, { lazy, Suspense } from 'react';
import { SplashScreen } from './SplashScreen';
import { createRoot } from 'react-dom/client';
import './styles.css';

const App = lazy(() => import('./App').then((module) => ({ default: module.App })));
const LandingPage = lazy(() => import('./LandingPage').then((module) => ({ default: module.LandingPage })));
const isAppRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');

function RouteLoading() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  return <SplashScreen theme={theme} onFinish={() => undefined} duration={999999} />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<RouteLoading />}>
      {isAppRoute ? <App /> : <LandingPage />}
    </Suspense>
  </React.StrictMode>,
);
