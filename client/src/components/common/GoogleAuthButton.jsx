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
import Modal from "../ui/Modal";
import GoogleSignupDetails from "./GoogleSignupDetails";


const GoogleAuthButton = ({ className = "" }) => {
  const { googleSignIn, googleComplete, isLoading } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(null); // { idToken, profile }

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

  const completeSignup = async ({ role, phone, location, latitude, longitude }) => {
    if (!pendingRole) return;
    try {
      const user = await googleComplete(pendingRole.idToken, role, {
        phone,
        location,
        latitude,
        longitude,
      });
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
        className={`inline-flex items-center justify-center gap-2.5 h-11 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        onClick={handleClick}
        disabled={isLoading || busy}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Connecting to Google...
          </span>
        ) : (
          <>
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* New Google accounts finish here: role + phone + business address,
          since the Google token carries none of those. */}
      <Modal
        open={!!pendingRole}
        onClose={() => setPendingRole(null)}
        title="Finish setting up your account"
        size="lg"
      >
        <GoogleSignupDetails
          profile={pendingRole?.profile}
          submitting={isLoading}
          onSubmit={completeSignup}
        />
      </Modal>
    </>
  );
};

export default GoogleAuthButton;
