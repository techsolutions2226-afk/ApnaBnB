import { useState } from "react";

/* ─── useRefresh — drives a tab's Refresh button.
   Takes any number of refetch callbacks (from the page's existing data hooks),
   runs them together, and exposes a single in-flight flag so the button can
   spin and disable itself. Falsy entries are ignored, so callers can pass
   conditional refetches inline.

   Errors are swallowed on purpose: each hook already surfaces its own error
   state on the page, and one failing request must not leave the button stuck
   in the "Refreshing…" state.

   Usage:
     const { refresh, refreshing } = useRefresh(refetchListings, refetchMatches);
     <RefreshButton onRefresh={refresh} refreshing={refreshing} />
   ──────────────────────────────────────────────────────────────────── */
export const useRefresh = (...fns) => {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all(fns.filter(Boolean).map((fn) => fn()));
    } catch {
      /* per-hook error state already renders on the page */
    } finally {
      setRefreshing(false);
    }
  };

  return { refresh, refreshing };
};

export default useRefresh;
