import { useState, useEffect, useCallback } from "react";
import userService from "../services/userService";

/* ─── useUserStats — live dashboard metrics from GET /users/me/stats.

   Returns one aggregate object the dashboards can drop straight into their
   stat cards (active listings, total views, inquiries, matches, unread
   messages) instead of recomputing them client-side from several fetches.
   ──────────────────────────────────────────────────────────────────── */

const EMPTY_STATS = {
  totalListings: 0,
  activeListings: 0,
  totalViews: 0,
  totalInquiries: 0,
  matches: 0,
  unreadMessages: 0,
};

export const useUserStats = (viewRole) => {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getStats(viewRole);
      setStats({
        totalListings: data.totalListings ?? 0,
        activeListings: data.activeListings ?? 0,
        totalViews: data.totalViews ?? 0,
        totalInquiries: data.totalInquiries ?? 0,
        matches: data.matches ?? 0,
        unreadMessages: data.unreadMessages ?? 0,
      });
    } catch (err) {
      setError(err.message || "Failed to fetch stats");
    } finally {
      setIsLoading(false);
    }
  }, [viewRole]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
};

export default useUserStats;
