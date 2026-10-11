import { useEffect } from 'react';

export type SplashTheme = 'light' | 'dark';

/**
 * Lightweight splash screen shared by the landing page and the app workspace.
 *
 * The animation is pure CSS over an inline SVG mark, so it costs no extra
 * network request, no image decode, and no JavaScript animation frames. The
 * only JavaScript is the dismissal timer.
 */
export function SplashScreen({ theme, onFinish, duration = 1150 }: { theme: SplashTheme; onFinish: () => void; duration?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onFinish]);

  return <div className={`splash-screen splash-animated ${theme === 'dark' ? 'splash-dark' : ''}`} role="status" aria-live="polite" aria-label="Loading Budgital">
    <div className="splash-orbit splash-orbit-one" aria-hidden="true" />
    <div className="splash-orbit splash-orbit-two" aria-hidden="true" />
    <div className="splash-halo" aria-hidden="true" />
    <div className="splash-stack">
      <span className="splash-mark" aria-hidden="true">
        <svg viewBox="0 0 96 96" role="img">
          <defs>
            <linearGradient id="budgital-splash-tile" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--splash-tile-a)" />
              <stop offset="100%" stopColor="var(--splash-tile-b)" />
            </linearGradient>
          </defs>
          <rect className="splash-tile" x="4" y="4" width="88" height="88" rx="26" fill="url(#budgital-splash-tile)" />
          <g className="splash-bars">
            <rect className="splash-bar splash-bar-1" x="25" y="60" width="12" height="16" rx="4" />
            <rect className="splash-bar splash-bar-2" x="42" y="48" width="12" height="28" rx="4" />
            <rect className="splash-bar splash-bar-3" x="59" y="34" width="12" height="42" rx="4" />
          </g>
          <path className="splash-baseline" d="M24 80h48" />
        </svg>
      </span>
      <div className="splash-wordmark">
        <strong>Budgital</strong>
        <span>Money, made clear.</span>
      </div>
      <div className="splash-loader" aria-hidden="true">
        <span className="splash-loader-track"><i /></span>
        <small>Preparing your workspace</small>
      </div>
    </div>
    <div className="splash-author">Lumina Metrics by FMR<br /><small>Created by Fareed M. Rifaideen</small></div>
  </div>;
}