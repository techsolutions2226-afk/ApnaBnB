import { motion, useReducedMotion } from "framer-motion";

/**
 * StorylineSkip — "Skip intro" escape hatch. Users who want the cinematic
 * walkthrough simply keep scrolling; users who want a property jump straight
 * to the real marketplace search section (Lenis-smooth when active).
 */
export default function StorylineSkip({ onSkip }) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onSkip}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.3, ease: "easeOut" }}
      className="cin-skip"
      aria-label="Skip the cinematic intro and go to the property search"
    >
      Skip intro
    </motion.button>
  );
}