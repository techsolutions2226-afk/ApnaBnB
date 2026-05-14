import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  FiUser,
  FiShield,
  FiCreditCard,
  FiBell,
  FiEye,
  FiSliders,
} from "react-icons/fi";
import "../styles/Account.css";

const cards = [
  {
    icon: FiUser,
    title: "Personal info",
    desc: "Provide personal details and how we can reach you",
    to: "/account/personal-info",
    enabled: true,
  },
  {
    icon: FiShield,
    title: "Login & security",
    desc: "Update your password and secure your account",
    to: null,
    enabled: false,
  },
  {
    icon: FiCreditCard,
    title: "Payments & payouts",
    desc: "Review payments, payouts, coupons, and gift cards",
    to: null,
    enabled: false,
  },
  {
    icon: FiBell,
    title: "Notifications",
    desc: "Choose notification preferences and how you want to be contacted",
    to: "/account/notifications",
    enabled: true,
  },
  {
    icon: FiEye,
    title: "Privacy & sharing",
    desc: "Manage your personal data, connected services, and data sharing settings",
    to: null,
    enabled: false,
  },
  {
    icon: FiSliders,
    title: "Global preferences",
    desc: "Set your default language, currency, and timezone",
    to: null,
    enabled: false,
  },
];

export default function Account() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleCardClick = (card) => {
    if (!card.enabled) {
      toast.info("Coming soon");
    }
  };

  return (
    <div className="ac-page">
      <div className="ac-container">
        {/* Header */}
        <div className="ac-header">
          <h1 className="ac-title">Account</h1>
          <p className="ac-subtitle">
            <span className="ac-user-name">
              {currentUser.firstName} {currentUser.lastName}
            </span>
            , {currentUser.email} ·{" "}
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
                <Link to={card.to} key={card.title} className="ac-card">
                  <Icon className="ac-card-icon" />
                  <h3 className="ac-card-title">{card.title}</h3>
                  <p className="ac-card-desc">{card.desc}</p>
                </Link>
              );
            }
            return (
              <button
                key={card.title}
                className="ac-card ac-card--disabled"
                onClick={() => handleCardClick(card)}
              >
                <Icon className="ac-card-icon" />
                <h3 className="ac-card-title">{card.title}</h3>
                <p className="ac-card-desc">{card.desc}</p>
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
