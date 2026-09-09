import { useEffect } from "react";
import { Navigate, useParams, useOutletContext } from "react-router-dom";
import SellerDashboard from "./SellerDashboard";
import BuyerDashboard from "./BuyerDashboard";
import DealerDashboard from "./DealerDashboard";
import { ROLES, allowedViewRoles } from "../components/dashboard/dashboardNav";
import { useAuth } from "../context/AuthContext";

const BODY = {
  seller: SellerDashboard,
  buyer: BuyerDashboard,
  dealer: DealerDashboard,
};

/**
 * DashboardHome — renders the correct role dashboard BODY based on the current
 * view role. It keeps the shell's `viewRole` in sync with the URL:
 *   • /dashboard/:role  (e.g. login redirect lands here) → adopt that role
 *   • /dashboard        → use the currently-selected view role
 * URL roles outside the account's allowed hats are ignored.
 */
export default function DashboardHome() {
  const { role } = useParams();
  const { viewRole, setViewRole, realRole } = useOutletContext();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin";
  const accountRole = realRole || currentUser?.role;
  const allowed = allowedViewRoles(accountRole);
  const urlRole =
    role && ROLES.includes(role) && allowed.includes(role) ? role : null;

  /* When arriving via /dashboard/:role, adopt that role as the view. */
  useEffect(() => {
    if (isAdmin) return;
    if (urlRole && urlRole !== viewRole) {
      setViewRole(urlRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRole, isAdmin]);

  /* Admins have a dedicated panel; never show the seller/buyer/dealer body. */
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const active = urlRole || viewRole;
  const Body = BODY[active] || BuyerDashboard;

  return <Body />;
}
