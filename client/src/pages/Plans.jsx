import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiX,
  FiChevronDown,
  FiAward,
  FiCheckCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  subscriptionPlans,
  getSubscriptionByUserId,
  getPlanById,
} from "../config/subscriptions";
import Modal from "../components/common/Modal";
import Breadcrumb from "../components/common/Breadcrumb";
import "../styles/Plans.css";
import "../styles/Dashboard.css"; /* for breadcrumb classes */

/* ─── Plan short descriptions ─── */
const PLAN_DESCRIPTIONS = {
  basic: "Great for new dealers starting out with limited listings.",
  pro: "Best for growing dealers who need advanced tools and analytics.",
  premium:
    "For top-performing dealers who want unlimited access and priority.",
};

/* ─── Comparison table rows ─── */
const COMPARISON_ROWS = [
  { label: "Active listings", basic: "10", pro: "50", premium: "Unlimited" },
  {
    label: "Messages per day",
    basic: "5",
    pro: "50",
    premium: "Unlimited",
  },
  {
    label: "Requirements",
    basic: "3",
    pro: "15",
    premium: "Unlimited",
  },
  {
    label: "Matches per month",
    basic: "10",
    pro: "50",
    premium: "Unlimited",
  },
  {
    label: "Featured listings",
    basic: "0",
    pro: "3",
    premium: "10",
  },
  { label: "Co-brokering", basic: false, pro: true, premium: true },
  { label: "Analytics dashboard", basic: false, pro: true, premium: true },
  {
    label: "Search priority",
    basic: "Standard",
    pro: "Priority",
    premium: "Top priority",
  },
  { label: "Support", basic: "Standard", pro: "Priority", premium: "Dedicated" },
  { label: "API access", basic: false, pro: false, premium: true },
];

/* ─── FAQ data ─── */
const FAQ_ITEMS = [
  {
    q: "Who needs a subscription?",
    a: "Subscriptions are designed for dealers and agents. Sellers and buyers can use the platform for free. Dealers get enhanced tools, more listings, matchmaking, and co-brokering features through paid plans.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the new rate applies at your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "New dealers automatically start with the Basic plan features for a 14-day trial period. After the trial, you can choose a plan that fits your needs or continue with the free tier (limited to 3 listings).",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payment gateway integration is coming soon. Once live, we will support JazzCash, EasyPaisa, bank transfers, and credit/debit cards. For now, plans can be activated by contacting our support team.",
  },
  {
    q: "What happens if I cancel?",
    a: "If you cancel your subscription, you'll retain access to your current plan features until the end of your billing period. After that, your account will revert to the free tier with limited features.",
  },
  {
    q: "Do yearly plans get a discount?",
    a: "Yes! Yearly billing saves you approximately 2 months compared to paying monthly. The discount is applied automatically when you select yearly billing.",
  },
];

/* ─── Component ─── */
export default function Plans() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [billing, setBilling] = useState("monthly"); /* monthly | yearly */
  const [openFaq, setOpenFaq] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); /* plan object or null */
  const [successPlan, setSuccessPlan] = useState(null);

  /* ── Current subscription for logged-in dealers ── */
  const isDealer = isAuthenticated && currentUser?.role === "dealer";
  const activeSub = isDealer
    ? getSubscriptionByUserId(currentUser.id)
    : null;
  const currentPlan = activeSub ? getPlanById(activeSub.planId) : null;

  /* ── Price formatting ── */
  const formatPrice = (amount) =>
    `PKR ${Number(amount).toLocaleString()}`;

  const getDisplayPrice = (plan) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  const getPerLabel = (plan) =>
    billing === "yearly" ? "/year" : "/month";

  /* ── Handlers ── */
  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      toast.error("Please log in to subscribe to a plan");
      navigate("/login");
      return;
    }
    if (currentUser?.role !== "dealer") {
      toast.error("Subscriptions are for dealers only. Sellers and buyers use the platform for free!");
      return;
    }
    if (currentPlan?.id === plan.id) return;
    setConfirmModal(plan);
  };

  const handleConfirm = () => {
    if (!confirmModal) return;
    /* Mock subscription — no real payment */
    setSuccessPlan(confirmModal);
    setConfirmModal(null);
    toast.success(`Subscribed to ${confirmModal.name} plan!`);
  };

  const handleCloseSuccess = () => {
    setSuccessPlan(null);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="plan-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Subscription Plans" },
        ]}
      />

      {/* ── Current Plan Banner (dealers only) ── */}
      {isDealer && currentPlan && (
        <div className="plan-current">
          <div className="plan-current-icon">
            <FiAward size={24} />
          </div>
          <div className="plan-current-info">
            <p className="plan-current-title">
              Your current plan: {currentPlan.name}
            </p>
            <p className="plan-current-meta">
              {activeSub.billing === "yearly" ? "Yearly" : "Monthly"} billing
              &middot; Renews{" "}
              {new Date(activeSub.endDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span className="plan-current-status">
            <FiCheckCircle size={14} /> Active
          </span>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="plan-hero">
        <h1 className="plan-hero-title">
          Choose the right plan for your business
        </h1>
        <p className="plan-hero-subtitle">
          Unlock powerful tools to grow your real estate business. Upgrade
          anytime as your needs evolve.
        </p>

        {/* Billing toggle */}
        <div className="plan-toggle">
          <button
            className={`plan-toggle-btn${billing === "monthly" ? " plan-toggle-btn--active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`plan-toggle-btn${billing === "yearly" ? " plan-toggle-btn--active" : ""}`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span className="plan-toggle-save">Save ~17%</span>
          </button>
        </div>
      </div>

      {/* ── Pricing Cards ── */}
      <div className="plan-cards">
        {subscriptionPlans.map((plan) => {
          const isCurrent = currentPlan?.id === plan.id;
          const isPopular = plan.popular && !isCurrent;
          const price = getDisplayPrice(plan);

          return (
            <div
              key={plan.id}
              className={`plan-card${isPopular ? " plan-card--popular" : ""}${isCurrent ? " plan-card--current" : ""}`}
            >
              {isPopular && (
                <span className="plan-card-badge">Most popular</span>
              )}
              {isCurrent && (
                <span className="plan-card-current-badge">Current plan</span>
              )}

              <h3 className="plan-card-name">{plan.name}</h3>
              <p className="plan-card-desc">
                {PLAN_DESCRIPTIONS[plan.slug]}
              </p>

              <div className="plan-card-price">
                <span className="plan-card-currency">{plan.currency}</span>
                <span className="plan-card-amount">
                  {Number(
                    billing === "yearly"
                      ? Math.round(plan.yearlyPrice / 12)
                      : plan.monthlyPrice,
                  ).toLocaleString()}
                </span>
              </div>
              <p className="plan-card-period">/month</p>
              {billing === "yearly" && (
                <p className="plan-card-yearly-note">
                  Billed as {formatPrice(plan.yearlyPrice)} per year
                </p>
              )}

              <button
                className={`plan-card-cta${
                  isCurrent
                    ? " plan-card-cta--current"
                    : isPopular
                      ? " plan-card-cta--primary"
                      : " plan-card-cta--secondary"
                }`}
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent}
              >
                {isCurrent
                  ? "Current plan"
                  : currentPlan
                    ? plan.monthlyPrice > currentPlan.monthlyPrice
                      ? "Upgrade"
                      : "Downgrade"
                    : "Get started"}
              </button>

              <hr className="plan-card-divider" />

              <ul className="plan-card-features">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className={`plan-card-feature${!f.included ? " plan-card-feature--excluded" : ""}`}
                  >
                    <span
                      className={`plan-card-feature-icon ${f.included ? "plan-card-feature-icon--check" : "plan-card-feature-icon--x"}`}
                    >
                      {f.included ? (
                        <FiCheck size={16} />
                      ) : (
                        <FiX size={16} />
                      )}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Feature Comparison Table ── */}
      <div className="plan-comparison">
        <h2 className="plan-comparison-title">Compare plans in detail</h2>
        <table className="plan-comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Basic</th>
              <th>Pro</th>
              <th>Premium</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                {["basic", "pro", "premium"].map((tier) => (
                  <td key={tier}>
                    {typeof row[tier] === "boolean" ? (
                      row[tier] ? (
                        <FiCheck
                          size={18}
                          className="plan-comparison-check"
                        />
                      ) : (
                        <FiX size={18} className="plan-comparison-x" />
                      )
                    ) : (
                      <span className="plan-comparison-value">
                        {row[tier]}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FAQ ── */}
      <div className="plan-faq">
        <h2 className="plan-faq-title">Frequently asked questions</h2>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="plan-faq-item">
            <button
              className="plan-faq-question"
              onClick={() => toggleFaq(i)}
            >
              {item.q}
              <FiChevronDown
                size={20}
                className={`plan-faq-chevron${openFaq === i ? " plan-faq-chevron--open" : ""}`}
              />
            </button>
            {openFaq === i && <p className="plan-faq-answer">{item.a}</p>}
          </div>
        ))}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="plan-bottom-cta">
        <h3 className="plan-bottom-cta-title">
          Ready to grow your real estate business?
        </h3>
        <p className="plan-bottom-cta-desc">
          Join hundreds of dealers who use our platform to close more deals,
          find better matches, and grow their client base.
        </p>
        {isAuthenticated ? (
          isDealer ? (
            <Link to="/dashboard/dealer" className="plan-bottom-cta-btn">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/" className="plan-bottom-cta-btn">
              Explore Properties
            </Link>
          )
        ) : (
          <Link to="/signup" className="plan-bottom-cta-btn">
            Create a free account
          </Link>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="Confirm subscription"
      >
        {confirmModal && (
          <div>
            <p className="plan-modal-plan-name">{confirmModal.name} Plan</p>
            <p className="plan-modal-plan-price">
              {billing === "yearly" ? "Yearly" : "Monthly"} billing
            </p>

            <div className="plan-modal-details">
              <div className="plan-modal-row">
                <span className="plan-modal-label">Plan</span>
                <span className="plan-modal-value">{confirmModal.name}</span>
              </div>
              <div className="plan-modal-row">
                <span className="plan-modal-label">Billing cycle</span>
                <span className="plan-modal-value">
                  {billing === "yearly" ? "Yearly" : "Monthly"}
                </span>
              </div>
              <div className="plan-modal-divider" />
              <div className="plan-modal-row plan-modal-total">
                <span>Total</span>
                <span>{formatPrice(getDisplayPrice(confirmModal))}</span>
              </div>
            </div>

            <p className="plan-modal-note">
              <strong>Note:</strong> Payment gateway integration is coming soon.
              This will simulate plan activation for demonstration purposes.
            </p>

            <div className="plan-modal-actions">
              <button
                className="plan-modal-confirm"
                onClick={handleConfirm}
              >
                Confirm &amp; Activate
              </button>
              <button
                className="plan-modal-cancel"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Success Modal ── */}
      <Modal
        isOpen={!!successPlan}
        onClose={handleCloseSuccess}
        title="Subscription activated"
      >
        {successPlan && (
          <div className="plan-success">
            <div className="plan-success-icon">
              <FiCheckCircle size={28} />
            </div>
            <h3 className="plan-success-title">
              Welcome to {successPlan.name}!
            </h3>
            <p className="plan-success-desc">
              Your {successPlan.name} plan has been activated. You now have
              access to all{" "}
              {successPlan.slug === "premium"
                ? "premium"
                : successPlan.slug === "pro"
                  ? "advanced"
                  : "basic"}{" "}
              features. When the payment gateway is integrated, billing will
              be handled automatically.
            </p>
            {isDealer ? (
              <button
                className="plan-success-btn"
                onClick={() => {
                  handleCloseSuccess();
                  navigate("/dashboard/dealer");
                }}
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                className="plan-success-btn"
                onClick={handleCloseSuccess}
              >
                Done
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
