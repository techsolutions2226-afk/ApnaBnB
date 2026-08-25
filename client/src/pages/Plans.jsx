import { useState, useEffect } from "react";
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
import {
  getEffectiveRole,
  roleRequiresPlan,
} from "../utils/subscription";
import paymentService from "../services/paymentService";
import planService from "../services/planService";
import Modal from "../components/common/Modal";
import RefreshButton from "../components/common/RefreshButton";
import "../styles/Plans.css";

/* ─── Plan short descriptions ─── */
const PLAN_DESCRIPTIONS = {
  basic: "Try the dealer tools before you commit.",
  pro: "Work both sides of the market with full contact access.",
  premium: "For agencies running high listing volume.",
};

/* ─── Comparison table rows ─── */
const COMPARISON_ROWS = [
  { label: "Active listings", basic: "10", pro: "50", premium: "Unlimited" },
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
    a: "Browsing listings, posting requirements and listing a property are free on every role's starter tier. A paid plan is what unlocks the other party's phone and email, plus higher listing and requirement limits. Buyers, sellers and dealers each have their own tiers.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the new rate applies at your next billing cycle.",
  },
  {
    q: "What payment methods do you accept?",
    a: "For now we accept EasyPaisa — scan the QR code shown after you pick a plan, send the amount, and upload your payment screenshot. Your plan activates instantly. JazzCash, bank transfers, and cards are coming soon.",
  },
  {
    q: "Is there a free trial?",
    a: "New dealers automatically start with the Basic plan features for a trial period. After the trial, you can choose a plan that fits your needs or continue with the free tier (limited to 3 listings).",
  },
  {
    q: "What happens if I cancel?",
    a: "If you cancel your subscription, you'll retain access to your current plan features until the end of your billing period. After that, your account will revert to the free tier with limited features.",
  },
  {
    q: "Do yearly plans get a discount?",
    a: "Yes! Yearly billing saves you approximately 17% compared to paying monthly. The discount is applied automatically when you select yearly billing.",
  },
];

/* ─── Component ─── */
export default function Plans() {
  const { currentUser, isAuthenticated, subscription, refreshSubscription } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from"); // where to return after subscribing

  const [billing, setBilling] = useState("yearly"); /* monthly | yearly — default to yearly like reference */
  const [openFaq, setOpenFaq] = useState(null);
  const [payModal, setPayModal] = useState(null); /* plan being paid for, or null */
  const [proofFile, setProofFile] = useState(null); /* the actual File for upload */
  const [proofPreview, setProofPreview] = useState(null); /* screenshot preview URL */
  const [proofName, setProofName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [successPlan, setSuccessPlan] = useState(null);

  /* ── Dynamic plans (admin-managed, one tier set per role) ── */
  const ROLE_TABS = [
    { value: "dealer", label: "For Dealers" },
    { value: "seller", label: "For Sellers" },
    { value: "buyer", label: "For Buyers" },
  ];
  const effectiveRole = getEffectiveRole(currentUser);
  const paysForPlan = isAuthenticated && roleRequiresPlan(effectiveRole);
  const [roleTab, setRoleTab] = useState(
    ["seller", "buyer", "dealer"].includes(effectiveRole) ? effectiveRole : "dealer",
  );
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  // Bumped by the Refresh button to re-run the plans fetch below.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    planService
      .getPlans(roleTab)
      .then((data) => {
        if (!cancelled) setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load plans. Please refresh.");
          setPlans([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roleTab, reloadKey]);

  // Server-driven subscription state (AuthContext fetched /payments/status).
  const mySub = subscription?.plan || null;
  const currentPlanId = mySub?.planId || null;

  /* ── Price formatting ── */
  const formatPrice = (amount) =>
    `PKR ${Number(amount).toLocaleString()}`;

  const getDisplayPrice = (plan) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  /* A plan is FREE when the admin sets both prices to 0 — one-click
     activation, no QR / screenshot needed. */
  const isFreePlan = (p) =>
    Number(p.monthlyPrice) === 0 && Number(p.yearlyPrice) === 0;

  const activateFreePlan = async (plan) => {
    setSubmitting(true);
    try {
      await paymentService.activateFree(plan.id);
      await refreshSubscription();
      toast.success(`${plan.name} plan activated — enjoy!`);
      if (from) navigate(decodeURIComponent(from), { replace: true });
    } catch (err) {
      toast.error(err?.message || "Could not activate the free plan.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Handlers ── */
  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      toast.error("Please log in to subscribe to a plan");
      navigate("/login");
      return;
    }
    if (!paysForPlan) {
      // Admins are the only role without a tier of their own.
      toast.info("Your account type doesn't use subscription plans.");
      return;
    }
    /* You buy the tier for the role you are ACTING AS. A dealer viewing as a
       buyer buys the buyer tier; switching the dashboard hat switches which
       tier is purchasable. Enforced server-side too — rejectRoleMismatch in
       paymentController — since the plan id comes from the client. */
    if (plan.role !== effectiveRole) {
      toast.info(
        `You're acting as a ${effectiveRole}. Switch your role in the dashboard to subscribe to ${plan.role} plans.`,
      );
      return;
    }
    if (currentPlanId === plan.id) return;
    if (isFreePlan(plan)) return activateFreePlan(plan);
    setProofFile(null);
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
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setProofName(file.name);
  };

  const closePayModal = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setPayModal(null);
    setProofFile(null);
    setProofPreview(null);
    setProofName("");
  };

  const handleSubmitPayment = async () => {
    if (!payModal) return;
    if (!proofFile) {
      toast.error("Upload your EasyPaisa payment screenshot first.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("planId", payModal.id);
      formData.append("billingCycle", billing);
      formData.append("proof", proofFile);
      await paymentService.submit(formData);

      await refreshSubscription();

      const plan = payModal;
      closePayModal();
      toast.success(`${plan.name} plan activated — messaging unlocked!`);
      if (from) {
        navigate(decodeURIComponent(from), { replace: true });
      } else {
        setSuccessPlan(plan);
      }
    } catch (err) {
      toast.error(err?.message || "Payment submission failed. Please try again.");
    } finally {
      setSubmitting(false);
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
      {/* ── Unlock prompt (shown when bounced here from a gated feature) ── */}
      {from && !mySub && (
        <div className="plan-gate-note">
          <FiAward size={16} />
          <span>
            Choose a plan and complete payment to see owner contact details.
          </span>
        </div>
      )}

      {/* ── Current Plan Banner (subscribed sellers / dealers) ── */}
      {paysForPlan && mySub && (
        <div className="plan-current">
          <div className="plan-current-icon">
            <FiAward size={22} />
          </div>
          <div className="plan-current-info">
            <p className="plan-current-title">
              Your current plan: {mySub.planName}
            </p>
            <p className="plan-current-meta">
              {mySub?.billingCycle === "yearly" ? "Yearly" : "Monthly"} billing
              {mySub?.activatedAt ? (
                <>
                  {" "}&middot; Activated{" "}
                  {new Date(mySub.activatedAt).toLocaleDateString("en-US", {
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
        <div className="plan-hero-head">
          <h1 className="plan-hero-title">
            Choose the right plan for your business
          </h1>
          <RefreshButton
            onRefresh={() => setReloadKey((k) => k + 1)}
            refreshing={plansLoading}
          />
        </div>
        <p className="plan-hero-subtitle">
          Unlock powerful tools to grow your real estate business. Upgrade
          anytime as your needs evolve.
        </p>

        {/* ── Controls Bar: Role Tabs on Left, Billing Switch on Right ── */}
        <div className="plan-controls-bar">
          {/* Role tabs */}
          <div className="plan-role-tabs">
            {ROLE_TABS.map((tab) => {
              const isSelected = roleTab === tab.value;
              const isUser = roleRequiresPlan(tab.value) && isAuthenticated && effectiveRole === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  className={`plan-role-pill${isSelected ? " plan-role-pill--active" : ""}`}
                  onClick={() => setRoleTab(tab.value)}
                >
                  {tab.label}
                  {isUser ? " (you)" : ""}
                </button>
              );
            })}
          </div>

          {/* Billing Switch */}
          <div className="plan-billing-control">
            <span
              className={`plan-billing-label${billing === "monthly" ? " plan-billing-label--active" : ""}`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </span>
            <button
              type="button"
              className={`plan-switch${billing === "yearly" ? " plan-switch--on" : ""}`}
              onClick={() => setBilling(billing === "yearly" ? "monthly" : "yearly")}
              aria-label="Toggle yearly billing"
            >
              <span className="plan-switch-handle" />
            </button>
            <span
              className={`plan-billing-label${billing === "yearly" ? " plan-billing-label--active" : ""}`}
              onClick={() => setBilling("yearly")}
            >
              Yearly
            </span>
            <span className="plan-save-badge">SAVE ~17%</span>
          </div>
        </div>
      </div>

      {/* ── Pricing Cards (dynamic, admin-managed) ── */}
      <div className="plan-cards-container">
        {plansLoading ? (
          <div className="plan-loading-state">
            <div className="cm-spinner" style={{ margin: "0 auto 16px" }} />
            <p>Loading plans…</p>
          </div>
        ) : plans.length === 0 ? (
          <p className="plan-empty-note">
            No {roleTab} plans available yet — check back soon.
          </p>
        ) : (
          <div className="plan-cards-grid">
            {plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const isPopular = plan.popular && !isCurrent;
              const isFree = isFreePlan(plan);
              const monthlyEquivalent = billing === "yearly"
                ? Math.round(plan.yearlyPrice / 12)
                : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`plan-card-item${isPopular ? " plan-card-item--popular" : ""}${isCurrent ? " plan-card-item--current" : ""}`}
                >
                  {isPopular && (
                    <div className="plan-badge-popular">MOST POPULAR</div>
                  )}
                  {isCurrent && (
                    <div className="plan-badge-current">CURRENT PLAN</div>
                  )}

                  <div className="plan-card-top">
                    <h3 className="plan-card-tier-name">{plan.name}</h3>
                    <p className="plan-card-tier-desc">
                      {plan.description || PLAN_DESCRIPTIONS[plan.slug] || "Unlock platform tools."}
                    </p>

                    <div className="plan-price-wrapper">
                      {isFree ? (
                        <div className="plan-price-free">Free</div>
                      ) : (
                        <div className="plan-price-block">
                          <span className="plan-price-currency">{plan.currency || "PKR"}</span>
                          <span className="plan-price-digits">
                            {Number(monthlyEquivalent).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {!isFree && (
                        <div className="plan-price-frequency">/month</div>
                      )}
                    </div>

                    {!isFree && billing === "yearly" && (
                      <p className="plan-yearly-subtext">
                        Billed as {plan.currency || "PKR"} {Number(plan.yearlyPrice).toLocaleString()} per year
                      </p>
                    )}

                    <button
                      type="button"
                      className={`plan-action-btn${
                        isCurrent
                          ? " plan-action-btn--current"
                          : isPopular
                            ? " plan-action-btn--primary"
                            : " plan-action-btn--secondary"
                      }`}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                    >
                      {isCurrent
                        ? "Current plan"
                        : plan.role !== effectiveRole
                          ? `Switch to ${plan.role} to buy`
                          : isFree
                            ? submitting
                              ? "Activating…"
                              : "Activate Free"
                            : mySub
                              ? plan.monthlyPrice >
                                (mySub.billingCycle === "yearly"
                                  ? mySub.amount / 12
                                  : mySub.amount)
                                ? "Upgrade"
                                : "Downgrade"
                              : "Get started"}
                    </button>
                  </div>

                  <ul className="plan-features-list">
                    {(plan.features || []).map((f, i) => {
                      const isIncluded = f.included !== false;
                      const isHighlight =
                        f.text?.toLowerCase().includes("contact") ||
                        f.text?.toLowerCase().includes("dedicated");

                      return (
                        <li
                          key={i}
                          className={`plan-feature-row${!isIncluded ? " plan-feature-row--excluded" : ""}${isHighlight && isIncluded ? " plan-feature-row--bold" : ""}`}
                        >
                          <span className="plan-feature-icon-wrap">
                            {isIncluded ? (
                              <FiCheck size={15} className="plan-icon-check" />
                            ) : (
                              <FiX size={15} className="plan-icon-x" />
                            )}
                          </span>
                          <span className="plan-feature-text">{f.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feature Comparison Table (dealer legacy tiers only) ── */}
      {roleTab === "dealer" &&
        plans.some((p) => p.slug === "basic") &&
        plans.some((p) => p.slug === "pro") &&
        plans.some((p) => p.slug === "premium") && (
        <div className="plan-comparison-section">
          <h2 className="plan-section-title">Compare plans in detail</h2>
          <div className="plan-table-wrapper">
            <table className="plan-detail-table">
              <thead>
                <tr>
                  <th className="plan-th-feature">Feature</th>
                  <th>Basic</th>
                  <th>Pro</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td className="plan-td-feature">{row.label}</td>
                    {["basic", "pro", "premium"].map((tier) => (
                      <td key={tier} className="plan-td-val">
                        {typeof row[tier] === "boolean" ? (
                          row[tier] ? (
                            <FiCheck size={18} className="plan-table-check" />
                          ) : (
                            <FiX size={18} className="plan-table-x" />
                          )
                        ) : (
                          <span className="plan-table-text">{row[tier]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FAQ Section ── */}
      <div className="plan-faq-section">
        <h2 className="plan-section-title">Frequently asked questions</h2>
        <div className="plan-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="plan-faq-card">
              <button
                type="button"
                className="plan-faq-trigger"
                onClick={() => toggleFaq(i)}
              >
                <span>{item.q}</span>
                <FiChevronDown
                  size={18}
                  className={`plan-faq-arrow${openFaq === i ? " plan-faq-arrow--open" : ""}`}
                />
              </button>
              {openFaq === i && (
                <div className="plan-faq-content">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA Box ── */}
      <div className="plan-cta-box">
        <h3 className="plan-cta-title">
          Ready to grow your real estate business?
        </h3>
        <p className="plan-cta-desc">
          Join hundreds of dealers who use our platform to close more deals,
          find better matches, and grow their client base.
        </p>
        {isAuthenticated ? (
          paysForPlan ? (
            <Link to={`/dashboard/${effectiveRole}`} className="plan-cta-btn">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/" className="plan-cta-btn">
              Explore Properties
            </Link>
          )
        ) : (
          <Link to="/signup" className="plan-cta-btn">
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

            {/* EasyPaisa QR */}
            <div className="plan-pay-qr">
              {qrError ? (
                <div className="plan-pay-qr-fallback">
                  QR image missing — add it at
                  <code>client/public/easypaisa-qr.jpg</code>
                </div>
              ) : (
                <img
                  src="/easypaisa-qr.jpg"
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

