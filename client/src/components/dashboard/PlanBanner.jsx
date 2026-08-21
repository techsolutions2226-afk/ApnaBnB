import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiCheckCircle, FiZap, FiGift } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getEffectiveRole } from "../../utils/subscription";
import paymentService from "../../services/paymentService";

/* ─── PlanBanner — current plan status on every role dashboard ───
   Fully role-agnostic: it derives the viewer's effective role, pulls that
   role's plans (admin-managed) and shows:
     • the active plan when their latest payment is approved
     • a one-click "Activate" offer when the role has a FREE plan (0/0)
     • an upgrade prompt otherwise
   Works for buyers too — no role names are ever printed.
   ─────────────────────────────────────────────────────────────── */
const PlanBanner = () => {
  const { currentUser, isAuthenticated, subscription, refreshSubscription } =
    useAuth();
  const effectiveRole = getEffectiveRole(currentUser);

  // The role's available plans — used to surface a free plan automatically.
  const [rolePlans, setRolePlans] = useState([]);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !effectiveRole) return;
    let cancelled = false;
    import("../../services/planService").then(({ default: planService }) => {
      planService
        .getPlans(effectiveRole)
        .then((data) => !cancelled && setRolePlans(Array.isArray(data) ? data : []))
        .catch(() => !cancelled && setRolePlans([]));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, effectiveRole]);

  const activateFreePlan = async (plan) => {
    setActivating(true);
    try {
      await paymentService.activateFree(plan.id);
      await refreshSubscription();
      toast.success(`${plan.name} plan activated — enjoy!`);
    } catch (err) {
      toast.error(err?.message || "Could not activate the free plan.");
    } finally {
      setActivating(false);
    }
  };

  if (!isAuthenticated || !subscription?.loaded) return null;

  /* ── Active plan ── */
  if (subscription.active && subscription.plan) {
    const { planName, billingCycle, amount, activatedAt } =
      subscription.plan;
    const isFree = billingCycle === "free" || Number(amount) === 0;
    return (
      <div className="dash-sub-plan dash-sub-plan--active">
        <span className="dash-sub-plan-text">
          <FiCheckCircle
            size={15}
            style={{ verticalAlign: "-2px", marginRight: 6 }}
          />
          <strong>{planName}</strong> plan active
          {isFree ? (
            " · Free"
          ) : (
            <>
              {" · "}
              {billingCycle === "yearly" ? "Yearly" : "Monthly"} billing
            </>
          )}
          {!isFree && activatedAt
            ? ` · since ${new Date(activatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : ""}
        </span>
        <Link to="/plans" className="dash-sub-none-link">
          Manage Plan
        </Link>
      </div>
    );
  }

  /* ── No active plan yet: offer this role's free plan if one exists ── */
  const freePlan = rolePlans.find(
    (p) => Number(p.monthlyPrice) === 0 && Number(p.yearlyPrice) === 0,
  );

  if (freePlan) {
    return (
      <div className="dash-sub-plan dash-sub-plan--free">
        <span className="dash-sub-plan-text">
          <FiGift size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          The <strong>{freePlan.name}</strong> plan is free for you —{" "}
          {(freePlan.features || []).slice(0, 2).map((f) => f.text).join(", ") ||
            "activate to unlock perks"}
        </span>
        <button
          className="dash-sub-none-link dash-sub-free-btn"
          onClick={() => activateFreePlan(freePlan)}
          disabled={activating}
        >
          {activating ? "Activating…" : "Activate Free"}
        </button>
      </div>
    );
  }

  /* ── Paid upsell ── */
  return (
    <div className="dash-sub-none">
      <span className="dash-sub-none-text">
        No active plan yet — unlock more with a subscription
      </span>
      <Link to="/plans" className="dash-sub-none-link">
        <FiZap size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
        View Plans
      </Link>
    </div>
  );
};

export default PlanBanner;
