import { motion, useReducedMotion } from "framer-motion";

/* ─── Big number buttons (1 2 3 4 5) for counted periods such as Yearly. ─── */

export default function CountPicker({ min, max, value, unit, onPick, label }) {
  const reduce = useReducedMotion();
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="dd-count" role="radiogroup" aria-label={label}>
      {options.map((n) => {
        const active = n === value;
        return (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            className={`dd-count__opt${active ? " dd-count__opt--active" : ""}`}
            onClick={() => onPick(n)}
            whileTap={reduce ? undefined : { scale: 0.94 }}
          >
            <span className="dd-count__num">{n}</span>
            <span className="dd-count__unit">{n === 1 ? unit : `${unit}s`}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
