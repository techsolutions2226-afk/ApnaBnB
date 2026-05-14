import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FiChevronLeft } from "react-icons/fi";
import "../styles/Account.css";

const defaultPrefs = {
  discounts: true,
  reviews: true,
  reminders: true,
  hostTips: false,
  inspiration: true,
  policy: true,
  emailMarketing: false,
  smsAlerts: true,
  pushBooking: true,
  pushMessages: true,
};

const sections = [
  {
    title: "Booking activity",
    items: [
      {
        key: "reminders",
        label: "Trip reminders",
        desc: "Get reminders about upcoming trips",
      },
      {
        key: "reviews",
        label: "Review reminders",
        desc: "Reminders to leave reviews after checkout",
      },
    ],
  },
  {
    title: "Promotions & tips",
    items: [
      {
        key: "discounts",
        label: "Promotions & discounts",
        desc: "Receive coupons, promotions, surveys, and product updates",
      },
      {
        key: "hostTips",
        label: "Hosting tips",
        desc: "Tips to improve your hosting experience",
      },
      {
        key: "inspiration",
        label: "Travel inspiration",
        desc: "Personalized destination recommendations",
      },
    ],
  },
  {
    title: "Account & policies",
    items: [
      {
        key: "policy",
        label: "Policy & community",
        desc: "Updates to platform policies and community standards",
      },
    ],
  },
  {
    title: "Delivery method",
    items: [
      {
        key: "emailMarketing",
        label: "Email notifications",
        desc: "Receive promotional emails",
      },
      {
        key: "smsAlerts",
        label: "SMS notifications",
        desc: "Receive booking confirmations via SMS",
      },
      {
        key: "pushBooking",
        label: "Push — bookings",
        desc: "Updates about your reservations",
      },
      {
        key: "pushMessages",
        label: "Push — messages",
        desc: "New messages from hosts or guests",
      },
    ],
  },
];

export default function Notifications() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem("airbnb_notifications");
      return stored ? JSON.parse(stored) : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  useEffect(() => {
    localStorage.setItem("airbnb_notifications", JSON.stringify(prefs));
  }, [prefs]);

  if (!currentUser) return null;

  const toggle = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    toast.success("Preference updated");
  };

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to="/account" className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Notifications</h1>
        <p className="ac-subtitle-text">
          Choose how and when you&apos;d like to be notified.
        </p>

        <div className="ac-notif-sections">
          {sections.map((section) => (
            <div key={section.title} className="ac-notif-section">
              <h2 className="ac-notif-section-title">{section.title}</h2>
              {section.items.map((item) => (
                <div key={item.key} className="ac-notif-row">
                  <div className="ac-notif-info">
                    <p className="ac-notif-label">{item.label}</p>
                    <p className="ac-notif-desc">{item.desc}</p>
                  </div>
                  <button
                    className={`ac-toggle ${prefs[item.key] ? "ac-toggle--on" : ""}`}
                    onClick={() => toggle(item.key)}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span className="ac-toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
