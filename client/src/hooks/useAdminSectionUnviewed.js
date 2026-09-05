import { useState, useCallback, useEffect } from "react";
import adminService from "../services/adminService";
import { getSocket } from "../api/socket";

/* ─── useAdminSectionUnviewed ───
   Admin sidebar badges (Matches / Visits). The admin panel has no personal
   notification inbox, so each badge counts "newest unviewed items": rows that
   were created AFTER the admin last opened that section.

   The last-opened timestamp is kept per section in localStorage and sent to
   GET /api/admin/unviewed, which counts matches/trips created after it. On the
   very first run (no stored timestamp) the baseline is seeded to "now" so the
   badge starts empty instead of showing every historical row.

   Refreshes on mount, on window focus, and every 60s so it stays live.
──────────────────────────────────────────────────────────────────────── */

const KEYS = {
  visits: "ash_section_last_visits",
  matches: "ash_section_last_matches",
};

const readLast = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value || Number.isNaN(Number(value))) return null;
    return Number(value);
  } catch {
    return null;
  }
};

export const useAdminSectionUnviewed = () => {
  const [counts, setCounts] = useState({ visits: 0, matches: 0 });

  const fetchCounts = async () => {
    try {
      // Seed a first-use baseline so historical rows never flood the badge.
      const visitsBaseline = readLast(KEYS.visits) ?? Date.now();
      const matchesBaseline = readLast(KEYS.matches) ?? Date.now();
      localStorage.setItem(KEYS.visits, String(visitsBaseline));
      localStorage.setItem(KEYS.matches, String(matchesBaseline));

      const data = await adminService.getUnviewed({
        visitsSince: visitsBaseline,
        matchesSince: matchesBaseline,
      });
      setCounts({
        visits: data?.visits || 0,
        matches: data?.matches || 0,
      });
    } catch {
      setCounts({ visits: 0, matches: 0 });
    }
  };

  useEffect(() => {
    const first = setTimeout(fetchCounts, 0);
    const interval = setInterval(fetchCounts, 60000);
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchCounts();
    };

    /* Live badge updates: the backend pushes `admin:data-changed` whenever a
       new match or visit notification is written. Calling getSocket() here is
       what guarantees this admin actually has a socket to receive it — the
       admin panel itself renders no bell, so nothing else would connect. */
    let socket = null;
    try {
      socket = getSocket();
    } catch {
      socket = null; // polling + focus refresh still cover a missing socket
    }
    const onDataChanged = () => fetchCounts();
    if (socket) {
      socket.on("admin:data-changed", onDataChanged);
    }

    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      if (socket) socket.off("admin:data-changed", onDataChanged);
    };
  }, []);

  const markSeen = useCallback((section) => {
    const key = KEYS[section];
    if (!key) return;
    localStorage.setItem(key, String(Date.now()));
    setCounts((prev) => ({ ...prev, [section]: 0 }));
  }, []);

  return { counts, markSeen };
};

export default useAdminSectionUnviewed;