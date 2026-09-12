import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, memberRole, clampViewRole } from "../components/dashboard/dashboardNav";
import { readViewRole } from "../utils/viewRoleStore";

/**
 * useViewRole — the role the user is currently ACTING AS.
 *
 * Inside the dashboard shell the live source of truth is the shell's
 * "Viewing as" selector (passed via Outlet context, persisted to the user
 * record in the DB). Outside it, fall back to the DB-persisted viewRole,
 * then the local cache, then the account role.
 *
 * Hats are clamped to what the permanent account role allows:
 *   seller/buyer → seller | buyer
 *   dealer       → dealer only
 *
 * Returns { viewRole, realRole, setViewRole }:
 *   viewRole   — seller | buyer | dealer (never null for members)
 *   realRole   — the account role from signup
 *   setViewRole — the shell's switcher (undefined outside the shell)
 */
export const useViewRole = () => {
  const outlet = useOutletContext();
  const { currentUser } = useAuth();

  /* null for an admin. Admins are redirected out of the member shell before
     any page that uses this hook can mount (see DashboardShell), so the
     fallback is a backstop, not the normal path — but it must not silently
     turn an admin into a buyer the way it used to. */
  const realRole = memberRole(currentUser?.role) || "buyer";

  let viewRole = outlet?.viewRole;

  if (!ROLES.includes(viewRole)) {
    viewRole = ROLES.includes(currentUser?.viewRole)
      ? currentUser.viewRole
      : null;
  }

  if (!viewRole) {
    // Scoped to this user — a hat left by another account on this browser
    // must not leak across.
    const stored = readViewRole(currentUser?.id);
    if (ROLES.includes(stored)) viewRole = stored;
  }

  if (!viewRole) viewRole = realRole;

  viewRole = clampViewRole(realRole, viewRole) || realRole;

  return { viewRole, realRole, setViewRole: outlet?.setViewRole };
};

export default useViewRole;
