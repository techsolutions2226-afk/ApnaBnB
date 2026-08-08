import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "dash_view_role";
const ROLES = ["seller", "buyer", "dealer"];

/**
 * useViewRole — the role the user is currently ACTING AS.
 *
 * Inside the dashboard shell the live source of truth is the shell's
 * "Viewing as" selector (passed via Outlet context, persisted to the user
 * record in the DB). Outside it, fall back to the DB-persisted viewRole,
 * then the local cache, then the account role.
 *
 * Returns { viewRole, realRole, setViewRole }:
 *   viewRole   — seller | buyer | dealer (never null)
 *   realRole   — the account role from signup
 *   setViewRole — the shell's switcher (undefined outside the shell)
 */
export const useViewRole = () => {
  const outlet = useOutletContext();
  const { currentUser } = useAuth();

  const realRole = ROLES.includes(currentUser?.role)
    ? currentUser.role
    : "buyer";

  let viewRole = outlet?.viewRole;

  if (!ROLES.includes(viewRole)) {
    viewRole = ROLES.includes(currentUser?.viewRole)
      ? currentUser.viewRole
      : null;
  }

  if (!viewRole) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (ROLES.includes(stored)) viewRole = stored;
    } catch {
      /* ignore */
    }
  }

  if (!viewRole) viewRole = realRole;

  return { viewRole, realRole, setViewRole: outlet?.setViewRole };
};

export default useViewRole;
