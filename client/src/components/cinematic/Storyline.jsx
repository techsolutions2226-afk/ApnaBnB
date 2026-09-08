import { useCallback, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import useCinematicStory from "../../animation/useCinematicStory";
import HeroBand from "./HeroBand";
import StorylineSkip from "./StorylineSkip";
import { CINEMATIC_SCENES, CINEMATIC_VIDEO } from "../../config/cinematic";

/**
 * Storyline — the pinned cinematic walkthrough.
 *
 * Structure rendered (the GSAP story hook targets these exact classes):
 *   .cin-stage            → pinned 100vh block
 *     .cin-backdrop       → shared atmosphere
 *     .cin-scene (×N)     → one per walkthrough frame
 *       .cin-scene__bg    → crossfade still layer
 *       .cin-scene__fg    → optional parallax foreground (unused today)
 *       .cin-scene__shade → legibility scrim
 *       .cin-scene__copy  → per-scene caption (walkthrough frames only)
 *     .cin-hero           → first-frame marketplace hero + search
 *     .cin-rail           → scene index progress rail
 *     .cin-skip           → escape hatch to the marketplace
 *
 * The "camera" is simulated with layered stills: each frame settles from a
 * gentle 1.08× scale with slight parallax drift, seams crossfade (overlapping
 * intensity bumps, driven by scroll) so the journey stays continuous rather
 * than slide-like. Under prefers-reduced-motion the hook does nothing and the
 * stage renders as a static marketplace hero — fully functional.
 */
export default function Storyline({
  roomPx = 600,
  scrollTargetRef,
  ...search
}) {
  const rootRef = useRef(null);
  const reduce = useReducedMotion();
  const lenisRef = useCinematicStory(rootRef, { roomPx });

  /* The Kling clip is the banner background whenever it's configured. It's
     intentionally NOT autoplayed — GSAP scrubs its currentTime from scroll,
     so scroll runs it, stopping freezes the frame, and scrolling again
     resumes from exactly where you stopped. */
  const videoOn = Boolean(CINEMATIC_VIDEO);

  /* Portrait + short-height composition classes. */
  useLayoutEffect(() => {
    const stage = rootRef.current;
    if (!stage) return;
    const update = () => {
      stage.classList.toggle("is-portrait", window.innerWidth <= 768);
      stage.classList.toggle("cin-stage--short", window.innerHeight < 560);
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleSkip = useCallback(
    (e) => {
      e.preventDefault();
      const target = scrollTargetRef?.current;
      if (!target) return;
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { offset: 0, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    },
    [scrollTargetRef, reduce, lenisRef],
  );

  return (
    <section
      ref={rootRef}
      data-room-px={roomPx}
      className={`cin-stage${videoOn ? " has-video" : ""}`}
      aria-label="A cinematic walkthrough of a featured property"
    >
      <div className="cin-backdrop" aria-hidden="true" />

      {/* The scrubbed Kling walkthrough clip fills the banner. */}
      {videoOn && (
        <video
          className="cin-video"
          src={CINEMATIC_VIDEO.src}
          poster={CINEMATIC_VIDEO.poster}
          preload="auto"
          autoPlay
          loop
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Scene frames — still layers, crossfaded by scroll. */}
      {CINEMATIC_SCENES.map((scene, i) => (
        <div key={scene.id} className="cin-scene" aria-hidden="true">
          <div
            className="cin-scene__bg"
            style={{ backgroundImage: `url("${scene.bg}")` }}
          />
          {scene.fg && (
            <div
              className="cin-scene__fg"
              style={{ backgroundImage: `url("${scene.fg}")` }}
            />
          )}
          <div className="cin-scene__shade" aria-hidden="true" />

          {/* Walkthrough captions (the hero frame hosts the real hero UI) */}
          {i > 0 && (
            <div className="cin-scene__copy">
              <span className="cin-copy__eyebrow">{scene.eyebrow}</span>
              <h3 className="cin-copy__title">{scene.title}</h3>
              <p className="cin-copy__body">{scene.body}</p>
            </div>
          )}
        </div>
      ))}

      {/* First frame = the marketplace hero (headline + search + pills). */}
      <HeroBand {...search} />

      {/* Scene index rail */}
      <div className="cin-rail" aria-hidden="true">
        {CINEMATIC_SCENES.map((scene) => (
          <div key={scene.id} className="cin-rail__item" />
        ))}
        <div className="cin-rail__idx" />
      </div>

      <StorylineSkip onSkip={handleSkip} />
    </section>
  );
}