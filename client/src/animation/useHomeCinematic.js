import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * useHomeCinematic — the scroll layer for the landing page.
 *
 * Division of labour (see CLAUDE.md): GSAP owns *scroll-scrubbed* motion,
 * framer-motion owns component-level motion (entrances, layout, gestures).
 * Nothing here animates a property that framer-motion also drives.
 *
 * Deliberately narrow: the only scrubbed element is the hero's decorative
 * background layer. Parallax is applied to background layers only, never to
 * text or interactive controls — moving a headline or a search field while
 * the user is reading or aiming at it hurts comprehension and can trigger
 * motion sickness. `.abn-hero` clips it with overflow:hidden.
 *
 * Everything is:
 *   • scoped to the returned rootRef, so other pages are untouched,
 *   • mounted/unmounted with the Home page (Lenis is created + destroyed
 *     here, so dashboards keep native scrolling),
 *   • skipped entirely under `prefers-reduced-motion` — the page renders in
 *     its final, fully-visible state with no hidden initial values.
 *
 * Returns a ref to attach to the landing root element.
 */
export default function useHomeCinematic() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Respect reduced-motion: no smooth scroll, no animation, nothing hidden.
    if (reduce) return;

    // ── Lenis smooth scroll, driven by the GSAP ticker (one rAF loop) ──
    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const bg = root.querySelector(".abn-hero-bg");
      const hero = root.querySelector(".abn-hero");
      if (!bg || !hero) return;

      // Hero background parallax. The layer is inset -12% top/bottom, so a
      // 12% travel stays inside its own box and never exposes an edge.
      // Delta kept small (skill guidance: 5-15) so foreground and background
      // never desync distractingly.
      gsap.fromTo(
        bg,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
            invalidateOnRefresh: true,
            // will-change is set in CSS on this layer only; drop the GPU
            // promotion once the hero has scrolled past.
            onLeave: () => gsap.set(bg, { willChange: "auto" }),
            onEnterBack: () => gsap.set(bg, { willChange: "transform" }),
          },
        },
      );
    }, rootRef);

    // Recalculate trigger positions once fonts/images have settled.
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener("load", refresh);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
      ctx.revert(); // kills tweens + ScrollTriggers, restores inline styles
    };
  }, []);

  return rootRef;
}
