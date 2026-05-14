import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import wishlistService from "../services/wishlistService";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

// Normalize a backend wishlist document to the shape the UI expects.
// `id` is the Mongo _id, `propertyIds` are stringified for comparison.
const normalize = (w) => ({
  id: w._id || w.id,
  name: w.name,
  isDefault: !!w.isDefault,
  propertyIds: (w.propertyIds || []).map((p) =>
    typeof p === "object" && p !== null ? String(p._id || p.id) : String(p)
  ),
});

export function WishlistProvider({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── Sync from server whenever auth changes ── */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setLists([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await wishlistService.getAll();
      setLists(data.map(normalize));
    } catch (err) {
      setError(err.message || "Failed to load wishlists");
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser?.id]);

  /* ── Derived helpers ── */
  const isWishlisted = useCallback(
    (propertyId) => {
      if (!propertyId) return false;
      const pid = String(propertyId);
      return lists.some((l) => l.propertyIds.includes(pid));
    },
    [lists]
  );

  const getListForProperty = useCallback(
    (propertyId) => {
      if (!propertyId) return null;
      const pid = String(propertyId);
      return lists.find((l) => l.propertyIds.includes(pid)) || null;
    },
    [lists]
  );

  const allSavedIds = useMemo(
    () => lists.flatMap((l) => l.propertyIds),
    [lists]
  );

  /* ── Mutations (optimistic UI, rollback on error) ── */

  // Pick the default list as the target when caller didn't specify one.
  const resolveTargetListId = (listId) => {
    if (listId) return listId;
    const def = lists.find((l) => l.isDefault) || lists[0];
    return def?.id || null;
  };

  const toggleWishlist = useCallback(
    async (propertyId, listId = null) => {
      if (!isAuthenticated) return;
      const pid = String(propertyId);
      const targetId = resolveTargetListId(listId);
      if (!targetId) return;

      const target = lists.find((l) => l.id === targetId);
      if (!target) return;
      const isCurrentlyIn = target.propertyIds.includes(pid);

      // Optimistic update
      setLists((prev) =>
        prev.map((l) =>
          l.id !== targetId
            ? l
            : {
                ...l,
                propertyIds: isCurrentlyIn
                  ? l.propertyIds.filter((x) => x !== pid)
                  : [...l.propertyIds, pid],
              }
        )
      );

      try {
        if (isCurrentlyIn) {
          await wishlistService.removeProperty(targetId, pid);
        } else {
          await wishlistService.addProperty(targetId, pid);
        }
      } catch (err) {
        // Roll back on error
        setError(err.message || "Failed to update wishlist");
        await refresh();
      }
    },
    [isAuthenticated, lists, refresh]
  );

  const removeFromAll = useCallback(
    async (propertyId) => {
      if (!isAuthenticated) return;
      const pid = String(propertyId);

      // Optimistic
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          propertyIds: l.propertyIds.filter((x) => x !== pid),
        }))
      );

      try {
        await wishlistService.removeFromAll(pid);
      } catch (err) {
        setError(err.message || "Failed to remove property");
        await refresh();
      }
    },
    [isAuthenticated, refresh]
  );

  const createList = useCallback(
    async (name) => {
      if (!isAuthenticated) throw new Error("Not authenticated");
      const created = await wishlistService.create(name);
      const normalized = normalize(created);
      setLists((prev) => [...prev, normalized]);
      return normalized;
    },
    [isAuthenticated]
  );

  const deleteList = useCallback(
    async (listId) => {
      if (!isAuthenticated) return;
      const target = lists.find((l) => l.id === listId);
      if (!target || target.isDefault) return;

      // Optimistic
      const snapshot = lists;
      setLists((prev) => prev.filter((l) => l.id !== listId));

      try {
        await wishlistService.delete(listId);
      } catch (err) {
        setError(err.message || "Failed to delete wishlist");
        setLists(snapshot);
      }
    },
    [isAuthenticated, lists]
  );

  const renameList = useCallback(
    async (listId, name) => {
      if (!isAuthenticated) return;
      const updated = await wishlistService.update(listId, name);
      const normalized = normalize(updated);
      setLists((prev) => prev.map((l) => (l.id === listId ? normalized : l)));
      return normalized;
    },
    [isAuthenticated]
  );

  const value = useMemo(
    () => ({
      lists,
      isLoading,
      error,
      refresh,
      isWishlisted,
      getListForProperty,
      toggleWishlist,
      removeFromAll,
      createList,
      deleteList,
      renameList,
      allSavedIds,
    }),
    [
      lists,
      isLoading,
      error,
      refresh,
      isWishlisted,
      getListForProperty,
      toggleWishlist,
      removeFromAll,
      createList,
      deleteList,
      renameList,
      allSavedIds,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

export default WishlistContext;
