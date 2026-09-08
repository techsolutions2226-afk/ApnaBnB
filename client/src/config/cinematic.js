/* ====================================================
   cinematic.js — the banner walkthrough's single source of truth.

   The hero banner plays a scroll-driven "walk through the property"
   experience whose camera is driven entirely by this config — swap the
   imagery, copy or pacing here without touching any component that renders
   it.

   Each scene has up to two visual layers:
     • bg  (CSS background-image) — the full frame
     • fg  (CSS background-image) — optional foreground detail that
            parallaxes with the background (depth)

   VIDEO — if `video` is later added to this config, the engine scrubs that
   clip's `currentTime` to scroll progress instead of crossfading stills.

   IMAGE SOURCES — the walkthrough frames below use Unsplash architectural /
   interior photography (public images.unsplash.com URLs) as placeholder
   property footage. When the product gets its own footage, replace the URLs
   here — nothing else changes.

   VIDEO — when CINEMATIC_VIDEO is set, the banner renders that clip full-bleed
   behind the hero UI and the engine scrubs `currentTime` to scroll progress
   (the "camera" is the video). The still scenes then serve only as the poster
   fallback, so the page still works if the clip can't play.
   ==================================================== */

/* The Kling AI walkthrough clip provided for the banner (converted to a
   browser-safe H.264 MP4 with a moov atom up front for smooth scrubbing).
   Currently DISABLED — the banner runs the scroll-scrubbed still scene
   crossfade instead. Set to { src, poster } to re-enable the clip. */
export const CINEMATIC_VIDEO = null;

export const CINEMATIC_SCENES = [
  {
    id: "hero",
    eyebrow: "ApnaBnB",
    title: "Discover Your Next",
    accent: "Chapter",
    subtitle:
      "Find the property that fits your life — across Pakistan's most trusted platform.",
    bg: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "exterior",
    label: "The Exterior",
    eyebrow: "DHA Lahore",
    title: "A villa built for living",
    body: "Stone, timber and glass — set back on a quiet, tree-lined street.",
    bg: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "entrance",
    label: "The Entrance",
    eyebrow: "Arrival",
    title: "Welcome home",
    body: "A generous approach beneath a warm canopy of light.",
    bg: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "foyer",
    label: "The Foyer",
    eyebrow: "Inside",
    title: "Light, flowing space",
    body: "Double-height ceilings open the home from the first step.",
    bg: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "living",
    label: "Living Room",
    eyebrow: "The Heart",
    title: "A room that draws you in",
    body: "Soft daylight and clean lines made for everyday living.",
    bg: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "kitchen",
    label: "The Kitchen",
    eyebrow: "Crafted",
    title: "Cook, gather, stay",
    body: "Full-height cabinetry and stone islands, quietly considered.",
    bg: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "bedroom",
    label: "The Bedroom",
    eyebrow: "Rest",
    title: "Morning light, every day",
    body: "A calm suite with space to slow down.",
    bg: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
  {
    id: "balcony",
    label: "The Balcony",
    eyebrow: "The View",
    title: "The city, at arm's length",
    body: "Step out to a private terrace and the evening skyline.",
    bg: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=2000&q=80&auto=format&fit=crop",
    fg: null,
  },
];