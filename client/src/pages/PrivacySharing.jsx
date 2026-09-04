import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useAccountPath from "../hooks/useAccountPath";
import {
  FiChevronLeft,
  FiDownload,
  FiTrash2,
  FiLink,
} from "react-icons/fi";
import "../styles/Account.css";

/* ─── Privacy & sharing — FRONTEND ONLY ───
   Visibility switches, connected services and the data-request actions.
   Toggles flip locally; nothing is saved and no request is sent.
*/

const VISIBILITY = [
  {
    key: "showProfile",
    label: "Show my profile in search",
    desc: "Let other users find your public profile from search results.",
    on: true,
  },
  {
    key: "showPhone",
    label: "Show my phone number",
    desc: "Display your number on your listings so buyers can call directly.",
    on: true,
  },
  {
    key: "showEmail",
    label: "Show my email address",
    desc: "Display your email on your public profile.",
    on: false,
  },
  {
    key: "showActivity",
    label: "Show my activity",
    desc: "Let others see when you were last active on the platform.",
    on: false,
  },
];

const SHARING = [
  {
    key: "personalisedAds",
    label: "Personalised recommendations",
    desc: "Use my browsing history to suggest properties I might like.",
    on: true,
  },
  {
    key: "analytics",
    label: "Analytics & performance",
    desc: "Help improve the platform by sharing anonymous usage data.",
    on: true,
  },
  {
    key: "thirdParty",
    label: "Third-party marketing",
    desc: "Allow trusted partners to contact me with relevant offers.",
    on: false,
  },
];

const SERVICES = [
  { id: "s1", name: "Google", detail: "Used to sign in", connected: true },
  { id: "s2", name: "Facebook", detail: "Not connected", connected: false },
];

export default function PrivacySharing() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { base } = useAccountPath();

  // Local-only mirrors; these do not persist anywhere yet.
  const [prefs, setPrefs] = useState(() =>
    [...VISIBILITY, ...SHARING].reduce((acc, item) => {
      acc[item.key] = item.on;
      return acc;
    }, {}),
  );

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const toggle = (key) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderRows = (items) =>
    items.map((item) => (
      <div key={item.key} className="ac-notif-row">
        <div className="ac-notif-info">
          <p className="ac-notif-label">{item.label}</p>
          <p className="ac-notif-desc">{item.desc}</p>
        </div>
        {/* TODO: persist this preference */}
        <button
          type="button"
          className={`ac-toggle ${prefs[item.key] ? "ac-toggle--on" : ""}`}
          onClick={() => toggle(item.key)}
          aria-label={`Toggle ${item.label}`}
          aria-pressed={!!prefs[item.key]}
        >
          <span className="ac-toggle-thumb" />
        </button>
      </div>
    ));

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to={base} className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Privacy &amp; sharing</h1>
        <p className="ac-subtitle-text">
          Control what others can see and how your data is used.
        </p>

        <div className="ac-preview-note">
          This section is a preview — these controls aren&apos;t connected yet.
        </div>

        <div className="ac-sec-body">
          <section className="ac-sec-block">
            <h2 className="ac-sec-heading">Profile visibility</h2>
            {renderRows(VISIBILITY)}
          </section>

          <section className="ac-sec-block">
            <h2 className="ac-sec-heading">Data sharing</h2>
            {renderRows(SHARING)}
          </section>

          <section className="ac-sec-block">
            <h2 className="ac-sec-heading">Connected services</h2>
            <ul className="ac-pay-list">
              {SERVICES.map((service) => (
                <li key={service.id} className="ac-pay-row">
                  <span className="ac-device-icon">
                    <FiLink size={18} />
                  </span>
                  <div className="ac-device-info">
                    <p className="ac-notif-label">
                      {service.name}
                      {service.connected && (
                        <span className="ac-chip ac-chip--ok ac-chip--inline">
                          Connected
                        </span>
                      )}
                    </p>
                    <p className="ac-notif-desc">{service.detail}</p>
                  </div>
                  {/* TODO: connect / disconnect the provider */}
                  <button type="button" className="ac-field-edit-btn" disabled>
                    {service.connected ? "Disconnect" : "Connect"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="ac-sec-block">
            <h2 className="ac-sec-heading">Your data</h2>

            <div className="ac-notif-row">
              <div className="ac-notif-info">
                <p className="ac-notif-label">Request a copy of my data</p>
                <p className="ac-notif-desc">
                  We&apos;ll email you an archive of everything stored on your account.
                </p>
              </div>
              {/* TODO: queue an export job */}
              <button type="button" className="ac-btn-outline" disabled>
                <FiDownload size={14} /> Request
              </button>
            </div>

            <div className="ac-danger-row">
              <div className="ac-notif-info">
                <p className="ac-notif-label">Delete my data</p>
                <p className="ac-notif-desc">
                  Permanently erase your account and everything attached to it.
                  This cannot be undone.
                </p>
              </div>
              {/* TODO: confirm dialog, then the erase request */}
              <button type="button" className="ac-btn-danger" disabled>
                <FiTrash2 size={14} /> Delete
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
