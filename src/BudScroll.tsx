import { useEffect, useRef } from 'react';

type Conditions = { desktop?: boolean; mobile?: boolean };

/**
 * "Bud" — the persistent scroll mascot built from the uploaded Budgital artwork.
 *
 * One overlay mascot is moved between CTA anchors by a single scrubbed GSAP
 * timeline. Each keyframe is placed at the scroll progress where its anchor is
 * centred in the viewport, so the mascot drifts gradually toward the call to
 * action of every section instead of hopping between fixed coordinates, and it
 * plays the whole journey in reverse when the visitor scrolls back up.
 */
export function BudScroll() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const mascotRef = useRef<HTMLImageElement | null>(null);

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
            const size = () => (desktop ? 104 : 68);

            const targetFor = (anchor: HTMLElement) => {
              const rect = anchor.getBoundingClientRect();
              const docLeft = rect.left + window.scrollX;
              const docTop = rect.top + window.scrollY;
              const viewportWidth = document.documentElement.clientWidth;
              const gap = desktop ? 18 : 10;
              const explicitSide = anchor.dataset.budSide;
              const side = explicitSide ?? (docLeft + rect.width / 2 < viewportWidth / 2 ? 'right' : 'left');
              let x = side === 'right' ? docLeft + rect.width + gap : docLeft - size() - gap;
              const maxX = viewportWidth - size() - 10;
              x = Math.min(Math.max(x, 10), Math.max(maxX, 10));
              // Sit slightly above the call to action so the mascot reads as
              // approaching the button rather than covering it. Tall sections
              // keep the mascot near their heading instead of drifting to the
              // vertical middle, which would leave it far from the CTA.
              const offset = Math.min(rect.height / 2, 230);
              const y = docTop + offset - size() / 2 - size() * 0.18;
              return { x, y, side };
            };

            // Scroll progress at which each anchor is centred in the viewport.
            const progressFor = (anchor: HTMLElement) => {
              const rect = anchor.getBoundingClientRect();
              const docTop = rect.top + window.scrollY;
              const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
              const centred = docTop + rect.height / 2 - window.innerHeight / 2;
              return Math.min(Math.max(centred / scrollable, 0), 1);
            };

            const first = targetFor(anchors[0]);
            gsap.set(rail, { x: first.x, y: first.y, rotation: 0, scale: 1, force3D: true });

            const timeline = gsap.timeline({
              defaults: { force3D: true },
              scrollTrigger: {
                trigger: document.documentElement,
                start: 'top top',
                end: 'bottom bottom',
                scrub: desktop ? 0.85 : 0.55,
                invalidateOnRefresh: true,
              },
            });

            let previousProgress = 0;
            anchors.slice(1).forEach((anchor, index) => {
              const progress = progressFor(anchor);
              const span = Math.max(progress - previousProgress, 0.004);
              const target = targetFor(anchor);
              timeline.to(rail, {
                x: () => targetFor(anchor).x,
                y: () => targetFor(anchor).y,
                rotation: desktop ? (index % 2 ? 5 : -5) : 0,
                scale: desktop && index === anchors.length - 2 ? 1.12 : 1,
                duration: span,
                // Easing shapes the approach so the mascot eases into each CTA.
                ease: 'power2.inOut',
              }, previousProgress);
              previousProgress = progress;
            });

            // Gentle breathing while the page is idle (desktop only).
            if (desktop) {
              gsap.to(mascot, { y: -9, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true });
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

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div className="bud-rail" ref={railRef} aria-hidden="true">
    <img
      className="bud-mascot"
      ref={mascotRef}
      src="/bud-mascot.png"
      srcSet="/bud-mascot-small.png 200w, /bud-mascot.png 360w"
      sizes="(max-width: 900px) 68px, 104px"
      alt=""
      decoding="async"
      draggable={false}
    />
  </div>;
}
