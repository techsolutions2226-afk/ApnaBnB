import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import authService from "../services/authService";
import userService from "../services/userService";
import { disconnectSocket } from "../api/socket";

/* How long the user can be idle before we log them out automatically. */
const IDLE_LOGOUT_MS = 2 * 60 * 1000; // 2 minutes

const AuthContext = createContext(null);

const STORAGE_KEY = "current_user";

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

  /* Persist user to localStorage on change */
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser]);

  /* ── Derived auth state ── */
  const isAuthenticated = !!currentUser;

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
  const googleComplete = async (idToken, role) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.googleComplete(idToken, role);
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
    setError(null);
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
    [currentUser, isLoading, error],
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
