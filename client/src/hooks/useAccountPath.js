import { useLocation } from "react-router-dom";

/* ─── useAccountPath — account pages are shared by two shells ───
   The same /account pages render for regular users (inside DashboardShell at
   /account) and for admins (inside AdminShell at /admin/account). Breadcrumb
   and card links must point back to whichever base the page is currently
   mounted under. This hook derives that base from the current path so the
   pages work unchanged in both places. */
export default function useAccountPath() {
  const { pathname } = useLocation();
  const base = pathname.startsWith("/admin/account")
    ? "/admin/account"
    : "/account";
  const cardPath = (slug) => (slug ? `${base}/${slug}` : base);
  return { base, cardPath };
}
