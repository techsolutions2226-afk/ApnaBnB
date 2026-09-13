import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ─── Two-line dropdown trigger: small bold label over the value.
     Used by the Tenant search sections (Where / When / Who).
     `activeLayoutId` lets sibling sections share one highlight that glides
     between them as the open section changes. ─── */

const EASE = [0.22, 1, 0.36, 1];

const StackedTrigger = ({
  label,
  value = "",
  placeholder = "",
  open = false,
  onClick,
  activeLayoutId,
}) => {
  const reduce = useReducedMotion();
  const shown = value || placeholder;

  return (
    <button
      type="button"
      className="dd-trigger dd-stack"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      {open && activeLayoutId && (
        <motion.span
          layoutId={activeLayoutId}
          className="dd-stack__active"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }
          }
          aria-hidden="true"
        />
      )}
      <span className="dd-stack__label">{label}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={shown}
          className={`dd-stack__value${value ? "" : " dd-stack__value--empty"}`}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          {shown}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export default StackedTrigger;
