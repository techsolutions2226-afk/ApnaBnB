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
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        notificationService.list({ limit: PAGE_SIZE }),
        notificationService.unreadCount(),
      ]);
      if (!mounted.current) return;
      setItems(Array.isArray(list) ? list : list?.items || []);
      setUnreadCount(count);
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
    setItems((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - unreadIds.length));
    try {
      await notificationService.markManyRead(unreadIds);
    } catch {
      refetch(); // put the truth back if the write failed
    }
  }, [refetch]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      refetch();
    }
  }, [refetch]);

  return { items, unreadCount, isLoading, error, refetch, markSeen, markAllRead };
};

export default useNotifications;
