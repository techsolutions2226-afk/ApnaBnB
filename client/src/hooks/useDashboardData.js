import { useMemo } from "react";
import { useWishlist } from "../context/WishlistContext";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";

/* ─── useDashboardData — aggregates real counts the dashboards show in stat
   cards. Pulls from existing contexts/hooks so every dashboard reflects live
   data (saved properties, upcoming visits) instead of the hardcoded 0s we
   used before.

   Returns:
     savedProperties— number of unique saved/wishlisted property ids
     upcomingTrips  — count of trips with status "upcoming"
     upcomingList   — the upcoming trip objects
   ──────────────────────────────────────────────────────────────────── */

export const useDashboardData = () => {
  const { isAuthenticated } = useAuth();
  const { allSavedIds, refresh: refreshWishlist } = useWishlist();
  const { getUpcoming, refresh: refreshTrips } = useBooking();

  const savedProperties = useMemo(
    () => (isAuthenticated && Array.isArray(allSavedIds) ? allSavedIds.length : 0),
    [isAuthenticated, allSavedIds]
  );

  const upcomingList = useMemo(() => {
    if (!isAuthenticated) return [];
    return getUpcoming() || [];
  }, [isAuthenticated, getUpcoming]);

  const upcomingTrips = upcomingList.length;

  /* Re-pulls both sources behind these counts, so a dashboard's Refresh
     button updates the stat cards as well as the lists. */
  const refetch = () =>
    Promise.all(
      [refreshWishlist, refreshTrips]
        .filter(Boolean)
        .map((fn) => fn()),
    );

  return { savedProperties, upcomingTrips, upcomingList, refetch };
};

export default useDashboardData;