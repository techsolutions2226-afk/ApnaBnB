import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import useAccountPath from "../hooks/useAccountPath";
import {
  FiUser,
  FiShield,
  FiCreditCard,
  FiBell,
  FiEye,
  FiSliders,
} from "react-icons/fi";
import "../styles/Account.css";

export default function Account() {
  const { t } = useTranslation("account");
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { cardPath } = useAccountPath();

  /* Copy lives in the `account` namespace under cards.<key>; icon and route
     stay here. */
  const cards = [
    { key: "personalInfo", icon: FiUser, to: cardPath("personal-info"), enabled: true },
    { key: "loginSecurity", icon: FiShield, to: cardPath("login-security"), enabled: true },
    { key: "payments", icon: FiCreditCard, to: cardPath("payments"), enabled: true },
    { key: "notifications", icon: FiBell, to: cardPath("notifications"), enabled: true },
    { key: "privacy", icon: FiEye, to: cardPath("privacy"), enabled: true },
    { key: "preferences", icon: FiSliders, to: cardPath("preferences"), enabled: true },
  ];

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleCardClick = (card) => {
    if (!card.enabled) {
      toast.info(t("common:actions.comingSoon"));
    }
  };

  return (
    <div className="ac-page">
      <div className="ac-container">
        {/* Header */}
        <div className="ac-header">
          <h1 className="ac-title">{t("title")}</h1>
          <p className="ac-subtitle">
            <span className="ac-user-name">
              {currentUser.firstName} {currentUser.lastName}
            </span>
             {currentUser.email} ·{" "}
            <Link to={`/users/${currentUser.id}`} className="ac-profile-link">
              Go to profile
            </Link>
          </p>
        </div>

        {/* Card Grid */}
        <div className="ac-card-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            if (card.enabled && card.to) {
              return (
                <Link to={card.to} key={card.key} className="ac-card">
                  <Icon className="ac-card-icon" />
                  <h3 className="ac-card-title">{t(`cards.${card.key}.title`)}</h3>
                  <p className="ac-card-desc">{t(`cards.${card.key}.desc`)}</p>
                </Link>
              );
            }
            return (
              <button
                key={card.key}
                className="ac-card ac-card--disabled"
                onClick={() => handleCardClick(card)}
              >
                <Icon className="ac-card-icon" />
                <h3 className="ac-card-title">{t(`cards.${card.key}.title`)}</h3>
                <p className="ac-card-desc">{t(`cards.${card.key}.desc`)}</p>
              </button>
            );
          })}
        </div>

        {/* Bottom Info */}
        <div className="ac-bottom">
          <div className="ac-bottom-icon">🛡️</div>
          <div>
            <p className="ac-bottom-title">
              Your account is protected by the platform
            </p>
            <p className="ac-bottom-desc">
              We use advanced security features to keep your account safe and
              your information private.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
