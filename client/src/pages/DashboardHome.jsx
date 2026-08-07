import { useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import SellerDashboard from "./SellerDashboard";
import BuyerDashboard from "./BuyerDashboard";
import DealerDashboard from "./DealerDashboard";
import { ROLES } from "../components/dashboard/dashboardNav";

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
 * The underlying dashboard components and their data hooks are untouched.
 */
export default function DashboardHome() {
  const { role } = useParams();
  const { viewRole, setViewRole } = useOutletContext();

  const urlRole = role && ROLES.includes(role) ? role : null;

  /* When arriving via /dashboard/:role, adopt that role as the view. */
  useEffect(() => {
    if (urlRole && urlRole !== viewRole) {
      setViewRole(urlRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRole]);

  const active = urlRole || viewRole;
  const Body = BODY[active] || BuyerDashboard;

  return <Body />;
}
