import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute — wraps pages that require authentication and/or specific roles.
 *
 * Props:
 *   @param {React.ReactNode} children — the page component to render
 *   @param {string[]} [roles]       — allowed roles (e.g. ["seller","dealer"]).
 *                                      If omitted, any authenticated user is allowed.
 *   @param {string}   [redirectTo]  — where to send unauthorized users (default: "/login")
 *
 * Until `authReady` is true (AuthContext re-validated the stored JWT against the
 * DB via GET /auth/me), this renders a loader instead of the protected page —
 * so a deleted user hitting /dashboard directly never sees a flash of content
 * from their stale localStorage session.
 */
const ProtectedRoute = ({ children, roles, redirectTo = "/login" }) => {
  const { currentUser, isAuthenticated, authReady } = useAuth();

  /* Still validating the server-side session (or waiting for the first load).
     Render a minimal loader — never the protected page — during this window. */
  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-busy="true"
        aria-label="Checking your session"
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid rgba(0,0,0,0.12)",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "abnb-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes abnb-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* Not logged in → redirect to login */
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  /* Logged in but wrong role → redirect to their own dashboard or home */
  if (roles && roles.length > 0 && !roles.includes(currentUser?.role)) {
    const fallback =
      currentUser?.role === "admin"
        ? "/admin"
        : currentUser?.role
          ? `/dashboard/${currentUser.role}`
          : "/";
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;