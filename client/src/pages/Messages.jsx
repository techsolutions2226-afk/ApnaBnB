/* /messages — WhatsApp-style 2-pane real-time chat.
 *
 * Powered by Socket.IO for live send/receive. Falls back to the REST
 * messageService.sendMessage if the socket is offline.
 *
 * Supports:
 *  - Conversation list with last-message preview, time, unread badge
 *  - Chat view with bubbles, date separators, auto-scroll
 *  - Image attachments via Cloudinary
 *  - Browser notifications + sound when a message arrives in a tab/conv
 *    the user isn't currently looking at
 *
 * Query params:
 *  ?with=<otherUserId>   → find-or-create a 1-1 conversation and open it.
 *                           Used by "Message" buttons throughout the app.
 *  ?conversation=<id>    → directly open an existing conversation by id.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiSearch, FiPaperclip, FiFileText, FiSend, FiArrowLeft, FiDownload, FiChevronDown, FiEdit2, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import messageService from "../services/messageService";
import matchService from "../services/matchService";
import uploadService from "../services/uploadService";
import DealRoomPanel from "../components/messages/DealRoomPanel";
import "../styles/Messages.css";

/* The id of the "other" party in a match (property owner vs requirement poster). */
const otherPartyOfMatch = (match, currentUserId) => {
  const ownerId = match?.property?.listedBy?._id || match?.property?.listedBy || null;
  const seekerId = match?.requirement?.requiredBy?._id || match?.requirement?.requiredBy || null;
  if (ownerId && ownerId !== currentUserId) return ownerId;
  if (seekerId && seekerId !== currentUserId) return seekerId;
  return null;
};

/* ── Date helpers ─────────────────────────────────────── */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const formatDay = (date) => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return new Date(date).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year:
      target < new Date(`${new Date().getFullYear()}-01-01`).getTime()
        ? "numeric"
        : undefined,
  });
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const formatRelativeShort = (date) => {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  if (startOfDay(new Date()) - startOfDay(date) < 7 * 86400000) {
    return new Date(date).toLocaleDateString(undefined, { weekday: "short" });
  }
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

/* ── Tiny ping using Web Audio API (no asset dependency) ── */
const playPing = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    /* audio is best-effort */
  }
};

/* ── Helpers ──────────────────────────────────────────── */
const getOtherParticipant = (conversation, currentUserId) =>
  conversation?.participants?.find((p) => (p._id || p) !== currentUserId) || null;

const conversationTitle = (conversation, currentUserId) => {
  const other = getOtherParticipant(conversation, currentUserId);
  return other?.name || "Unknown user";
};

const conversationInitial = (conversation, currentUserId) => {
  const t = conversationTitle(conversation, currentUserId);
  return (t || "?").charAt(0).toUpperCase();
};

const previewText = (lastMessage) => {
  if (!lastMessage) return "No messages yet";
  const atts = lastMessage.attachments || [];
  if (atts.length > 0) {
    const isFile = atts[0].type === "file";
    const icon = isFile ? "📎" : "📷";
    const label = isFile ? "Document" : "Photo";
    return lastMessage.content ? `${icon} ${lastMessage.content}` : `${icon} ${label}`;
  }
  return lastMessage.content || "";
};

/* ── Component ────────────────────────────────────────── */
const Messages = () => {
  const { currentUser } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dealMatch, setDealMatch] = useState(null);

  /* ── Edit / delete (WhatsApp-style) ── */
  const [menuForId, setMenuForId] = useState(null); // msg whose ⌄ menu is open
  const [editingMessage, setEditingMessage] = useState(null); // msg being edited
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  /* Pending delete dialog — { ids: [...], multiple: bool }. Delete is offered
     two ways: "for me" (client-side, hides locally) and "for everyone"
     (existing backend DELETE /messages/:id). */
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Multi-select ("select more") + "delete for me" ── */
  const [selectedIds, setSelectedIds] = useState([]);
  /* "Delete for me" is DB-backed now (Message.deletedForMe) — the server stops
     returning hidden messages, so no local persistence is needed. */

  /* ── Typing indicator + read receipts ── */
  const [otherTyping, setOtherTyping] = useState(false);

  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const menuRef = useRef(null);
  const conversationsRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeIdRef = useRef(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  /* ── Initial fetch + URL handling ──────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoadingConvs(true);

    const openFromUrl = async (list) => {
      const matchId = searchParams.get("match");
      const convId = searchParams.get("conversation");
      const withUser = searchParams.get("with");

      // Deal room — open the conversation linked to a match and show context.
      if (matchId) {
        try {
          const match = await matchService.getById(matchId);
          let dealConvId = match.conversationId;
          if (!dealConvId) {
            const otherId = otherPartyOfMatch(match, currentUser?.id);
            if (otherId) {
              const conv = await messageService.findOrCreateDirect(otherId);
              dealConvId = conv._id;
            }
          }
          const fresh = await messageService.getConversations();
          if (!cancelled) {
            setConversations(fresh);
            if (dealConvId) setActiveId(dealConvId);
            setDealMatch({ ...match, conversationId: dealConvId });
            searchParams.delete("match");
            setSearchParams(searchParams, { replace: true });
          }
        } catch (err) {
          toast.error(err?.message || "Could not open deal room");
        }
        return;
      }

      if (convId && list.find((c) => c._id === convId)) {
        setActiveId(convId);
        return;
      }

      if (withUser && withUser !== currentUser?.id) {
        try {
          const conv = await messageService.findOrCreateDirect(withUser);
          const fresh = await messageService.getConversations();
          if (!cancelled) {
            setConversations(fresh);
            setActiveId(conv._id);
            searchParams.delete("with");
            setSearchParams(searchParams, { replace: true });
          }
        } catch (err) {
          toast.error(err?.message || "Could not open conversation");
        }
      } else if (list.length > 0) {
        setActiveId(list[0]._id);
      }
    };

    messageService
      .getConversations()
      .then(async (list) => {
        if (cancelled) return;
        setConversations(list);
        await openFromUrl(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load conversations");
      })
      .finally(() => {
        if (!cancelled) setLoadingConvs(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  /* ── Load messages for active conversation ─────────── */
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    setOtherTyping(false);
    setMenuForId(null);
    setEditingMessage(null);
    setEditDraft("");
    setSelectedIds([]);
    setDeleteRequest(null);
    messageService
      .getMessages(activeId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setMessages(list);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeId ? { ...c, unreadCount: 0 } : c)),
        );

        /* Mark the other party's unread messages as read (read receipts). */
        const unreadIds = list
          .filter(
            (m) =>
              !m.read && (m.sender?._id || m.sender) !== currentUser?.id,
          )
          .map((m) => m._id);
        if (unreadIds.length > 0) {
          messageService
            .markMultipleAsRead(unreadIds)
            .then(() => {
              if (cancelled) return;
              setMessages((prev) =>
                prev.map((m) =>
                  unreadIds.includes(m._id) ? { ...m, read: true } : m,
                ),
              );
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        /* One silent retry — transient Supabase-pooler blips clear in a second;
           only surface a toast if the retry also fails. */
        setTimeout(async () => {
          if (cancelled) return;
          try {
            const retryData = await messageService.getMessages(activeId);
            if (cancelled) return;
            setMessages(Array.isArray(retryData) ? retryData : []);
          } catch {
            if (!cancelled) toast.error(err?.message || "Failed to load messages");
          }
        }, 1500);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  /* ── Socket event handlers ─────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 1500);
    };
    const onDisconnect = () => {
      setConnected(false);
      setShowBanner(true);
    };

    const onNewMessage = (msg) => {
      if (!msg || !msg.conversationId) return;
      const isActive = msg.conversationId === activeIdRef.current;

      if (isActive) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        /* A live message lands while we're watching — stop "typing…" and
           mark it read so the sender sees ✓✓ right away. */
        setOtherTyping(false);
        clearTimeout(typingClearRef.current);
        const fromMe =
          msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
        if (!fromMe && msg._id) {
          messageService.markAsRead(msg._id).catch(() => {});
        }
      }

      setConversations((prev) => {
        let touched = false;
        const next = prev.map((c) => {
          if (c._id !== msg.conversationId) return c;
          touched = true;
          const mine =
            msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
          return {
            ...c,
            lastMessage: msg,
            unreadCount: isActive || mine ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        if (!touched) {
          messageService
            .getConversations()
            .then((list) => setConversations(list))
            .catch(() => {});
        }
        return next.sort((a, b) => {
          const ta = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const tb = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return tb - ta;
        });
      });

      const fromOther =
        msg.sender?._id !== currentUser?.id && msg.sender !== currentUser?.id;
      const shouldNotify = fromOther && (!isActive || document.hidden);
      if (shouldNotify) {
        playPing();
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const n = new Notification(
              `New message from ${msg.sender?.name || "Someone"}`,
              {
                body:
                  msg.content?.slice(0, 120) ||
                  (msg.attachments?.length ? "📷 Photo" : ""),
                icon: "/favicon.ico",
                tag: msg.conversationId,
              },
            );
            n.onclick = () => {
              window.focus();
              setActiveId(msg.conversationId);
              n.close();
            };
          } catch {
            /* notifications best-effort */
          }
        }
      }
    };

    /* A message was edited (by us on another device, or by the other party). */
    const onMessageUpdated = (msg) => {
      if (!msg?._id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)),
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?._id === msg._id ? { ...c, lastMessage: msg } : c,
        ),
      );
    };

    /* A message was deleted — drop it, and refresh the sidebar preview if it
       was the conversation's last message. */
    const onMessageDeleted = ({ messageId, conversationId }) => {
      if (!messageId) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      const conv = conversationsRef.current.find((c) => c._id === conversationId);
      if (conv?.lastMessage?._id === messageId) {
        messageService
          .getConversations()
          .then((list) => setConversations(list))
          .catch(() => {});
      }
    };

    /* The other party is typing (server relays; we only show it for the
       conversation we're currently looking at). */
    const onTyping = ({ conversationId, userId: from, isTyping }) => {
      if (conversationId !== activeIdRef.current) return;
      if (from === currentUser?.id) return;
      setOtherTyping(!!isTyping);
      clearTimeout(typingClearRef.current);
      if (isTyping) {
        typingClearRef.current = setTimeout(() => setOtherTyping(false), 3000);
      }
    };

    /* The recipient read the message — flip our ✓ to ✓✓ live. */
    const onMessageRead = ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, read: true } : m)),
      );
    };

    /* "Delete for me" done on another device — drop it here too. */
    const onMessageHidden = ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("typing", onTyping);
    socket.on("message_read", onMessageRead);
    socket.on("message_hidden", onMessageHidden);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("typing", onTyping);
      socket.off("message_read", onMessageRead);
      socket.off("message_hidden", onMessageHidden);
      clearTimeout(typingClearRef.current);
    };
  }, [socket, currentUser?.id]);

  /* ── Join socket room for active conversation ─────── */
  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit("join_conversation", { conversationId: activeId });
    return () => {
      socket.emit("leave_conversation", { conversationId: activeId });
    };
  }, [socket, activeId]);

  /* ── Auto-scroll on new messages ───────────────────── */
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, activeId]);

  /* ── Request browser notification permission once ── */
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  /* ── Derived ───────────────────────────────────────── */
  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const name = conversationTitle(c, currentUser?.id).toLowerCase();
      const last = (c.lastMessage?.content || "").toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [conversations, search, currentUser?.id]);

  const activeConv = useMemo(
    () => conversations.find((c) => c._id === activeId) || null,
    [conversations, activeId],
  );

  /* Multi-select ("select more") is delete-for-me only, so every message can
     be ticked regardless of who sent it. */
  const allVisibleIds = useMemo(() => messages.map((m) => m._id), [messages]);

  const groupedStream = useMemo(() => {
    const out = [];
    let lastDayKey = null;
    messages.forEach((m) => {
      const dayKey = startOfDay(m.createdAt);
      if (dayKey !== lastDayKey) {
        out.push({ kind: "day", id: `day-${dayKey}`, day: m.createdAt });
        lastDayKey = dayKey;
      }
      out.push({ kind: "msg", id: m._id, msg: m });
    });
    return out;
  }, [messages]);

  /* ── Send handler ──────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!activeId) return;
    if (!trimmed && pendingAttachments.length === 0) return;

    const payload = {
      conversationId: activeId,
      content: trimmed,
      attachments: pendingAttachments,
    };

    setDraft("");
    setPendingAttachments([]);
    clearTimeout(typingTimeoutRef.current);
    if (socket?.connected) {
      socket.emit("typing", { conversationId: activeId, isTyping: false });
    }

    if (socket && socket.connected) {
      socket.emit("send_message", payload, (response) => {
        if (!response?.ok) {
          toast.error(response?.error || "Failed to send message");
          setDraft(trimmed);
          setPendingAttachments(payload.attachments);
        }
      });
    } else {
      try {
        const message = await messageService.sendMessage(
          activeId,
          trimmed,
          pendingAttachments,
        );
        setMessages((prev) => [...prev, message]);
      } catch (err) {
        toast.error(err?.message || "Failed to send message");
        setDraft(trimmed);
        setPendingAttachments(payload.attachments);
      }
    }
  }, [activeId, draft, pendingAttachments, socket]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* Draft changes → let the other side know we're typing (throttled stop
     signal after 1.5s of silence). */
  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (socket?.connected && activeId) {
      socket.emit("typing", { conversationId: activeId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socket?.connected && activeIdRef.current) {
          socket.emit("typing", {
            conversationId: activeIdRef.current,
            isTyping: false,
          });
        }
      }, 1500);
    }
  };

  /* ── Close chat (back arrow / Escape) ──────────────── */
  const closeChat = useCallback(() => {
    setActiveId(null);
    setMenuForId(null);
    setEditingMessage(null);
    setEditDraft("");
    setSelectedIds([]);
  }, []);

  /* Escape key: cancel edit → close delete dialog → exit select mode → close
     menu → close chat. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (editingMessage) {
        setEditingMessage(null);
        setEditDraft("");
        return;
      }
      if (deleteRequest) {
        setDeleteRequest(null);
        return;
      }
      if (selectedIds.length > 0) {
        setSelectedIds([]);
        return;
      }
      if (menuForId) {
        setMenuForId(null);
        return;
      }
      if (activeId) closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingMessage, deleteRequest, selectedIds, menuForId, activeId, closeChat]);

  /* Close the ⌄ message menu when clicking anywhere outside it. */
  useEffect(() => {
    if (!menuForId) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuForId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuForId]);

  /* ── Edit message flow ─────────────────────────────── */
  const startEdit = (m) => {
    setEditingMessage(m);
    setEditDraft(m.content || "");
    setMenuForId(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditDraft("");
  };

  const handleEditSave = useCallback(async () => {
    const trimmed = editDraft.trim();
    if (!editingMessage || !trimmed || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await messageService.updateMessage(
        editingMessage._id,
        trimmed,
      );
      setMessages((prev) =>
        prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m)),
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?._id === updated._id
            ? { ...c, lastMessage: { ...c.lastMessage, ...updated } }
            : c,
        ),
      );
      cancelEdit();
    } catch (err) {
      toast.error(err?.message || "Failed to edit message");
    } finally {
      setSavingEdit(false);
    }
  }, [editingMessage, editDraft, savingEdit]);

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
  };

  /* ── Multi-select ("select more") ──────────────────── */
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /* "Select all" ticks every visible message — select mode deletes for me
     only, which works on any message. */
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const all = allVisibleIds;
      if (all.length === 0) return prev;
      const hasAll = all.every((id) => prev.includes(id));
      return hasAll
        ? prev.filter((id) => !all.includes(id))
        : [...new Set([...prev, ...all])];
    });
  };

  /* ── "Delete for me" — DB-backed (Message.deletedForMe). The server stops
     returning these messages for THIS user (all devices), while everyone
     else still sees them. ── */
  const handleDeleteForMe = useCallback(async () => {
    const ids = deleteRequest?.ids || [];
    if (!ids.length || deleting) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => messageService.hideMessage(id)));
      setMessages((prev) => prev.filter((m) => !ids.includes(m._id)));
      setDeleteRequest(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      toast.error(err?.message || "Failed to hide messages");
    } finally {
      setDeleting(false);
    }
  }, [deleteRequest, deleting]);

  /* ── "Delete for everyone" — existing backend DELETE /messages/:id. Only
     works on your own messages (the server returns 403 otherwise). ── */
  const handleDeleteEveryone = useCallback(async () => {
    const ids = deleteRequest?.ids || [];
    if (!ids.length || deleting) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => messageService.deleteMessage(id)));
      setMessages((prev) => prev.filter((m) => !ids.includes(m._id)));
      const conv = conversationsRef.current.find(
        (c) => c._id === activeIdRef.current,
      );
      if (conv?.lastMessage && ids.includes(conv.lastMessage._id)) {
        messageService
          .getConversations()
          .then((list) => setConversations(list))
          .catch(() => {});
      }
      setDeleteRequest(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      toast.error(err?.message || "Failed to delete messages");
    } finally {
      setDeleting(false);
    }
  }, [deleteRequest, deleting]);

  /* ── Attach image flow ─────────────────────────────── */
  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only images are supported for now");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadService.uploadSingle(file);
      const url = result?.image?.url || result?.url || result?.secure_url;
      if (!url) throw new Error("Upload succeeded but no URL returned");
      setPendingAttachments((prev) => [
        ...prev,
        { url, type: "image", name: file.name, size: file.size },
      ]);
    } catch (err) {
      toast.error(err?.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ── Attach document flow (PDF / Word / Excel / text) ── */
  const handlePickDoc = () => docInputRef.current?.click();

  const handleDocChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document must be 10 MB or smaller");
      if (docInputRef.current) docInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const result = await uploadService.uploadDocument(file);
      const url = result?.document?.url || result?.url;
      if (!url) throw new Error("Upload succeeded but no URL returned");
      setPendingAttachments((prev) => [
        ...prev,
        { url, type: "file", name: file.name, size: file.size },
      ]);
    } catch (err) {
      toast.error(err?.message || "Document upload failed");
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className={`msg-shell ${activeId ? "msg-shell--has-active" : ""}`}>
      {/* ── Left: conversation sidebar ─── */}
      <aside className="msg-sidebar">
        <div className="msg-sidebar-header">
          <h1 className="msg-sidebar-title">Messages</h1>
          <p className="msg-sidebar-sub">
            {conversations.length} conversation
            {conversations.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="msg-sidebar-search">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="msg-conv-list">
          {loadingConvs ? (
            <div className="msg-conv-empty">Loading…</div>
          ) : filteredConvs.length === 0 ? (
            <div className="msg-conv-empty">
              No conversations yet. Open a match and click{" "}
              <strong>Message</strong> to start one.
            </div>
          ) : (
            filteredConvs.map((c) => {
              const other = getOtherParticipant(c, currentUser?.id);
              const isActive = c._id === activeId;
              const unread = c.unreadCount || 0;
              return (
                <button
                  key={c._id}
                  className={`msg-conv-item ${
                    isActive ? "msg-conv-item--active" : ""
                  }`}
                  onClick={() => setActiveId(c._id)}
                >
                  {other?.avatar ? (
                    <img
                      src={other.avatar}
                      alt={other.name}
                      className="msg-conv-avatar"
                    />
                  ) : (
                    <span className="msg-conv-avatar">
                      {conversationInitial(c, currentUser?.id)}
                    </span>
                  )}
                  <div className="msg-conv-meta">
                    <div className="msg-conv-top">
                      <span className="msg-conv-name">
                        {conversationTitle(c, currentUser?.id)}
                      </span>
                      <span className="msg-conv-time">
                        {c.lastMessage?.createdAt
                          ? formatRelativeShort(c.lastMessage.createdAt)
                          : ""}
                      </span>
                    </div>
                    <div className="msg-conv-bottom">
                      <span
                        className={`msg-conv-preview ${
                          unread > 0 ? "msg-conv-preview--unread" : ""
                        }`}
                      >
                        {previewText(c.lastMessage)}
                      </span>
                      {unread > 0 && (
                        <span className="msg-conv-badge">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right: chat pane ─── */}
      <section className="msg-chat">
        {showBanner && (
          <div
            className={`msg-conn-banner ${
              connected ? "msg-conn-banner--ok" : ""
            }`}
          >
            {connected ? "Connected" : "Reconnecting…"}
          </div>
        )}

        {!activeConv ? (
          <div className="msg-no-chat">
            <div className="msg-no-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>
              Pick someone from the list on the left, or start a new chat by
              opening a match and clicking <strong>Message</strong>.
            </p>
          </div>
        ) : (
          <>
            {selectedIds.length > 0 ? (
              <header className="msg-select-bar">
                <button
                  type="button"
                  className="msg-select-close"
                  onClick={() => setSelectedIds([])}
                  aria-label="Exit selection"
                  title="Exit selection (Esc)"
                >
                  <FiX size={20} />
                </button>
                <span className="msg-select-count">
                  {selectedIds.length} selected
                </span>
                <div className="msg-select-actions">
                  <button
                    type="button"
                    className="msg-select-btn"
                    onClick={toggleSelectAll}
                  >
                    <FiCheck size={15} />
                    {allVisibleIds.length > 0 &&
                    allVisibleIds.every((id) => selectedIds.includes(id))
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <button
                    type="button"
                    className="msg-select-btn msg-select-btn--danger"
                    onClick={() =>
                      setDeleteRequest({
                        ids: [...selectedIds],
                        multiple: selectedIds.length > 1,
                        onlyMe: true,
                      })
                    }
                  >
                    <FiTrash2 size={15} />
                    Delete
                  </button>
                </div>
              </header>
            ) : (
            <header className="msg-chat-header">
              <button
                className="msg-chat-back"
                onClick={closeChat}
                aria-label="Back to conversations"
                title="Back"
              >
                <FiArrowLeft size={20} />
              </button>
              {(() => {
                const other = getOtherParticipant(activeConv, currentUser?.id);
                return other?.avatar ? (
                  <img
                    src={other.avatar}
                    alt={other.name}
                    className="msg-conv-avatar"
                  />
                ) : (
                  <span className="msg-conv-avatar">
                    {conversationInitial(activeConv, currentUser?.id)}
                  </span>
                );
              })()}
              <div className="msg-chat-header-meta">
                <div className="msg-chat-header-name">
                  {conversationTitle(activeConv, currentUser?.id)}
                </div>
                <div className="msg-chat-header-role">
                  {otherTyping
                    ? <span className="msg-typing-hint">typing…</span>
                    : getOtherParticipant(activeConv, currentUser?.id)?.role || ""}
                </div>
              </div>
            </header>
            )}

            {dealMatch && dealMatch.conversationId === activeId && (
              <DealRoomPanel
                match={dealMatch}
                currentUser={currentUser}
                onMatchChange={(patch) =>
                  setDealMatch((prev) => (prev ? { ...prev, ...patch } : prev))
                }
              />
            )}

            <div className="msg-chat-stream" ref={streamRef}>
              {loadingMessages ? (
                <div style={{ textAlign: "center", color: "#555" }}>
                  Loading messages…
                </div>
              ) : groupedStream.length === 0 ? (
                <div
                  style={{ textAlign: "center", color: "#555", marginTop: 60 }}
                >
                  No messages yet. Say hello 👋
                </div>
              ) : (
                groupedStream.map((row) => {
                  if (row.kind === "day") {
                    return (
                      <div key={row.id} className="msg-date-sep">
                        <span>{formatDay(row.day)}</span>
                      </div>
                    );
                  }
                  const m = row.msg;
                  const mine =
                    (m.sender?._id || m.sender) === currentUser?.id;
                  const isEdited =
                    m.updatedAt &&
                    m.createdAt &&
                    new Date(m.updatedAt).getTime() - new Date(m.createdAt).getTime() > 1000;
                  const selecting = selectedIds.length > 0;
                  const isSelected = selecting && selectedIds.includes(m._id);
                  const selectable = selecting;
                  const menuOpen = menuForId === m._id;
                  return (
                    <div
                      key={row.id}
                      className={`msg-bubble-row ${
                        mine ? "msg-bubble-row--mine" : ""
                      }${selecting ? " msg-bubble-row--selecting" : ""}`}
                    >
                      {!selecting && (
                        <div
                          className="msg-menu-wrap"
                          ref={menuOpen ? menuRef : null}
                        >
                          <button
                            type="button"
                            className="msg-menu-trigger"
                            onClick={() =>
                              setMenuForId(menuOpen ? null : m._id)
                            }
                            aria-label="Message options"
                            aria-expanded={menuOpen}
                          >
                            <FiChevronDown size={15} />
                          </button>
                          {menuOpen && (
                            <div className="msg-menu">
                              {mine && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(m)}
                                >
                                  <FiEdit2 size={14} /> Edit message
                                </button>
                              )}
                              <button
                                type="button"
                                className={mine ? "msg-menu-danger" : ""}
                                onClick={() => {
                                  setDeleteRequest({
                                    ids: [m._id],
                                    multiple: false,
                                    onlyMe: !mine,
                                  });
                                  setMenuForId(null);
                                }}
                              >
                                <FiTrash2 size={14} />{" "}
                                {mine ? "Delete message" : "Delete for me"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIds([m._id]);
                                  setMenuForId(null);
                                }}
                              >
                                <FiCheck size={14} /> Select more
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`msg-bubble ${
                          mine ? "msg-bubble--mine" : "msg-bubble--theirs"
                        }${selectable ? " msg-bubble--selectable" : ""}${
                          isSelected ? " msg-bubble--selected" : ""
                        }`}
                        onClick={selectable ? () => toggleSelect(m._id) : undefined}
                        role={selectable ? "checkbox" : undefined}
                        aria-checked={selectable ? isSelected : undefined}
                      >
                        {m.attachments?.map((a, i) =>
                          a.type === "file" ? (
                            <a
                              key={i}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="msg-bubble-file"
                              onClick={(e) => selecting && e.preventDefault()}
                            >
                              <FiFileText size={18} />
                              <span className="msg-bubble-file-name">
                                {a.name || "Document"}
                              </span>
                              <FiDownload size={15} />
                            </a>
                          ) : (
                            <img
                              key={i}
                              src={a.url}
                              alt={a.name || "attachment"}
                              className="msg-bubble-image"
                              onClick={(e) => {
                                if (selecting) {
                                  e.preventDefault();
                                  if (selectable) toggleSelect(m._id);
                                } else {
                                  window.open(a.url, "_blank");
                                }
                              }}
                            />
                          ),
                        )}
                        {isSelected && (
                          <span className="msg-bubble-check">
                            <FiCheck size={14} />
                          </span>
                        )}
                        {m.content && <div>{m.content}</div>}
                        <span className="msg-bubble-time">
                          {isEdited && (
                            <span className="msg-bubble-edited">Edited · </span>
                          )}
                          {formatTime(m.createdAt)}
                          {mine && (
                            <span
                              className={`msg-tick ${
                                m.read ? "msg-tick--read" : ""
                              }`}
                            >
                              {m.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {pendingAttachments.length > 0 && (
              <div style={{ padding: "8px 14px 0", background: "#f0f2f5" }}>
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="msg-attach-preview">
                    {a.type === "file" ? (
                      <span className="msg-attach-file">
                        <FiFileText size={16} /> {a.name}
                      </span>
                    ) : (
                      <img src={a.url} alt={a.name} />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAttachments((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {editingMessage ? (
              <div className="msg-edit-bar">
                <div className="msg-edit-bar-head">
                  <FiEdit2 size={14} />
                  <span>Edit message</span>
                </div>
                <div className="msg-edit-bar-row">
                  <button
                    type="button"
                    className="msg-edit-cancel"
                    onClick={cancelEdit}
                    aria-label="Cancel edit"
                    title="Cancel (Esc)"
                  >
                    <FiX size={18} />
                  </button>
                  <input
                    className="msg-edit-input"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    placeholder="Edit message…"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="msg-edit-save"
                    onClick={handleEditSave}
                    disabled={!editDraft.trim() || savingEdit}
                    aria-label="Save edit"
                    title="Save (Enter)"
                  >
                    <FiCheck size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="msg-composer">
                <button
                  className="msg-composer-attach"
                  onClick={handlePickFile}
                  disabled={uploading}
                  title="Attach image"
                >
                  <FiPaperclip size={20} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  className="msg-composer-attach"
                  onClick={handlePickDoc}
                  disabled={uploading}
                  title="Attach document (PDF, Word, Excel)"
                >
                  <FiFileText size={20} />
                </button>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf"
                  onChange={handleDocChange}
                  style={{ display: "none" }}
                />
                <textarea
                  className="msg-composer-input"
                  placeholder={
                    uploading ? "Uploading image…" : "Type a message…"
                  }
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={uploading}
                />
                <button
                  className="msg-composer-send"
                  onClick={handleSend}
                  disabled={
                    uploading ||
                    (!draft.trim() && pendingAttachments.length === 0)
                  }
                  title="Send"
                >
                  <FiSend size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Delete confirmation — "for me" or "for everyone" ── */}
      {deleteRequest && (
        <div
          className="msg-modal-overlay"
          onClick={() => !deleting && setDeleteRequest(null)}
        >
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {deleteRequest.ids.length > 1
                ? `Delete ${deleteRequest.ids.length} messages?`
                : "Delete message?"}
            </h3>
            <p>
              {deleteRequest.onlyMe ? (
                <>
                  This removes the{" "}
                  {deleteRequest.ids.length > 1 ? "messages" : "message"} only
                  from <strong>your</strong> view. The other person can still
                  see {deleteRequest.ids.length > 1 ? "them" : "it"}.
                </>
              ) : (
                <>
                  <strong>Delete for me</strong> hides it only from your view —
                  the other person still sees it.{" "}
                  <strong>Delete for everyone</strong> removes it permanently
                  from the conversation.
                </>
              )}
            </p>
            <div className="msg-modal-actions">
              <button
                type="button"
                className="msg-modal-btn"
                onClick={() => setDeleteRequest(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              {deleteRequest.onlyMe ? (
                <button
                  type="button"
                  className="msg-modal-btn msg-modal-btn--danger"
                  onClick={handleDeleteForMe}
                  disabled={deleting}
                >
                  Delete for me
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="msg-modal-btn msg-modal-btn--warn"
                    onClick={handleDeleteForMe}
                    disabled={deleting}
                  >
                    Delete for me
                  </button>
                  <button
                    type="button"
                    className="msg-modal-btn msg-modal-btn--danger"
                    onClick={handleDeleteEveryone}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Delete for everyone"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
