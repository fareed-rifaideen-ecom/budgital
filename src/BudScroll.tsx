import { useEffect, useRef } from 'react';

type Conditions = { desktop?: boolean; mobile?: boolean };

/**
 * "Bud" — the persistent scroll mascot.
 *
 * A single overlay mascot is moved between DOM-derived anchors by one scrubbed
 * GSAP timeline, so scrolling down and up replays the same narrative in
 * reverse. Positions are document coordinates, which keeps the mascot aligned
 * on every breakpoint without hardcoded pixel paths.
 */
export function BudScroll() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const mascotRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    const mascot = mascotRef.current;
    if (!rail || !mascot) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-bud-anchor]'));
    if (anchors.length < 2) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // GSAP loads after first paint so the animation never delays the page.
    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      ScrollTrigger.config({ ignoreMobileResize: true });

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        { desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' },
        (mediaContext) => {
          const desktop = Boolean((mediaContext.conditions as Conditions)?.desktop);
          const size = () => (desktop ? 86 : 60);

          const pointFor = (anchor: HTMLElement) => {
            const rect = anchor.getBoundingClientRect();
            const docLeft = rect.left + window.scrollX;
            const docTop = rect.top + window.scrollY;
            const side = anchor.dataset.budSide ?? 'right';
            const edge = desktop ? 30 : 16;
            let x = side === 'left' ? docLeft - size() - edge : docLeft + rect.width + edge;
            const maxX = document.documentElement.clientWidth - size() - 12;
            x = Math.min(Math.max(x, 12), Math.max(maxX, 12));
            const y = docTop + Math.min(rect.height * 0.42, 200) - size() / 2;
            return { x, y };
          };

          gsap.set(rail, { xPercent: 0, yPercent: 0, force3D: true, ...pointFor(anchors[0]) });

          const timeline = gsap.timeline({
            defaults: { ease: 'none', force3D: true },
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: desktop ? 0.85 : 0.55,
              invalidateOnRefresh: true,
            },
          });

          anchors.forEach((anchor, index) => {
            if (index === 0) return;
            timeline.to(rail, {
              x: () => pointFor(anchor).x,
              y: () => pointFor(anchor).y,
              rotation: desktop ? (index % 2 ? 6 : -6) : 0,
              scale: desktop && index % 3 === 0 ? 1.08 : 1,
              duration: 1,
            });
          });

          if (desktop) {
            gsap.to(mascot, { y: -7, duration: 1.9, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true });
            gsap.to('.bud-leaf-front', { rotation: 8, duration: 1.7, repeat: -1, yoyo: true, transformOrigin: '60px 32px', ease: 'sine.inOut' });
          }

          return () => {
            timeline.scrollTrigger?.kill();
            timeline.kill();
          };
        },
      );

        return () => media.revert();
      }, rail);

      let refreshTimer = 0;
      const requestRefresh = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
      };
      window.addEventListener('resize', requestRefresh, { passive: true });
      const refreshOnLoad = window.setTimeout(() => ScrollTrigger.refresh(), 400);
      cleanup = () => {
        window.removeEventListener('resize', requestRefresh);
        window.clearTimeout(refreshTimer);
        window.clearTimeout(refreshOnLoad);
        context.revert();
      };
    })();

    return () => { disposed = true; cleanup?.(); };
  }, []);

  return <div className="bud-rail" ref={railRef} aria-hidden="true">
    <svg className="bud-mascot" ref={mascotRef} viewBox="0 0 120 120" role="presentation">
      <defs>
        <linearGradient id="bud-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bud-body-a)" />
          <stop offset="100%" stopColor="var(--bud-body-b)" />
        </linearGradient>
        <linearGradient id="bud-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bud-leaf-a)" />
          <stop offset="100%" stopColor="var(--bud-leaf-b)" />
        </linearGradient>
      </defs>
      <ellipse className="bud-shadow" cx="60" cy="106" rx="26" ry="6" />
      <g className="bud-leaves">
        <path className="bud-leaf bud-leaf-back" d="M60 34c-9-4-13-13-10-21 9 1 15 7 16 16Z" fill="url(#bud-leaf)" />
        <path className="bud-leaf-front" d="M60 34c9-4 13-13 10-21-9 1-15 7-16 16Z" fill="url(#bud-leaf)" />
      </g>
      <circle className="bud-body" cx="60" cy="68" r="34" fill="url(#bud-body)" />
      <g className="bud-mark">
        <rect x="46" y="74" width="6" height="9" rx="2" />
        <rect x="56" y="68" width="6" height="15" rx="2" />
        <rect x="66" y="61" width="6" height="22" rx="2" />
      </g>
      <g className="bud-face">
        <circle className="bud-eye" cx="51" cy="58" r="4.4" />
        <circle className="bud-eye" cx="69" cy="58" r="4.4" />
        <path className="bud-smile" d="M51 68c3.6 4.2 12.4 4.2 16 0" />
      </g>
      <g className="bud-sparks">
        <circle className="bud-spark bud-spark-1" cx="26" cy="40" r="2.6" />
        <circle className="bud-spark bud-spark-2" cx="95" cy="52" r="2.2" />
        <circle className="bud-spark bud-spark-3" cx="88" cy="92" r="1.8" />
      </g>
    </svg>
  </div>;
}