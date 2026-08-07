import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * useHomeCinematic — a purely additive scroll-cinematic layer for the landing
 * page. It does NOT touch layout, colour, typography or markup; it only drives
 * GPU transforms (translate / rotate / scale) + opacity on the existing
 * elements, plus Lenis smooth scrolling.
 *
 * Everything is:
 *   • scoped to the returned rootRef (so other pages are untouched),
 *   • mounted/unmounted with the Home page (Lenis is created + destroyed here,
 *     so dashboards / Messages keep native scrolling),
 *   • disabled entirely under `prefers-reduced-motion` (elements stay at their
 *     natural, fully-visible state — no hidden initial states).
 *
 * Returns a ref to attach to the landing root element.
 */
export default function useHomeCinematic() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Respect reduced-motion: no smooth scroll, no animation, nothing hidden.
    if (reduce) return;

    // ── Lenis smooth scroll, driven by the GSAP ticker (single rAF loop) ──
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

    // Track pointer-tilt cleanup so we can detach on unmount.
    const detachers = [];

    // Give one element mouse-tilt + hover-lift, composed with any scroll
    // transforms GSAP is already driving on it (GSAP merges rotationX/Y with
    // y/rotation into a single matrix — so nothing fights).
    const addTilt = (el, { max = 8, lift = 1.02 } = {}) => {
      const rotX = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
      const rotY = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
      const scaleTo = gsap.quickTo(el, "scale", { duration: 0.5, ease: "power3" });
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotY(px * max);
        rotX(-py * max);
      };
      const onEnter = () => scaleTo(lift);
      const onLeave = () => {
        rotX(0);
        rotY(0);
        scaleTo(1);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
      detachers.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
      });
    };

    const ctx = gsap.context(() => {
      // ── 1. Hero intro — staggered reveal of the left column ──
      // (runs before paint inside useLayoutEffect, so no flash of hidden text)
      // fromTo pins the END state to fully-visible, so the hero can NEVER get
      // stuck hidden even if GSAP initialises mid-CSS-animation or under
      // StrictMode's double mount.
      gsap.fromTo(
        [
          ".home-landing-eyebrow",
          ".home-landing-title",
          ".hero-search",
          ".home-landing-tagline",
          ".home-feature-tags",
        ],
        { y: 26, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.05,
          overwrite: "auto",
          clearProps: "opacity,visibility",
        }
      );

      // ── 2. Animated counters — count any numeric feature tag up from 0 ──
      root.querySelectorAll(".home-feature-tags li").forEach((li) => {
        const node = [...li.childNodes].find(
          (n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.nodeValue)
        );
        if (!node) return;
        const raw = node.nodeValue;
        const m = raw.match(/([\d,]+)/);
        if (!m) return;
        const target = parseInt(m[1].replace(/,/g, ""), 10);
        const prefix = raw.slice(0, m.index);
        const suffix = raw.slice(m.index + m[1].length);
        const obj = { v: 0 };
        node.nodeValue = prefix + "0" + suffix;
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: { trigger: li, start: "top 92%", once: true },
          onUpdate() {
            node.nodeValue =
              prefix + Math.round(obj.v).toLocaleString() + suffix;
          },
        });
      });

      // ── 3. Hero "camera" depart — the whole hero grid eases back on scroll ──
      // fromTo pins the start baseline (no opacity fade here — a scroll-linked
      // opacity on the hero is exactly what could hide it on load).
      gsap.fromTo(
        ".home-landing-grid",
        { yPercent: 0, scale: 1 },
        {
          yPercent: -4,
          scale: 0.985,
          ease: "none",
          scrollTrigger: {
            trigger: ".home-landing-grid",
            start: "top top",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );

      // ── 4. Right feature cards — layered parallax + image + rotate + tilt ──
      const featureCards = root.querySelectorAll(".home-feature-card");
      featureCards.forEach((card, i) => {
        // Layered vertical parallax (alternating depth) + a whisper of rotate.
        gsap.to(card, {
          yPercent: i % 2 === 0 ? -9 : -16,
          rotation: i % 2 === 0 ? -1.1 : 1.1,
          ease: "none",
          scrollTrigger: {
            trigger: ".home-landing-grid",
            start: "top top",
            end: "bottom top",
            scrub: 1.1,
          },
        });
        // Independent background-image parallax (moves at its own rate).
        gsap.fromTo(
          card,
          { backgroundPositionY: "42%" },
          {
            backgroundPositionY: "58%",
            ease: "none",
            scrollTrigger: {
              trigger: ".home-landing-grid",
              start: "top top",
              end: "bottom top",
              scrub: 1.4,
            },
          }
        );
        addTilt(card, { max: 9, lift: 1.03 });
      });

      // ── 5. Featured section heading reveal ──
      gsap.from(".home-featured-head > div > *", {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".home-featured", start: "top 82%", once: true },
      });

      // ── 6. Property cards — staggered load, float, rotate, tilt ──
      const propCards = root.querySelectorAll(".home-featured-grid .prop-card");
      if (propCards.length) {
        gsap.set(propCards, { autoAlpha: 0, y: 44 });
        ScrollTrigger.batch(propCards, {
          start: "top 90%",
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.09,
              overwrite: true,
            }),
        });
        propCards.forEach((card, i) => {
          // Continuous float (yPercent) + gentle rotate — sums with the reveal
          // y(px) above because px and % translate are separate GSAP channels.
          gsap.to(card, {
            yPercent: -7,
            rotation: i % 2 === 0 ? -0.8 : 0.8,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
          addTilt(card, { max: 7, lift: 1.02 });
        });
      }
    }, rootRef);

    // Recalculate trigger positions once fonts/images have settled.
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener("load", refresh);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", refresh);
      detachers.forEach((fn) => fn());
      gsap.ticker.remove(tick);
      lenis.destroy();
      ctx.revert(); // kills tweens + ScrollTriggers, restores inline styles
    };
  }, []);

  return rootRef;
}
