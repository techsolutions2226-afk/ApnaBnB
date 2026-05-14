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
 */
const ProtectedRoute = ({ children, roles, redirectTo = "/login" }) => {
  const { currentUser, isAuthenticated } = useAuth();

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
