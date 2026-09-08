import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * useCinematicStory — GSAP owns the pinned scroll sequence; framer-motion
 * owns component-level UI motion. No property is animated twice.
 *
 * Scenes live in `.cin-stage .cin-scene`; each scene's `.cin-scene__bg` fades
 * in/out with a hand-rolled intensity profile (overlapping bumps, so seams
 * crossfade instead of cutting). The hero overlay `.cin-hero` fades away once
 * the walkthrough takes over. Lenis is created + destroyed here so only the
 * landing page smooth-scrolls (dashboards keep native scrolling).
 *
 * Everything is scoped to the returned rootRef and torn down on unmount.
 * Under prefers-reduced-motion the SMOOTH scroll (Lenis) and the entrance
 * animation are skipped — scrolling is native — but the scroll-scrubbed
 * video and scenes still run, since they are scroll-driven, not autonomous
 * animation.
 */
export default function useCinematicStory(rootRef, { roomPx = 600 } = {}) {
  const lenisRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* rootRef is bound to the .cin-stage element itself, so qre reject
       itself before falling back to a descendant search. */
    const stage = root.classList.contains("cin-stage")
      ? root
      : root.querySelector(".cin-stage");
    if (!stage) return;

    const sceneEls = Array.from(stage.querySelectorAll(".cin-scene"));
    const n = sceneEls.length;
    if (n < 1) return;

    const heroUI = stage.querySelector(".cin-hero");
    const RAIL = stage.querySelector(".cin-rail");
    const videoEl = stage.querySelector("video.cin-video");
    const videoScrollAt = { value: Date.now() };
    if (videoEl) {
      /* Start frozen at frame 0. The clip autoplayed once to force decode;
         play() is re-armed from ScrollTrigger.onUpdate, so scrolling is the
         only thing that runs it — pause keeps the exact frame, and resuming
         picks up right there. */
      videoEl.pause();
      videoEl.muted = true;
    }

    let normalized = 0;

    const sceneProgress = (i) => (n === 1 ? 0 : i / (n - 1));

    /* Intensity profile for scene i across the whole pinned run: a smooth
       bump peaking at its own station and reaching 0 at the midpoints
       between its neighbours, so seams overlap and crossfade. Edge scenes
       mirror the first/last step so their ramp starts/ends cleanly instead
       of dividing by infinity. */
    const step = n > 1 ? 1 / (n - 1) : 1;
    const sceneIntensity = (i, pr) => {
      const p = sceneProgress(i);
      const lo = i === 0 ? p - step : (sceneProgress(i - 1) + p) / 2;
      const hi = i === n - 1 ? p + step : (p + sceneProgress(i + 1)) / 2;
      if (pr <= lo || pr >= hi) return 0;
      const t = (pr - lo) / (hi - lo);
      return smooth(4 * t * (1 - t));
    };

    /* ── Lenis smooth scroll (skipped under reduced motion → native scroll). */
    let ctxLenis = null;
    if (!reduce) {
      const lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 1,
        smoothWheel: true,
        touchMultiplier: 1.6,
      });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      ctxLenis = { lenis, tick };
    }

    /* Per-frame renderer lives in the effect scope so the cleanup can
       detach it without referencing `ctx` from inside its own callback. */
    let renderFn = null;

    const ctx = gsap.context(() => {
      /* Entrance — the stage settles in on load (skipped under reduced
         motion; the page is just there). ctx.revert() kills this tween, so
         no manual cleanup is needed (and nothing may reference `ctx` inside
         this callback — it is still in the temporal dead zone). */
      if (!reduce) {
        gsap.fromTo(
          stage,
          { yPercent: 4, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 1.1,
            ease: "power2.out",
            clearProps: "all",
            onComplete: () => ScrollTrigger.refresh(),
          },
        );
      }

      /* Scroll driver — the banner is pinned, so scroll input drives the walk
         through the property (the video + captions) while the page holds
         still. Only after the story ends (the pin releases) does the page
         continue scrolling normally. */
      ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: "+=" + roomPx,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          normalized = self.progress;
          /* Active scrolling (any input) plays the clip; render() pauses it
             again the moment the scroll goes idle. */
          videoScrollAt.value = Date.now();
          if (videoEl && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
          document.documentElement.classList.toggle(
            "abn-stage-live",
            self.progress < 1,
          );
        },
      });

      /* The exit dissolve fades the stage away as it releases, so the page
         below takes over cleanly. */
      gsap.to(stage, {
        autoAlpha: 0,
        yPercent: -6,
        duration: 1.1,
        ease: "power1.in",
        scrollTrigger: {
          trigger: stage,
          start: "top top+=15%",
          end: "bottom top",
          scrub: true,
        },
      });

      /* ── The scrubbed frame renderer (one rAF pass updates everything) ── */
      const render = () => {
        const pr = normalized;

        /* Hero UI fades as the walkthrough takes over. */
        if (heroUI) {
          const hf = pr < 0.05 ? 1 : clamp(1 - smooth((pr - 0.05) / 0.18), 0, 1);
          gsap.set(heroUI, { autoAlpha: hf, y: -18 * (1 - hf) });
        }

        for (let i = 0; i < n; i++) {
          const el = sceneEls[i];
          const inten = sceneIntensity(i, pr);
          const t = clamp(inten, 0, 1);
          /* within-band parallax drift: rise as a scene approaches, fall as
             it passes — a subtle continuous camera feel, not a slide. */
          const drift = (pr - sceneProgress(i)) * 1.1;

          const bg = el.querySelector(".cin-scene__bg");
          if (bg) {
            /* With a live video the stills are poster-only — never paint over
               the clip. */
            gsap.set(bg, {
              opacity: videoEl ? 0 : inten,
              scale: 1.08,
              yPercent: clamp(-drift * 2, -3, 3),
              force3D: true,
            });
          }
          gsap.set(el, { autoAlpha: inten > 0.002 ? 1 : 0 });

          const fg = el.querySelector(".cin-scene__fg");
          if (fg) {
            gsap.set(fg, {
              opacity: videoEl ? 0 : 0.55 + 0.2 * t,
              xPercent: clamp(-drift * 3.4, -4, 4),
              yPercent: clamp(-drift * 1.4, -2, 2),
              force3D: true,
            });
          }

          /* Per-scene copy: quick in/out, held while the scene leads. */
          const copy = el.querySelector(".cin-scene__copy");
          if (copy) {
            const cf =
              t <= 0.12 || t >= 0.82
                ? 0
                : t < 0.22
                  ? smooth((t - 0.12) / 0.1)
                  : t > 0.72
                    ? 1 - smooth((t - 0.72) / 0.1)
                    : 1;
            gsap.set(copy, { autoAlpha: cf, y: 26 * (1 - cf) });
          }
        }

        /* Rail: current scene filled, counter reads. */
        if (RAIL) {
          const items = Array.from(
            RAIL.querySelectorAll(".cin-rail__item"),
          );
          items.forEach((it, idx) => {
            const fill = clamp(
              1 - Math.abs(pr - sceneProgress(idx)) * n,
              0,
              1,
            );
            gsap.set(it, { scaleX: 0.25 + 0.75 * smooth(fill) });
          });
          const num = RAIL.querySelector(".cin-rail__idx");
          if (num) {
            const i = clamp(Math.round(pr * (n - 1)), 0, n - 1);
            num.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
          }
        }

        /* Video pace — play is driven by scroll (onUpdate above); pause the
         moment scrolling stops (~250ms of idle) so the frame freezes and a
         later scroll resumes from that exact frame. */
        if (videoEl && !videoEl.paused) {
          if (Date.now() - videoScrollAt.value > 250) {
            videoEl.pause();
          }
        }
      };

      renderFn = render;
      gsap.ticker.add(render);
    }, stage);

    /* Recalculate trigger positions once fonts/images have settled. */
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener("load", refresh);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", refresh);
      if (ctxLenis) {
        gsap.ticker.remove(ctxLenis.tick);
        ctxLenis.lenis.destroy();
      }
      if (renderFn) gsap.ticker.remove(renderFn);
      document.documentElement.classList.remove("abn-stage-live");
      ctx.revert(); // kills tweens + ScrollTriggers, restores inline styles
      lenisRef.current = null;
    };
  }, [rootRef, roomPx]);

  return lenisRef;
}