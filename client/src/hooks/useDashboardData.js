import { useMemo } from "react";
import { useConversations } from "./useMessages";
import { useWishlist } from "../context/WishlistContext";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";

/* ─── useDashboardData — aggregates real counts the dashboards show in stat
   cards. Pulls from existing contexts/hooks so every dashboard reflects live
   data (unread messages, saved properties, upcoming visits) instead of the
   hardcoded 0s we used before.

   Returns:
     unreadMessages — total unread across the user's conversations
     savedProperties— number of unique saved/wishlisted property ids
     upcomingTrips  — count of trips with status "upcoming"
     upcomingList   — the upcoming trip objects
   ──────────────────────────────────────────────────────────────────── */

export const useDashboardData = () => {
  const { isAuthenticated } = useAuth();
  const { conversations, refetch: refetchConversations } = useConversations();
  const { allSavedIds, refresh: refreshWishlist } = useWishlist();
  const { getUpcoming, refresh: refreshTrips } = useBooking();

  const unreadMessages = useMemo(() => {
    if (!isAuthenticated || !Array.isArray(conversations)) return 0;
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [isAuthenticated, conversations]);

  const savedProperties = useMemo(
    () => (isAuthenticated && Array.isArray(allSavedIds) ? allSavedIds.length : 0),
    [isAuthenticated, allSavedIds]
  );

  const upcomingList = useMemo(() => {
    if (!isAuthenticated) return [];
    return getUpcoming() || [];
  }, [isAuthenticated, getUpcoming]);

  const upcomingTrips = upcomingList.length;

  /* Re-pulls all three sources behind these counts, so a dashboard's Refresh
     button updates the stat cards as well as the lists. */
  const refetch = () =>
    Promise.all(
      [refetchConversations, refreshWishlist, refreshTrips]
        .filter(Boolean)
        .map((fn) => fn()),
    );

  return { unreadMessages, savedProperties, upcomingTrips, upcomingList, refetch };
};

export default useDashboardData;