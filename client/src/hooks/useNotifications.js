import { useCallback, useEffect, useRef, useState } from "react";
import notificationService from "../services/notificationService";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

/* ─── useNotifications ───
   Feeds the bell. Live over Socket.IO, with two safety nets so a dropped
   connection never leaves a stale badge:
     • refetch when the tab regains focus
     • refetch on socket reconnect
   Read state is server-side, so it is consistent across devices. */

const PAGE_SIZE = 15;

export const useNotifications = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sectionCounts, setSectionCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      setSectionCounts({});
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [list, count, byType] = await Promise.all([
        notificationService.list({ limit: PAGE_SIZE }),
        notificationService.unreadCount(),
        notificationService.unreadByType(),
      ]);
      if (!mounted.current) return;
      setItems(Array.isArray(list) ? list : list?.items || []);
      setUnreadCount(count);
      setSectionCounts(byType || {});
    } catch (err) {
      if (mounted.current) setError(err?.message || "Could not load notifications");
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
  }, [refetch, currentUser?.id]);

  /* Live delivery. The server pushes the whole row for a single notification
     and a bare nudge for batches, so handle both without assuming a payload. */
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const onNew = (payload) => {
      if (payload?.id) {
        setItems((prev) =>
          prev.some((n) => n.id === payload.id)
            ? prev
            : [payload, ...prev].slice(0, PAGE_SIZE),
        );
        setUnreadCount((c) => c + 1);
        const entityType = payload.entityType;
        if (entityType) {
          setSectionCounts((prev) => ({
            ...prev,
            [entityType]: (prev[entityType] || 0) + 1,
          }));
        }
      } else {
        refetch();
      }
    };

    socket.on("notification:new", onNew);
    socket.on("notification:refresh", refetch);
    socket.on("connect", refetch); // resync anything missed while disconnected

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:refresh", refetch);
      socket.off("connect", refetch);
    };
  }, [isAuthenticated, refetch]);

  /* Focus fallback — covers the case where the socket is down entirely. */
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refetch]);

  /* Mark the notifications the user actually saw. Optimistic: the badge should
     clear the instant the panel opens, not a round-trip later. */
  const markSeen = useCallback(async (ids) => {
    const unreadIds = (ids || []).filter(Boolean);
    if (!unreadIds.length) return;
    // Decrement the right section badges based on what was actually seen.
    const dec = {};
    items.forEach((n) => {
      if (unreadIds.includes(n.id) && n.entityType) {
        dec[n.entityType] = (dec[n.entityType] || 0) + 1;
      }
    });
    setItems((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - unreadIds.length));
    setSectionCounts((prev) => {
      const next = { ...prev };
      for (const [type, n] of Object.entries(dec)) {
        next[type] = Math.max(0, (next[type] || 0) - n);
      }
      return next;
    });
    try {
      await notificationService.markManyRead(unreadIds);
    } catch {
      refetch(); // put the truth back if the write failed
    }
  }, [items, refetch]);

  /* Clear one whole section's badge (all unread of an entityType) — used when
     the user opens the sidebar section it belongs to (e.g. the Visits tab). */
  const markSectionRead = useCallback(
    async (entityType) => {
      if (!entityType) return;
      const cleared = sectionCounts[entityType] || 0;
      if (cleared === 0) return;
      setItems((prev) =>
        prev.map((n) =>
          n.entityType === entityType ? { ...n, read: true } : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - cleared));
      setSectionCounts((prev) => ({ ...prev, [entityType]: 0 }));
      try {
        await notificationService.markTypeRead(entityType);
      } catch {
        refetch();
      }
    },
    [sectionCounts, refetch],
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setSectionCounts({});
    try {
      await notificationService.markAllRead();
    } catch {
      refetch();
    }
  }, [refetch]);

  return {
    items,
    unreadCount,
    sectionCounts,
    isLoading,
    error,
    refetch,
    markSeen,
    markSectionRead,
    markAllRead,
  };
};

export default useNotifications;
