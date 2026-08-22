import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import authService from "../services/authService";
import userService from "../services/userService";
import paymentService from "../services/paymentService";
import { disconnectSocket } from "../api/socket";
import { getEffectiveRole, roleRequiresPlan } from "../utils/subscription";

/* How long the user can be idle before we log them out automatically.
   Default 30 minutes; override per-deploy with VITE_IDLE_LOGOUT_MINUTES. */
const IDLE_LOGOUT_MS =
  (Number(import.meta.env.VITE_IDLE_LOGOUT_MINUTES) || 30) * 60 * 1000;

const AuthContext = createContext(null);

const STORAGE_KEY = "current_user";

// Server user payload → the compact shape the app keeps in state/localStorage.
const normalizeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  viewRole: u.viewRole || null,
  avatar: u.avatar || "",
});

/* ── Role → default dashboard path mapping ── */
const ROLE_DASHBOARDS = {
  seller: "/dashboard/seller",
  buyer: "/dashboard/buyer",
  dealer: "/dashboard/dealer",
  admin: "/admin",
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* `authReady` flips to true only after the stored session has been re-validated
     against the server (GET /auth/me → fresh DB row). Until then, ProtectedRoute
     shows a loader instead of rendering the dashboard, so a deleted user's stale
     localStorage session can never briefly flash protected content. */
  const [authReady, setAuthReady] = useState(false);

  /* ── Server-driven subscription state ──
     The messaging/Deal-Room paywall reads THIS, not localStorage. The backend
     decides from the user's LATEST Payment row: approved = active, rejected/
     pending/none = locked — so an admin reject takes effect on the user's
     next app load or refreshSubscription() call. */
  const EMPTY_SUBSCRIPTION = Object.freeze({
    loading: false,
    loaded: false,
    requiresPlan: false,
    active: false,
    plan: null,
  });
  const [subscription, setSubscription] = useState(EMPTY_SUBSCRIPTION);

  const refreshSubscription = useCallback(async () => {
    // Optimistic local fallback while the request is in flight / if it fails:
    // role decides whether a plan is even needed.
    const needsPlan = roleRequiresPlan(getEffectiveRole(currentUser));
    setSubscription((prev) => ({ ...prev, loading: true }));
    try {
      const status = await paymentService.getStatus();
      setSubscription({
        loading: false,
        loaded: true,
        requiresPlan: !!status.requiresPlan,
        active: !!status.active,
        plan: status.subscription || null,
      });
    } catch {
      // Fail closed — a paywalled user stays locked until a successful check
      // (the whole messaging page needs the API anyway).
      setSubscription({
        loading: false,
        loaded: true,
        requiresPlan: needsPlan,
        active: !needsPlan,
        plan: null,
      });
    }
  }, [currentUser]);

  /* Persist user to localStorage on change */
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser]);

  /* ── Server-side session validation on mount ──
     A JWT proves someone logged in once; it does NOT prove the account still
     exists. Every app load (refresh, pasted protected URL, new tab) re-checks
     the token against the DB. If the account was deleted, suspended or its
     email unverified → wipe the local session and bounce to /login. */
  useEffect(() => {
    let cancelled = false;

    const complete = (user) => {
      if (cancelled) return;
      setCurrentUser(user);
      setAuthReady(true);
    };

    if (!localStorage.getItem("auth_token")) {
      // No token → any cached `current_user` is stale; drop it and we're done.
      complete(null);
      return;
    }

    authService
      .getMe()
      .then((user) => complete(user ? normalizeUser(user) : null))
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 401 || err?.status === 403) {
          // Account gone / suspended / unverified / expired token → dead session.
          authService.logout();
          setCurrentUser(null);
          setAuthReady(true);
          if (!window.location.pathname.startsWith("/login")) {
            window.location.assign("/login");
          }
        } else {
          // Network/host error — keep the cached session (state already holds
          // localStorage's user), but stop blocking on the check.
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Derived auth state ── */
  const isAuthenticated = !!currentUser;

  /* Fetch the subscription gate once the session has been validated, and
     re-check whenever the signed-in user changes (login / account switch). */
  useEffect(() => {
    if (authReady && currentUser) {
      refreshSubscription();
    } else if (!currentUser) {
      setSubscription(EMPTY_SUBSCRIPTION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser?.id]);

  /** Check if the current user has one of the given roles.
   *  @param  {...string} roles — e.g. hasRole("seller", "dealer")
   *  @return {boolean}
   */
  const hasRole = (...roles) => {
    if (!currentUser?.role) return false;
    return roles.includes(currentUser.role);
  };

  /** Get the default dashboard path for the current user's role. */
  const getDashboardPath = () => {
    if (!currentUser?.role) return "/";
    return ROLE_DASHBOARDS[currentUser.role] || "/";
  };

  /* ── Login with API ── */
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      const user = {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        viewRole: response.viewRole || null,
        avatar: response.avatar || "",
      };
      setCurrentUser(user);
      return user;
    } catch (err) {
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Signup with API ── */
  const signup = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      /* Validate that a role was provided */
      const role = userData.role;
      if (!role || !["buyer", "seller", "dealer"].includes(role)) {
        throw new Error("Please select a valid role");
      }

      const response = await authService.register({
        name: userData.name || userData.firstName + " " + userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role,
      });

      /* DO NOT auto-authenticate after signup */
      /* User must login after registering */
      return response;
    } catch (err) {
      const errorMessage = err.message || "Signup failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Continue with Google ──
     Handles both branches of POST /api/auth/google:
       • existing account → response has { token, ... } → auto-authenticate
       • new account      → { requiresRole: true } → call googleComplete(role)
     Returns the raw backend response so callers can branch on `requiresRole`. */
  const googleSignIn = async (idToken) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.googleLogin(idToken);
      if (response.token) {
        const user = {
          id: response.id,
          name: response.name,
          email: response.email,
          role: response.role,
          viewRole: response.viewRole || null,
          avatar: response.avatar || "",
        };
        setCurrentUser(user);
      }
      return response;
    } catch (err) {
      const errorMessage = err.message || "Google sign-in failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /* Complete account creation for a brand-new Google user after they pick
     a role. Mirrors `login` — stores the token and authenticates. */
  const googleComplete = async (idToken, role, details = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.googleComplete(idToken, role, details);
      const user = {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        viewRole: response.viewRole || null,
        avatar: response.avatar || "",
        phone: response.phone || "",
        location: response.location || "",
      };
      setCurrentUser(user);
      return user;
    } catch (err) {
      const errorMessage = err.message || "Google sign-in failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Logout ── */
  const logout = () => {
    authService.logout();
    disconnectSocket();
    setCurrentUser(null);
    setSubscription(EMPTY_SUBSCRIPTION);
    setError(null);
    toast.success("Logged out successfully");
  };

  /* ── Idle auto-logout ──
     While the user is signed in, watch for activity (mouse, keyboard, touch,
     scroll). If IDLE_LOGOUT_MS passes with no activity, log them out and
     show a toast so they know what happened. */
  useEffect(() => {
    if (!isAuthenticated) return;

    let timer;
    const triggerLogout = () => {
      authService.logout();
      setCurrentUser(null);
      setError(null);
      toast.info("You were logged out due to inactivity.");
    };
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(triggerLogout, IDLE_LOGOUT_MS);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];
    events.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );
    resetTimer(); // start the initial countdown

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated]);

  /* ── Update profile — persists all whitelisted fields via the API. ── */
  const updateProfile = async (updates) => {
    const apiFields = ['name', 'avatar', 'phone', 'location', 'emergencyContact', 'viewRole'];
    const apiUpdates = {};
    const localUpdates = { ...updates };
    for (const key of apiFields) {
      if (key in updates) {
        apiUpdates[key] = updates[key];
        delete localUpdates[key];
      }
    }

    if (Object.keys(apiUpdates).length > 0) {
      const updated = await userService.updateMe(apiUpdates);
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              ...localUpdates,
              name: updated.name,
              avatar: updated.avatar || "",
              phone: updated.phone || "",
              location: updated.location || "",
              emergencyContact: updated.emergencyContact || "",
              viewRole: updated.viewRole ?? prev.viewRole ?? null,
            }
          : null
      );
      // Mirror to localStorage so a refresh doesn't drop the values.
      const stored = localStorage.getItem('current_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            'current_user',
            JSON.stringify({
              ...parsed,
              ...localUpdates,
              name: updated.name,
              avatar: updated.avatar || "",
              phone: updated.phone || "",
              location: updated.location || "",
              emergencyContact: updated.emergencyContact || "",
              viewRole: updated.viewRole ?? parsed.viewRole ?? null,
            })
          );
        } catch {
          /* ignore parse errors */
        }
      }
      return;
    }

    // No API-backed fields → just merge locally.
    setCurrentUser((prev) => (prev ? { ...prev, ...localUpdates } : null));
  };

  /* Memoize the context value to prevent unnecessary re-renders */
  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      error,
      authReady,
      subscription,
      refreshSubscription,
      setCurrentUser,
      hasRole,
      getDashboardPath,
      login,
      signup,
      googleSignIn,
      googleComplete,
      logout,
      updateProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, isLoading, error, authReady, subscription],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
