import { createContext, useContext, useState, useEffect, useMemo } from "react";
import authService from "../services/authService";
import userService from "../services/userService";

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

  /* ── Logout ── */
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setError(null);
  };

  /* ── Update profile (persists via API for whitelisted fields, falls back
        to local merge for client-only fields like phone/address) ── */
  const updateProfile = async (updates) => {
    const apiFields = ['name', 'avatar'];
    const apiUpdates = {};
    const localUpdates = { ...updates };
    for (const key of apiFields) {
      if (key in updates) {
        apiUpdates[key] = updates[key];
        delete localUpdates[key];
      }
    }

    if (Object.keys(apiUpdates).length > 0) {
      try {
        const updated = await userService.updateMe(apiUpdates);
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                ...localUpdates,
                name: updated.name,
                avatar: updated.avatar || "",
              }
            : null
        );
        return;
      } catch (err) {
        // Surface the error to the caller; don't silently fall back.
        throw err;
      }
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
