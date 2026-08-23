import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiChevronLeft,
  FiCreditCard,
  FiPlus,
  FiDownload,
  FiGift,
} from "react-icons/fi";
import "../styles/Account.css";

/* ─── Payments & payouts — FRONTEND ONLY ───
   Three tabs: cards on file, where money is paid out, and the transaction
   history. All rows are placeholder data and every button is inert — this is
   the shell the real billing integration drops into later.
*/

const TABS = [
  { key: "payments", label: "Payments" },
  { key: "payouts", label: "Payouts" },
  { key: "history", label: "Transaction history" },
];

const CARDS = [
  { id: "c1", brand: "Visa", last4: "4242", expiry: "08/2028", primary: true },
  { id: "c2", brand: "Mastercard", last4: "8891", expiry: "01/2027", primary: false },
];

const PAYOUTS = [
  { id: "p1", label: "Bank transfer", detail: "Meezan Bank ···· 5521", primary: true },
];

const HISTORY = [
  {
    id: "t1",
    date: "12 Aug 2026",
    desc: "Featured listing — Gulberg apartment",
    amount: "PKR 4,500",
    status: "Paid",
  },
  {
    id: "t2",
    date: "01 Aug 2026",
    desc: "Premium plan — monthly",
    amount: "PKR 2,000",
    status: "Paid",
  },
  {
    id: "t3",
    date: "18 Jul 2026",
    desc: "Featured listing — DHA Phase 5 house",
    amount: "PKR 4,500",
    status: "Refunded",
  },
];

export default function PaymentsPayouts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("payments");

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to="/account" className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Payments &amp; payouts</h1>
        <p className="ac-subtitle-text">
          Manage how you pay and how you get paid.
        </p>

        <div className="ac-preview-note">
          This section is a preview — these controls aren&apos;t connected yet.
        </div>

        {/* Tabs */}
        <div className="ac-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`ac-tab${tab === t.key ? " ac-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ac-sec-body">
          {/* ── Payments ── */}
          {tab === "payments" && (
            <>
              <section className="ac-sec-block">
                <div className="ac-sec-heading-row">
                  <h2 className="ac-sec-heading">Payment methods</h2>
                  {/* TODO: open the add-card flow */}
                  <button type="button" className="ac-btn-outline" disabled>
                    <FiPlus size={14} /> Add payment method
                  </button>
                </div>

                <ul className="ac-pay-list">
                  {CARDS.map((card) => (
                    <li key={card.id} className="ac-pay-row">
                      <span className="ac-device-icon">
                        <FiCreditCard size={18} />
                      </span>
                      <div className="ac-device-info">
                        <p className="ac-notif-label">
                          {card.brand} ···· {card.last4}
                          {card.primary && (
                            <span className="ac-chip ac-chip--ok ac-chip--inline">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="ac-notif-desc">Expires {card.expiry}</p>
                      </div>
                      {/* TODO: remove / set-default actions */}
                      <button type="button" className="ac-field-edit-btn" disabled>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ac-sec-block">
                <h2 className="ac-sec-heading">Coupons</h2>
                <div className="ac-coupon-row">
                  <span className="ac-device-icon">
                    <FiGift size={18} />
                  </span>
                  <div className="ac-device-info">
                    <p className="ac-notif-label">Add a coupon</p>
                    <p className="ac-notif-desc">
                      Enter a code to apply it to your next purchase.
                    </p>
                  </div>
                </div>
                <div className="ac-inline-form">
                  <input
                    type="text"
                    className="ac-field-input"
                    placeholder="Coupon code"
                    disabled
                  />
                  {/* TODO: validate and apply the code */}
                  <button type="button" className="ac-field-save-btn" disabled>
                    Apply
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ── Payouts ── */}
          {tab === "payouts" && (
            <section className="ac-sec-block">
              <div className="ac-sec-heading-row">
                <h2 className="ac-sec-heading">Where you get paid</h2>
                {/* TODO: open the add-payout flow */}
                <button type="button" className="ac-btn-outline" disabled>
                  <FiPlus size={14} /> Add payout method
                </button>
              </div>

              <ul className="ac-pay-list">
                {PAYOUTS.map((p) => (
                  <li key={p.id} className="ac-pay-row">
                    <span className="ac-device-icon">
                      <FiCreditCard size={18} />
                    </span>
                    <div className="ac-device-info">
                      <p className="ac-notif-label">
                        {p.label}
                        {p.primary && (
                          <span className="ac-chip ac-chip--ok ac-chip--inline">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="ac-notif-desc">{p.detail}</p>
                    </div>
                    <button type="button" className="ac-field-edit-btn" disabled>
                      Edit
                    </button>
                  </li>
                ))}
              </ul>

              <p className="ac-sec-hint ac-sec-hint--block">
                Payouts are released 24 hours after a deal is confirmed.
              </p>
            </section>
          )}

          {/* ── History ── */}
          {tab === "history" && (
            <section className="ac-sec-block">
              <div className="ac-sec-heading-row">
                <h2 className="ac-sec-heading">Transaction history</h2>
                {/* TODO: generate a CSV from real transactions */}
                <button type="button" className="ac-btn-outline" disabled>
                  <FiDownload size={14} /> Export CSV
                </button>
              </div>

              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORY.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>{row.desc}</td>
                        <td>{row.amount}</td>
                        <td>
                          <span
                            className={`ac-chip ${
                              row.status === "Refunded"
                                ? "ac-chip--muted"
                                : "ac-chip--ok"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
