/* GoogleAuthButton — reusable "Continue with Google" button (popup flow).
 *
 * Used on Login and Signup. It opens Google's consent popup from the custom-
 * styled button, then routes the result through AuthContext:
 *   • existing account → authenticates + redirects to the dashboard
 *   • new account      → shows a role-picker modal (Buyer / Seller / Dealer),
 *                        finishes account creation, then redirects
 *
 * Props:
 *   className — extra classes (e.g. "login-social-btn" / "signup-social-btn")
 *               so the button matches the surrounding form's styling.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FcGoogle } from "react-icons/fc";
import { openGooglePopup } from "../../utils/googleAuth";
import { useAuth } from "../../context/AuthContext";
import Modal from "./Modal";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer", icon: "🏠", description: "I'm looking to buy or rent a property" },
  { value: "seller", label: "Seller", icon: "🔑", description: "I own properties and want to list them" },
  { value: "dealer", label: "Dealer / Agent", icon: "🤝", description: "I'm a real estate broker connecting buyers and sellers" },
];

const GoogleAuthButton = ({ className = "" }) => {
  const { googleSignIn, googleComplete, isLoading } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(null); // { idToken, profile }
  const [role, setRole] = useState("");

  const dashboardPathFor = (userRole) =>
    userRole === "admin" ? "/admin" : `/dashboard/${userRole}`;

  const handleClick = async () => {
    if (isLoading || busy) return;
    setBusy(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        toast.error("Google sign-in is not configured yet.");
        return;
      }

      const result = await openGooglePopup({
        clientId,
        onCredential: async (credential) => {
          if (!credential) return toast.error("Google sign-in was cancelled.");
          try {
            const res = await googleSignIn(credential);
            if (res?.requiresRole) {
              setPendingRole({ idToken: credential, profile: res.profile });
              setRole("");
            } else {
              toast.success("Login successful! Redirecting...");
              navigate(dashboardPathFor(res.role), { replace: true });
            }
          } catch (err) {
            toast.error(err.message || "Google sign-in failed. Please try again.");
          }
        },
      });

      if (!result.ok) toast.error(result.error);
    } finally {
      setBusy(false);
    }
  };

  const confirmRole = async () => {
    if (!pendingRole || !role) return;
    try {
      const user = await googleComplete(pendingRole.idToken, role);
      toast.success("Account created! Redirecting...");
      setPendingRole(null);
      navigate(dashboardPathFor(user.role), { replace: true });
    } catch (err) {
      toast.error(err.message || "Could not finish creating your account.");
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={isLoading || busy}
      >
        {busy ? (
          <span className="auth-google-loading">
            <span className="auth-google-spinner" />
            Connecting to Google...
          </span>
        ) : (
          <>
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Role picker for brand-new Google accounts */}
      <Modal
        isOpen={!!pendingRole}
        onClose={() => setPendingRole(null)}
        title="How will you use the platform?"
        size="small"
        footer={
          <button
            type="button"
            onClick={confirmRole}
            disabled={!role || isLoading}
            style={{
              width: "100%",
              padding: "12px 20px",
              border: "none",
              borderRadius: 8,
              background: "#134e2c",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: !role || isLoading ? "not-allowed" : "pointer",
              opacity: !role || isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? "Creating account..." : "Continue"}
          </button>
        }
      >
        {pendingRole?.profile && (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              color: "#555",
              lineHeight: 1.5,
            }}
          >
            Welcome to ApnaBnB, {pendingRole.profile.name}. Pick how you want to
            use the platform to finish setting up your account.
          </p>
        )}

        <div className="signup-role-grid">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`signup-role-card ${role === r.value ? "signup-role-card--active" : ""}`}
              onClick={() => setRole(r.value)}
            >
              <span className="signup-role-icon">{r.icon}</span>
              <span className="signup-role-label">{r.label}</span>
              <span className="signup-role-desc">{r.description}</span>
              {role === r.value && (
                <span className="signup-role-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default GoogleAuthButton;