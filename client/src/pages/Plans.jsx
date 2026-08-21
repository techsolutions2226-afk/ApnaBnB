import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiCheck,
  FiX,
  FiChevronDown,
  FiAward,
  FiCheckCircle,
  FiUploadCloud,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { subscriptionPlans, getPlanById } from "../config/subscriptions";
import {
  getEffectiveRole,
  roleRequiresPlan,
  getSubscription,
  activateSubscription,
} from "../utils/subscription";
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
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from"); // where to return after subscribing

  const [billing, setBilling] = useState("monthly"); /* monthly | yearly */
  const [openFaq, setOpenFaq] = useState(null);
  const [payModal, setPayModal] = useState(null); /* plan being paid for, or null */
  const [proofPreview, setProofPreview] = useState(null); /* screenshot preview URL */
  const [proofName, setProofName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [successPlan, setSuccessPlan] = useState(null);

  /* ── Who pays: sellers & dealers. Buyers are free. ── */
  const effectiveRole = getEffectiveRole(currentUser);
  const paysForPlan = isAuthenticated && roleRequiresPlan(effectiveRole);
  const mySub = isAuthenticated ? getSubscription(currentUser?.id) : null;
  const currentPlan = mySub?.planId ? getPlanById(mySub.planId) : null;

  /* ── Price formatting ── */
  const formatPrice = (amount) =>
    `PKR ${Number(amount).toLocaleString()}`;

  const getDisplayPrice = (plan) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  /* ── Handlers ── */
  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      toast.error("Please log in to subscribe to a plan");
      navigate("/login");
      return;
    }
    if (!paysForPlan) {
      toast.info("Buyers use the platform for free — no plan needed!");
      return;
    }
    if (currentPlan?.id === plan.id) return;
    setProofPreview(null);
    setProofName("");
    setQrError(false);
    setPayModal(plan);
  };

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image of your payment screenshot.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Screenshot must be 10 MB or smaller.");
      return;
    }
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(URL.createObjectURL(file));
    setProofName(file.name);
  };

  const closePayModal = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setPayModal(null);
    setProofPreview(null);
    setProofName("");
  };

  const handleSubmitPayment = () => {
    if (!payModal) return;
    if (!proofName) {
      toast.error("Upload your EasyPaisa payment screenshot first.");
      return;
    }
    setSubmitting(true);
    // Demo: mark the plan active locally (no payment gateway). A real backend
    // would store the screenshot for admin verification before activating.
    activateSubscription(currentUser.id, {
      planId: payModal.id,
      planName: payModal.name,
      slug: payModal.slug,
      billing,
      amount: getDisplayPrice(payModal),
      currency: payModal.currency,
      proofName,
      submittedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    const plan = payModal;
    closePayModal();
    toast.success(`${plan.name} plan activated — messaging unlocked!`);
    if (from) {
      navigate(decodeURIComponent(from), { replace: true });
    } else {
      setSuccessPlan(plan);
    }
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

      {/* ── "Unlock messaging" prompt (shown when bounced here from chat) ── */}
      {from && paysForPlan && !currentPlan && (
        <div className="plan-gate-note">
          <FiAward size={18} />
          <span>
            Choose a plan and complete payment to unlock messaging and the Deal Room.
          </span>
        </div>
      )}

      {/* ── Buyers don't pay ── */}
      {isAuthenticated && !paysForPlan && (
        <div className="plan-gate-note plan-gate-note--free">
          <FiCheckCircle size={18} />
          <span>You're a buyer — messaging is free, no plan needed.</span>
        </div>
      )}

      {/* ── Current Plan Banner (subscribed sellers / dealers) ── */}
      {paysForPlan && currentPlan && (
        <div className="plan-current">
          <div className="plan-current-icon">
            <FiAward size={24} />
          </div>
          <div className="plan-current-info">
            <p className="plan-current-title">
              Your current plan: {currentPlan.name}
            </p>
            <p className="plan-current-meta">
              {mySub?.billing === "yearly" ? "Yearly" : "Monthly"} billing
              {mySub?.submittedAt ? (
                <>
                  {" "}&middot; Activated{" "}
                  {new Date(mySub.submittedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              ) : null}
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
          paysForPlan ? (
            <Link to={`/dashboard/${effectiveRole}`} className="plan-bottom-cta-btn">
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

      {/* ── EasyPaisa Payment Modal ── */}
      <Modal
        isOpen={!!payModal}
        onClose={closePayModal}
        title="Pay with EasyPaisa"
      >
        {payModal && (
          <div className="plan-pay">
            <div className="plan-modal-details">
              <div className="plan-modal-row">
                <span className="plan-modal-label">Plan</span>
                <span className="plan-modal-value">{payModal.name}</span>
              </div>
              <div className="plan-modal-row">
                <span className="plan-modal-label">Billing cycle</span>
                <span className="plan-modal-value">
                  {billing === "yearly" ? "Yearly" : "Monthly"}
                </span>
              </div>
              <div className="plan-modal-divider" />
              <div className="plan-modal-row plan-modal-total">
                <span>Amount to pay</span>
                <span>{formatPrice(getDisplayPrice(payModal))}</span>
              </div>
            </div>

            <ol className="plan-pay-steps">
              <li>Scan the EasyPaisa QR below and pay the amount shown.</li>
              <li>Take a screenshot of your payment confirmation.</li>
              <li>Upload it here and press <strong>Submit</strong> to unlock messaging.</li>
            </ol>

            {/* EasyPaisa QR — drop your QR at client/public/easypaisa-qr.png */}
            <div className="plan-pay-qr">
              {qrError ? (
                <div className="plan-pay-qr-fallback">
                  Add your EasyPaisa QR image at
                  <code>client/public/easypaisa-qr.png</code>
                </div>
              ) : (
                <img
                  src="/easypaisa-qr.png"
                  alt="EasyPaisa payment QR code"
                  onError={() => setQrError(true)}
                />
              )}
            </div>

            {/* Screenshot upload */}
            <label className="plan-pay-upload">
              <input type="file" accept="image/*" onChange={handleProofChange} hidden />
              {proofPreview ? (
                <img className="plan-pay-proof" src={proofPreview} alt="Payment screenshot preview" />
              ) : (
                <span className="plan-pay-upload-cta">
                  <FiUploadCloud size={22} />
                  Upload payment screenshot
                </span>
              )}
            </label>
            {proofName && <p className="plan-pay-proof-name">{proofName}</p>}

            <div className="plan-modal-actions">
              <button
                className="plan-modal-confirm"
                onClick={handleSubmitPayment}
                disabled={submitting || !proofName}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
              <button className="plan-modal-cancel" onClick={closePayModal}>
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
            {paysForPlan ? (
              <button
                className="plan-success-btn"
                onClick={() => {
                  handleCloseSuccess();
                  navigate(`/dashboard/${effectiveRole}`);
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
