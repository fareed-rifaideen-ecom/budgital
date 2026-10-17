import { useEffect, useRef, useState } from 'react';

/**
 * "Bud" — the scroll-driven mascot video.
 *
 * The video stays pinned to the right side of the viewport (it never travels
 * across the page). Scrolling scrubs its playback: the first frame plays at the
 * top of the page and the last frame lands at the bottom, so the mascot
 * animation is driven entirely by the scroll position and rewinds naturally
 * when the visitor scrolls back up. A small vertical drift keeps it feeling
 * alive without moving it away from the right edge.
 *
 * The clip is rendered on a white background, so the layer removes that
 * background per theme: `multiply` on light surfaces, and an
 * `invert + hue-rotate` filter with `screen` blending on dark surfaces.
 */
export function BudScroll() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const driftRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [isMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  // Pick the right encode up front: setting `src` directly avoids
  // <source media> selection quirks and keeps the fallback logic simple.
  const [source] = useState(() => (window.matchMedia('(max-width: 900px)').matches
    ? '/mascot/bud-scrub-small.mp4'
    : '/mascot/bud-scrub.mp4'));

  useEffect(() => {
    const rail = railRef.current;
    const drift = driftRef.current;
    if (!rail || !drift) return;

    const video = videoRef.current;
    // Reduced motion (or no video support) keeps the static transparent mascot.
    if (reducedMotion || isMobile || !video || videoFailed) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    let rafId = 0;

    const buildScrollAnimation = async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8;
      const doSeek = duration / Math.max(1, Math.round(duration * 24));

      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* metadata not ready yet */
      }

      const seek = { time: 0 };
      const context = gsap.context(() => {
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // 1. Play the clip from first to last frame across the whole page.
        timeline.to(
          seek,
          {
            time: duration,
            duration: 1,
            onUpdate: () => {
              // Only touch currentTime when the frame would actually change.
              if (Math.abs(seek.time - video.currentTime) >= doSeek) {
                try {
                  video.currentTime = seek.time;
                } catch {
                  /* seeking can be refused before metadata is ready */
                }
              }
            },
          },
          0,
        );

        // 2. Small vertical drift on the right edge — the video never travels.
        timeline.fromTo(drift, { y: -16 }, { y: 16, duration: 1, ease: 'power1.inOut' }, 0);
      }, drift);

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
    };

    const start = () => {
      void buildScrollAnimation();
    };

    if (video.readyState >= 1) start();
    else {
      video.addEventListener('loadedmetadata', start, { once: true });
      // Only give up if the browser really reports a media error; a slow
      // connection should not downgrade the mascot to the static image.
      rafId = window.setTimeout(() => {
        if (disposed) return;
        if (video.readyState >= 1) start();
        else if (video.error) setVideoFailed(true);
      }, 2500);
    }

    return () => {
      disposed = true;
      window.clearTimeout(rafId);
      video.removeEventListener('loadedmetadata', start);
      cleanup?.();
    };
  }, [isMobile, reducedMotion, videoFailed]);

  const isStatic = videoFailed || reducedMotion || isMobile;

  return <div className={`bud-rail ${isStatic ? 'is-static' : 'is-live'}`} ref={railRef} aria-hidden="true">
    <div className="bud-rail-drift" ref={driftRef}>
    {videoFailed || reducedMotion || isMobile
      ? <img className="bud-mascot bud-mascot-static" src="/bud-mascot.png" srcSet="/bud-mascot-small.png 200w, /bud-mascot.png 360w" sizes="(max-width: 900px) 172px, 262px" alt="" decoding="async" draggable={false} />
      : <video
        className="bud-mascot"
        ref={videoRef}
        src={source}
        poster="/mascot/bud-scrub-poster.jpg"
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        onError={(event) => {
          const media = event.currentTarget;
          if (media.error) setVideoFailed(true);
        }}
        tabIndex={-1}
      />}
    </div>
  </div>;
}
