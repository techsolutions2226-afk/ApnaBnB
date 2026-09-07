import { motion, useReducedMotion } from "framer-motion";
import {
  FiHome,
  FiGrid,
  FiMap,
  FiBriefcase,
} from "react-icons/fi";
import SearchPanel from "./SearchPanel";

const EASE = [0.22, 1, 0.36, 1];

const CATEGORY_PILLS = [
  { label: "Villas", value: "house", icon: FiHome },
  { label: "Apartments", value: "flat", icon: FiGrid },
  { label: "Plots", value: "plot", icon: FiMap },
  { label: "Commercial", value: "commercial", icon: FiBriefcase },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/* ── HeroBand — the FIRST frame of the cinematic stage. It composes the
   marketplace hero exactly as it was before the walkthrough existed: title,
   supporting text, functional BUY/RENT + search, category pills and a scroll
   cue. GSAP fades the whole band away as the walkthrough begins. ── */
export default function HeroBand(props) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? { initial: false, animate: "show" }
    : { initial: "hidden", animate: "show" };

  return (
    <div className="cin-hero">
      <motion.div
        className="cin-hero__inner"
        variants={stagger}
        {...anim}
      >
        <motion.p className="cin-hero__eyebrow" variants={item}>
          ApnaBnB · Pakistan's trusted property marketplace
        </motion.p>
        <motion.h1 className="cin-hero__title" variants={item}>
          Discover Your Next <em>Chapter</em>
        </motion.h1>
        <motion.p className="cin-hero__subtitle" variants={item}>
          Find the property that fits your life — buy, rent or sell across
          Pakistan.
        </motion.p>

        <motion.div variants={item}>
          <SearchPanel {...props} variant="card" />
        </motion.div>

        <motion.div className="hero-pills" variants={item}>
          {CATEGORY_PILLS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                type="button"
                className="hero-pill"
                onClick={() => props.submitSearch({ propertyType: c.value })}
              >
                <Icon size={14} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div
        className="cin-scroll-cue"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 1.2 }}
        aria-hidden="true"
      >
        <span>Scroll to explore</span>
        <span className="cin-scroll-line" />
      </motion.div>
    </div>
  );
}