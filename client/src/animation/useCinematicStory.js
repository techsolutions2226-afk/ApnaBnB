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
 * the walkthrough starts. Lenis is created + destroyed here so only the
 * landing page smooth-scrolls (dashboards keep native scrolling).
 *
 * Everything is scoped to the returned rootRef and torn down on unmount.
 * Under prefers-reduced-motion the hook returns immediately: the page renders
 * static, fully visible and functional.
 */
export default function useCinematicStory(rootRef, { roomPx = 600 } = {}) {
  const lenisRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    const stage = root.querySelector(".cin-stage");
    if (!stage) return;

    const sceneEls = Array.from(stage.querySelectorAll(".cin-scene"));
    const n = sceneEls.length;
    if (n < 1) return;

    const heroUI = stage.querySelector(".cin-hero");
    const RAIL = stage.querySelector(".cin-rail");
    const videoEl = stage.querySelector("video.cin-video");

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

    /* ── Lenis smooth scroll, driven by the GSAP ticker (one rAF loop) ── */
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

    const ctx = gsap.context(() => {
      /* Entrance — the stage settles in on load. */
      const entrance = gsap.fromTo(
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
      ctx.add(() => entrance.kill());

      /* Pin — the stage holds its viewport while the story scrubs. */
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
          document.documentElement.classList.toggle(
            "abn-stage-live",
            self.progress < 1,
          );
        },
      });

      /* The exit: as the pin releases, the stage dissolves into the page. */
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

        /* Hero UI fades away as the walkthrough takes over. */
        if (heroUI) {
          const hf = pr < 0.03 ? 1 : clamp(1 - smooth((pr - 0.03) / 0.06), 0, 1);
          gsap.set(heroUI, { autoAlpha: hf, y: -18 * (1 - hf) });
        }

        for (let i = 0; i < n; i++) {
          const el = sceneEls[i];
          const bg = el.querySelector(".cin-scene__bg");
          if (!bg) continue;

          const inten = sceneIntensity(i, pr);
          const t = clamp(inten, 0, 1);
          /* within-band parallax drift: rise as a scene approaches, fall as
             it passes — a subtle continuous camera feel, not a slide. */
          const drift = (pr - sceneProgress(i)) * 1.1;

          gsap.set(bg, {
            opacity: inten,
            scale: 1.08,
            yPercent: clamp(-drift * 2, -3, 3),
            force3D: true,
          });
          gsap.set(el, { autoAlpha: inten > 0.002 ? 1 : 0 });

          const fg = el.querySelector(".cin-scene__fg");
          if (fg) {
            gsap.set(fg, {
              opacity: 0.55 + 0.2 * t,
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

        /* Video scrubbing (only when a clip is configured — none ships yet):
           coalesce seeks to the innermost 30ms so a fast flick never queues
           dozens of currentTime calls. */
        if (videoEl) {
          const d = videoEl.duration;
          if (Number.isFinite(d) && d > 0 && videoEl.readyState >= 1) {
            const target = pr * (d - 0.06);
            if (Math.abs(target - videoEl.currentTime) > 0.03) {
              videoEl.currentTime = target;
            }
          }
        }
      };

      gsap.ticker.add(render);
      ctx.add(() => gsap.ticker.remove(render));
    }, stage);

    /* Recalculate trigger positions once fonts/images have settled. */
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener("load", refresh);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("abn-stage-live");
      ctx.revert(); // kills tweens + ScrollTriggers, restores inline styles
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [rootRef, roomPx]);

  return lenisRef;
}