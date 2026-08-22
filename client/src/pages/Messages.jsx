/* /messages — full WhatsApp-style real-time chat (ApnaBnB).
 *
 * Powered by Socket.IO for live send/receive (falls back to REST). Supports:
 *  - conversation list: avatar, name, online dot, unread badge, last-message
 *    preview + time, pinned/muted icons; pinned chats sort to the top
 *  - typed messages: text, image galleries, video, documents, voice (record +
 *    play), location, property cards
 *  - replies (with tap-to-jump), forward, copy, star, report, message info
 *  - reactions (add / change / remove), emoji picker, soft delete-for-everyone
 *    ("This message was deleted"), delete-for-me, editing ("edited")
 *  - live typing + presence ("online" / "last seen"), read receipts ✓ / ✓✓ / ✓✓
 *  - infinite history (loads older upward), new-message pill, in-chat search
 *  - browser notification + sound (opt-in), responsive two-pane layout
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiSearch, FiPaperclip, FiFileText, FiSend, FiArrowLeft, FiDownload,
  FiChevronDown, FiEdit2, FiTrash2, FiX, FiCheck, FiCopy,
  FiShare2, FiStar, FiInfo, FiFlag, FiMoreVertical, FiSmile, FiImage,
  FiBell, FiBellOff, FiUser, FiSlash,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useProperties } from "../hooks/useProperties";
import messageService from "../services/messageService";
import matchService from "../services/matchService";
import blockService from "../services/blockService";
import uploadService from "../services/uploadService";

import DealRoomPanel from "../components/messages/DealRoomPanel";
import ImageLightbox from "../components/messages/ImageLightbox";
import EmojiPicker from "../components/messages/EmojiPicker";
import AttachmentMenu from "../components/messages/AttachmentMenu";
import VoiceRecorder from "../components/messages/VoiceRecorder";
import VoiceMessagePlayer from "../components/messages/VoiceMessagePlayer";
import PropertyMessageCard from "../components/messages/PropertyMessageCard";
import MessageReactions from "../components/messages/MessageReactions";
import QuoteBlock from "../components/messages/QuoteBlock";
import MessageInfoModal from "../components/messages/MessageInfoModal";
import RefreshButton from "../components/common/RefreshButton";
import useRefresh from "../hooks/useRefresh";
import "../styles/Messages.css";
import "../styles/MessagesExtra.css";

const otherPartyOfMatch = (match, currentUserId) => {
  const ownerId = match?.property?.listedBy?._id || match?.property?.listedBy || null;
  const seekerId = match?.requirement?.requiredBy?._id || match?.requirement?.requiredBy || null;
  if (ownerId && ownerId !== currentUserId) return ownerId;
  if (seekerId && seekerId !== currentUserId) return seekerId;
  return null;
};

/* ── Date / time helpers ───────────────────────────────── */
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
    year: target < new Date(`${new Date().getFullYear()}-01-01`).getTime() ? "numeric" : undefined,
  });
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

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
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatLastSeen = (iso) => {
  if (!iso) return "last seen recently";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = startOfDay(d) === startOfDay(now);
  if (sameDay) return `last seen today at ${formatTime(d)}`;
  if (startOfDay(d) === startOfDay(now) - 86400000) return "last seen yesterday";
  return `last seen ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${formatTime(d)}`;
};

/* ── Message preview helpers (side list + quote excerpts) ── */
const messagePreview = (m) => {
  if (!m) return "No messages yet";
  if (m.deletedAt) return "This message was deleted";
  switch (m.type) {
    case "image":
      return m.content ? `📷 ${m.content}` : "📷 Photo";
    case "video":
      return m.content ? `🎬 ${m.content}` : "🎬 Video";
    case "audio":
      return "🎙 Voice message";
    case "document":
      return `📎 ${m.attachments?.[0]?.name || "Document"}`;
    case "location":
      return "📍 Location";
    case "property":
      return `🏠 ${m.property?.title || "Property"}`;
    default:
      return m.content || "📎 Attachment";
  }
};

/* ── Tiny Web Audio ping (no asset dependency) ── */
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
  } catch { /* audio is best-effort */ }
};

/* ── Linkify (URLs/emails inside text bubbles) ── */
const Linkify = ({ text }) => {
  const parts = String(text || "").split(
    /(\bhttps?:\/\/[^\s]+|www\.[^\s]+|\b[\w.+-]+@[\w-]+\.[\w.]+\b)/g,
  );
  return parts.map((p, i) => {
    if (/^https?:\/\//i.test(p)) {
      const href = p.replace(/[.,;!?]+$/, "");
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {p}
        </a>
      );
    }
    if (/^www\./i.test(p)) {
      return (
        <a key={i} href={`https://${p}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {p}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(p)) {
      return (
        <a key={i} href={`mailto:${p}`} onClick={(e) => e.stopPropagation()}>
          {p}
        </a>
      );
    }
    return p;
  });
};

const getOtherParticipant = (conversation, currentUserId) =>
  conversation?.participants?.find((p) => (p?._id || p?.id || p) !== currentUserId) || null;

/* Pin icon — Feather has no pushpin, so a small inline one. */
const PinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 3l5 5-3 1-2 5-5 5-5-1-4 4-1-1 4-4-1-5 5-5 5-2 2-3z" />
  </svg>
);

/* ── Component ─────────────────────────────────────────── */
const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, subscription } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Paywall: sellers & dealers need an active plan to use messaging / the Deal
  // Room (buyers are free). The gate is SERVER-driven — AuthContext fetched
  // GET /api/payments/status, which checks the user's latest Payment row, so
  // an admin reject locks messaging here on the next visit. While the status
  // is loading we hold off (no false bounce); once loaded, locked users are
  // bounced to the Plans page, keeping their intended destination so they land
  // back here after subscribing.
  const messagingUnlocked =
    !subscription.requiresPlan || subscription.active;
  const gateLoaded = subscription.loaded && !subscription.loading;
  useEffect(() => {
    if (
      currentUser &&
      subscription.loaded &&
      !subscription.loading &&
      !messagingUnlocked
    ) {
      const from = encodeURIComponent(location.pathname + location.search);
      toast.info("Subscribe to a plan to unlock messaging.");
      navigate(`/plans?from=${from}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser,
    subscription.loaded,
    subscription.loading,
    messagingUnlocked,
  ]);

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Refresh just this tab — re-pulls the conversation list, no browser reload.
  const { refresh: refreshConvs, refreshing: refreshingConvs } = useRefresh(
    async () => setConversations(await messageService.getConversations()),
  );
  const [loadingMessages, setLoadingMessages] = useState(false);

  // infinite history
  const [hasMore, setHasMore] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dealMatch, setDealMatch] = useState(null);

  /* edit / delete / select */
  const [menuForId, setMenuForId] = useState(null);
  // Per-message action menu opens "up" or "down" so it's never clipped by the
  // stream / hidden behind the composer (decided from available space on open).
  const [menuDir, setMenuDir] = useState("down");
  const [editingMessage, setEditingMessage] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  /* typing + presence + read */
  const [otherTyping, setOtherTyping] = useState(false);
  const [presence, setPresence] = useState({}); // {userId:{online,lastSeenAt}}
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  /* blocking + clear-chat confirmations */
  const [blockedIds, setBlockedIds] = useState(() => new Set()); // ids I've blocked
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  /* composer extras */
  const [emojiFor, setEmojiFor] = useState(null); // "composer" | messageId | null
  const [attachOpen, setAttachOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [pendingProperty, setPendingProperty] = useState(null);
  const [sharePropsOpen, setSharePropsOpen] = useState(false);
  const [forwardTarget, setForwardTarget] = useState(null); // message to forward
  const [forwardOpen, setForwardOpen] = useState(false);

  /* viewer / info */
  const [lightbox, setLightbox] = useState(null); // {images, index}
  const [infoFor, setInfoFor] = useState(null);

  /* in-chat search */
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState([]);
  const [highlightMsgId, setHighlightMsgId] = useState(null);
  const [searchingChat, setSearchingChat] = useState(false);

  /* scroll state */
  const [atBottom, setAtBottom] = useState(true);
  const [newMsgPill, setNewMsgPill] = useState(false);

  const streamRef = useRef(null);
  const fileInputRef = useRef(null); // images
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const menuRef = useRef(null);
  const headerMenuRef = useRef(null);
  const conversationsRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const activeIdRef = useRef(null);
  const atBottomRef = useRef(true);
  const newestAtRef = useRef(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { atBottomRef.current = atBottom; }, [atBottom]);
  useEffect(() => {
    newestAtRef.current = messages.length ? messages[messages.length - 1]?.createdAt : null;
  }, [messages]);

  /* ── load the set of users I've blocked (drives Block/Unblock in the menu) ── */
  useEffect(() => {
    let cancelled = false;
    blockService
      .listBlocked()
      .then((data) => {
        if (!cancelled) setBlockedIds(new Set(data?.blocked || []));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  /* ── initial fetch + URL opening ── */
  useEffect(() => {
    // Skip loading anything for locked users — they're being redirected to /plans.
    // Also wait until the gate status has loaded so an admin-rejected user
    // never fetches conversations before the bounce happens.
    if (currentUser && (!gateLoaded || !messagingUnlocked)) return;
    let cancelled = false;
    setLoadingConvs(true);

    const openFromUrl = async (list) => {
      const matchId = searchParams.get("match");
      const convId = searchParams.get("conversation");
      const withUser = searchParams.get("with");
      const draftParam = searchParams.get("draft");

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
        if (draftParam) setDraft(draftParam);
        searchParams.delete("draft");
        setSearchParams(searchParams, { replace: true });
        return;
      }

      if (withUser && withUser !== currentUser?.id) {
        try {
          const conv = await messageService.findOrCreateDirect(withUser);
          const fresh = await messageService.getConversations();
          if (!cancelled) {
            setConversations(fresh);
            setActiveId(conv._id);
            if (draftParam) setDraft(draftParam);
            searchParams.delete("with");
            searchParams.delete("draft");
            setSearchParams(searchParams, { replace: true });
          }
        } catch (err) {
          toast.error(err?.message || "Could not open conversation");
        }
      } else if (list.length > 0) {
        setActiveId(list[0]._id);
        if (draftParam) setDraft(draftParam);
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

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  /* ── load messages (recent first) + mark read ── */
  const loadMessages = useCallback(
    async (conversationId) => {
      setLoadingMessages(true);
      setOtherTyping(false);
      setMenuForId(null);
      setEditingMessage(null);
      setEditDraft("");
      setSelectedIds([]);
      setDeleteRequest(null);
      setReplyTarget(null);
      setPendingAttachments([]);
      setPendingLocation(null);
      setPendingProperty(null);
      setChatSearchOpen(false);
      setChatSearchResults([]);
      setHighlightMsgId(null);

      try {
        const data = await messageService.getMessagesPaged(conversationId, { limit: 40 });
        const list = Array.isArray(data) ? data : data.messages || [];
        setMessages(list);
        setHasMore(Array.isArray(data) ? false : !!data.hasMore);
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        // read receipts — bulk mark
        const unreadIds = list
          .filter((m) => !m.read && (m.sender?._id || m.sender?.id || m.sender) !== currentUser?.id)
          .map((m) => m._id);
        if (unreadIds.length > 0) {
          messageService.markMultipleAsRead(unreadIds).catch(() => {});
        }
        messageService.markConversationRead(conversationId).catch(() => {});
      } catch (err) {
        toast.error(err?.message || "Failed to load messages");
      } finally {
        setLoadingMessages(false);
        if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    },
    [currentUser?.id],
  );

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  /* ── load older messages (preserve scroll) ── */
  const loadOlder = useCallback(async () => {
    if (!activeId || olderLoading || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    setOlderLoading(true);
    const el = streamRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    try {
      const data = await messageService.getMessagesPaged(activeId, { before: oldest.createdAt, limit: 40 });
      const older = data.messages || [];
      if (older.length) {
        setMessages((prev) => [...older, ...prev]);
        setHasMore(!!data.hasMore);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      } else {
        setHasMore(false);
      }
    } catch {
      /* ignore transient failures on history load */
    } finally {
      setOlderLoading(false);
    }
  }, [activeId, olderLoading, hasMore, messages]);

  /* ── socket handlers ── */
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
      const fromMe = msg.sender?._id === currentUser?.id || msg.sender?.id === currentUser?.id || msg.sender === currentUser?.id;

      if (isActive) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setOtherTyping(false);
        clearTimeout(typingClearRef.current);
        if (!fromMe && msg._id) {
          messageService.markAsRead(msg._id).catch(() => {});
        }
        // pill if not at bottom
        if (!atBottomRef.current) setNewMsgPill(true);
      }

      setConversations((prev) => {
        let touched = false;
        const next = prev.map((c) => {
          if (c._id !== msg.conversationId) return c;
          touched = true;
          return {
            ...c,
            lastMessage: msg,
            unreadCount: isActive || fromMe ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        if (!touched) {
          messageService.getConversations().then((l) => setConversations(l)).catch(() => {});
        }
        return next.sort((a, b) => {
          if (!!a.prefs?.pinned !== !!b.prefs?.pinned) return a.prefs?.pinned ? -1 : 1;
          const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
          const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
          return tb - ta;
        });
      });

      const fromOther = !fromMe;
      if (fromOther && (!isActive || document.hidden)) {
        playPing();
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(`New message from ${msg.sender?.name || "Someone"}`, {
              body: msg.content?.slice(0, 120) || messagePreview(msg),
              icon: "/favicon.ico",
              tag: msg.conversationId,
            });
            n.onclick = () => {
              window.focus();
              setActiveId(msg.conversationId);
              n.close();
            };
          } catch { /* best effort */ }
        }
      }
    };

    const onMessageUpdated = (msg) => {
      if (!msg?._id) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)));
      setConversations((prev) =>
        prev.map((c) => (c.lastMessage?._id === msg._id ? { ...c, lastMessage: msg } : c)),
      );
    };

    const onMessageDeleted = ({ messageId, conversationId }) => {
      if (!messageId) return;
      // soft delete — replace with placeholder so it stays for everyone
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedAt: true } : m,
        ),
      );
      const conv = conversationsRef.current.find((c) => c._id === conversationId);
      if (conv?.lastMessage?._id === messageId) {
        messageService.getConversations().then((l) => setConversations(l)).catch(() => {});
      }
    };

    const onTyping = ({ conversationId, userId: from, isTyping }) => {
      if (conversationId !== activeIdRef.current) return;
      if (from === currentUser?.id) return;
      setOtherTyping(!!isTyping);
      clearTimeout(typingClearRef.current);
      if (isTyping) typingClearRef.current = setTimeout(() => setOtherTyping(false), 3000);
    };

    const onMessageRead = ({ messageId, readAt }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, read: true, readAt: readAt || m.readAt } : m)),
      );
    };

    const onMessageReaction = ({ messageId, reactions }) => {
      if (!messageId) return;
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };

    const onMessageHidden = ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const onPresence = ({ userId, online, lastSeenAt }) => {
      setPresence((prev) => ({ ...prev, [userId]: { online, lastSeenAt: lastSeenAt || (prev[userId]?.lastSeenAt) } }));
    };

    const onConversationPrefs = ({ conversationId, prefs }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, prefs: { ...(c.prefs || {}), ...prefs } } : c)),
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("typing", onTyping);
    socket.on("message_read", onMessageRead);
    socket.on("message_reaction", onMessageReaction);
    socket.on("message_hidden", onMessageHidden);
    socket.on("presence", onPresence);
    socket.on("conversation_prefs", onConversationPrefs);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("typing", onTyping);
      socket.off("message_read", onMessageRead);
      socket.off("message_reaction", onMessageReaction);
      socket.off("message_hidden", onMessageHidden);
      socket.off("presence", onPresence);
      socket.off("conversation_prefs", onConversationPrefs);
      clearTimeout(typingClearRef.current);
    };
  }, [socket, currentUser?.id]);

  /* join active conversation room */
  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit("join_conversation", { conversationId: activeId });
    return () => socket.emit("leave_conversation", { conversationId: activeId });
  }, [socket, activeId]);

  /* close outside-click for menus */
  useEffect(() => {
    if (!menuForId && !headerMenuOpen && !emojiFor) return;
    const onDown = (e) => {
      const inMsg = menuRef.current && menuRef.current.contains(e.target);
      const inHeader = headerMenuRef.current && headerMenuRef.current.contains(e.target);
      if (!inMsg && !inHeader) {
        setMenuForId(null);
        setHeaderMenuOpen(false);
        setEmojiFor(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuForId, headerMenuOpen, emojiFor]);

  /* escape key tower */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmClear) { setConfirmClear(false); return; }
      if (confirmBlock && !blockBusy) { setConfirmBlock(false); return; }
      if (editingMessage) { setEditingMessage(null); setEditDraft(""); return; }
      if (deleteRequest) { setDeleteRequest(null); return; }
      if (infoFor) { setInfoFor(null); return; }
      if (lightbox) { setLightbox(null); return; }
      if (forwardOpen) { setForwardOpen(false); return; }
      if (sharePropsOpen) { setSharePropsOpen(false); return; }
      if (headerMenuOpen) { setHeaderMenuOpen(false); return; }
      if (replyTarget) { setReplyTarget(null); return; }
      if (selectedIds.length > 0) { setSelectedIds([]); return; }
      if (menuForId) { setMenuForId(null); return; }
      if (activeId) closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmClear, confirmBlock, blockBusy, editingMessage, deleteRequest, infoFor, lightbox, forwardOpen, sharePropsOpen, headerMenuOpen, replyTarget, selectedIds, menuForId, activeId]);

  /* ── scroll handling ── */
  const handleScroll = () => {
    const el = streamRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(nearBottom);
    if (nearBottom) setNewMsgPill(false);
    if (el.scrollTop < 60) loadOlder();
  };

  const scrollToBottom = (smooth = false) => {
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewMsgPill(false);
  };

  const jumpToMessage = (id) => {
    if (!id) return;
    setHighlightMsgId(id);
    const el = document.querySelector(`[data-mid="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightMsgId(null), 1800);
  };

  /* ── derived ── */
  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const name = (conversationTitle(c, currentUser?.id) || "").toLowerCase();
      const last = (messagePreview(c.lastMessage) || "").toLowerCase();
      const prop = (c.property?.title || "").toLowerCase();
      return name.includes(q) || last.includes(q) || prop.includes(q);
    });
  }, [conversations, search, currentUser?.id]);

  const activeConv = useMemo(
    () => conversations.find((c) => c._id === activeId) || null,
    [conversations, activeId],
  );

  const otherUser = useMemo(() => getOtherParticipant(activeConv, currentUser?.id), [activeConv, currentUser?.id]);
  const otherOnline = otherUser ? !!presence[otherUser._id || otherUser.id]?.online : false;

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

  /* ── send ── */
  const sendPayload = useCallback(
    async (payload) => {
      if (!activeId) return;
      if (socket?.connected) {
        socket.emit("send_message", payload, (response) => {
          if (!response?.ok) {
            toast.error(response?.error || "Failed to send message");
            setDraft((d) => d || payload.content || "");
          }
        });
      } else {
        try {
          const message = await messageService.sendMessage(activeId, payload);
          setMessages((prev) => [...prev, message]);
        } catch (err) {
          toast.error(err?.message || "Failed to send message");
          setDraft(payload.content || "");
        }
      }
    },
    [activeId, socket],
  );

  const clearPending = useCallback(() => {
    setDraft("");
    setPendingAttachments([]);
    setReplyTarget(null);
    setPendingLocation(null);
    setPendingProperty(null);
    clearTimeout(typingTimeoutRef.current);
    if (socket?.connected && activeIdRef.current) {
      socket.emit("typing", { conversationId: activeIdRef.current, isTyping: false });
    }
  }, [socket]);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!activeId) return;
    const hasPending = pendingAttachments.length > 0 || pendingLocation || pendingProperty;
    if (!trimmed && !hasPending) return;

    const payload = {
      conversationId: activeId,
      content: trimmed,
      attachments: pendingAttachments,
      parentMessageId: replyTarget?._id || null,
    };
    if (pendingLocation) payload.type = "location";
    if (pendingProperty) {
      payload.type = "property";
      payload.propertyId = pendingProperty._id || pendingProperty.id;
    }
    if (pendingAttachments.length > 0 && pendingAttachments.every((a) => a.type === "image") && !payload.type) {
      payload.type = "image";
    }

    const snapshot = { draft: trimmed, attachments: pendingAttachments, location: pendingLocation, property: pendingProperty, reply: replyTarget };
    clearPending();
    await sendPayload(payload);
    // restore pending if the socket is down (REST path re-adds failures itself)
    if (!socket?.connected) {
      setDraft(snapshot.draft);
      setPendingAttachments(snapshot.attachments);
      setPendingLocation(snapshot.location);
      setPendingProperty(snapshot.property);
      setReplyTarget(snapshot.reply);
    }
  }, [activeId, draft, pendingAttachments, pendingLocation, pendingProperty, replyTarget, socket, sendPayload, clearPending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (socket?.connected && activeId) {
      socket.emit("typing", { conversationId: activeId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socket?.connected && activeIdRef.current) {
          socket.emit("typing", { conversationId: activeIdRef.current, isTyping: false });
        }
      }, 1500);
    }
  };

  const handlePickEmoji = (emoji) => {
    setDraft((d) => d + emoji);
    setEmojiFor(null);
  };

  /* ── attachments ── */
  const handlePickFile = () => fileInputRef.current?.click();
  const handlePickVideo = () => videoInputRef.current?.click();
  const handlePickDoc = () => docInputRef.current?.click();

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const bad = files.some((f) => f.size > 10 * 1024 * 1024);
    if (bad) { toast.error("Each image must be 10 MB or smaller"); return; }
    setUploading(true);
    try {
      const result = await uploadService.uploadChatImages(files);
      const images = result?.images || [];
      setPendingAttachments((prev) => [
        ...prev,
        ...images.map((img) => ({ url: img.url, type: "image", name: img.name, size: img.size })),
      ]);
    } catch (err) {
      toast.error(err?.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be 50 MB or smaller"); return; }
    setUploading(true);
    try {
      const result = await uploadService.uploadChatVideo(file);
      const v = result?.video;
      if (!v?.url) throw new Error("Upload failed");
      setPendingAttachments((prev) => [...prev, { url: v.url, type: "video", name: v.name, size: v.size }]);
    } catch (err) {
      toast.error(err?.message || "Video upload failed");
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Document must be 20 MB or smaller"); return; }
    setUploading(true);
    try {
      const result = await uploadService.uploadChatDocument(file);
      const d = result?.document;
      if (!d?.url) throw new Error("Upload failed");
      setPendingAttachments((prev) => [...prev, { url: d.url, type: "file", name: d.name, size: d.size }]);
    } catch (err) {
      toast.error(err?.message || "Document upload failed");
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleVoiceSend = async (file) => {
    setUploading(true);
    try {
      const result = await uploadService.uploadChatVoice(file);
      const a = result?.audio;
      if (!a?.url) throw new Error("Upload failed");
      await sendPayload({
        conversationId: activeId,
        content: "",
        attachments: [{ url: a.url, type: "audio", name: a.name, size: a.size, duration: file.name || undefined }],
        type: "audio",
      });
    } catch (err) {
      toast.error(err?.message || "Voice upload failed");
    } finally {
      setUploading(false);
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My location",
        });
      },
      () => toast.error("Could not get your location"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  /* property share dialog (uses real marketplace data) */
  const propQuery = useProperties({}, false);
  const openShareProps = () => {
    setSharePropsOpen(true);
    propQuery.refetch();
  };
  const pickProperty = (p) => {
    setPendingProperty(p);
    setSharePropsOpen(false);
  };

  /* ── reactions ── */
  const handleReact = useCallback(async (messageId, emoji) => {
    try {
      const updated = await messageService.setReaction(messageId, emoji || "");
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, ...updated } : m)));
    } catch (err) {
      toast.error(err?.message || "Failed to react");
    }
  }, []);

  /* ── star / info / report / copy / forward ── */
  const handleStar = async (m) => {
    try {
      const updated = await messageService.toggleStar(m._id);
      setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, ...updated } : x)));
    } catch (err) {
      toast.error(err?.message || "Failed to star message");
    }
  };

  const handleCopy = (m) => {
    const text = m.content || "";
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success("Message copied");
  };

  const handleReport = async (m) => {
    try {
      await messageService.reportMessage(m._id, "Reported from chat");
      toast.success("Message reported to moderators");
    } catch (err) {
      toast.error(err?.message || "Failed to report");
    }
  };

  const handleForward = async () => {
    const msg = forwardTarget;
    if (!msg) return;
    // copy into any OTHER conversation
    const targets = conversationsRef.current.filter((c) => c._id !== activeIdRef.current);
    if (targets.length === 0) {
      toast.info("No other conversations to forward to");
      setForwardOpen(false);
      return;
    }
    for (const conv of targets) {
      const payload = {
        conversationId: conv._id,
        content: msg.content || "",
        attachments: msg.attachments || [],
        type: msg.type || "text",
        forwarded: true,
      };
      if (msg.propertyId) payload.propertyId = msg.propertyId;
      await sendPayload(payload);
    }
    setForwardOpen(false);
    setForwardTarget(null);
    toast.success(`Forwarded to ${targets.length} chat${targets.length > 1 ? "s" : ""}`);
  };

  /* ── edit / delete ── */
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
      const updated = await messageService.updateMessage(editingMessage._id, trimmed);
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m)));
      setConversations((prev) =>
        prev.map((c) => (c.lastMessage?._id === updated._id ? { ...c, lastMessage: updated } : c)),
      );
      cancelEdit();
    } catch (err) {
      toast.error(err?.message || "Failed to edit message");
    } finally {
      setSavingEdit(false);
    }
  }, [editingMessage, editDraft, savingEdit]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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

  const handleDeleteEveryone = useCallback(async () => {
    const ids = deleteRequest?.ids || [];
    if (!ids.length || deleting) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => messageService.deleteMessage(id)));
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m._id) ? { ...m, deletedAt: new Date().toISOString() } : m)),
      );
      const conv = conversationsRef.current.find((c) => c._id === activeIdRef.current);
      if (conv?.lastMessage && ids.includes(conv.lastMessage._id)) {
        messageService.getConversations().then((l) => setConversations(l)).catch(() => {});
      }
      setDeleteRequest(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      toast.error(err?.message || "Failed to delete messages");
    } finally {
      setDeleting(false);
    }
  }, [deleteRequest, deleting]);

  /* ── conversation prefs (pin / mute / archive) ── */
  const updateConvPref = async (convId, patch) => {
    try {
      await messageService.updatePrefs(convId, patch);
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, prefs: { ...(c.prefs || {}), ...patch } } : c)),
      );
      setHeaderMenuOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update conversation");
    }
  };

  const closeChat = useCallback(() => {
    setActiveId(null);
    setMenuForId(null);
    setEditingMessage(null);
    setEditDraft("");
    setSelectedIds([]);
    setReplyTarget(null);
    setHeaderMenuOpen(false);
    setChatSearchOpen(false);
  }, []);

  /* ── header-menu actions (View Profile / Clear Chat / Report / Block) ── */
  const otherUserId = otherUser?._id || otherUser?.id || null;
  const otherIsBlocked = otherUserId ? blockedIds.has(otherUserId) : false;

  const handleViewProfile = () => {
    setHeaderMenuOpen(false);
    if (otherUserId) navigate(`/users/${otherUserId}`);
    else toast.info("Profile unavailable");
  };

  const handleClearChat = async () => {
    if (!activeId) return;
    try {
      await messageService.clearConversation(activeId);
      setMessages([]);
      setConfirmClear(false);
      setConversations((prev) =>
        prev.map((c) => (c._id === activeId ? { ...c, lastMessage: null, unreadCount: 0 } : c)),
      );
      toast.success("Chat cleared");
    } catch (err) {
      toast.error(err?.message || "Failed to clear chat");
    }
  };

  const handleReportUser = async () => {
    setHeaderMenuOpen(false);
    // Report using the most recent message from the other party (existing
    // moderation endpoint records it against that message + sender).
    const target = [...messages].reverse().find(
      (m) => (m.sender?._id || m.sender?.id || m.sender) === otherUserId,
    );
    if (!target) {
      toast.info("Nothing to report yet");
      return;
    }
    try {
      await messageService.reportMessage(target._id, "User reported from chat");
      toast.success("Reported to moderators");
    } catch (err) {
      toast.error(err?.message || "Failed to report");
    }
  };

  const handleToggleBlock = async () => {
    if (!otherUserId || blockBusy) return;
    setBlockBusy(true);
    try {
      if (otherIsBlocked) {
        await blockService.unblock(otherUserId);
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(otherUserId);
          return next;
        });
        toast.success("User unblocked");
      } else {
        await blockService.block(otherUserId);
        setBlockedIds((prev) => new Set(prev).add(otherUserId));
        toast.success("User blocked");
      }
      setConfirmBlock(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update block");
    } finally {
      setBlockBusy(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  /* in-chat search */
  const runChatSearch = useCallback(async () => {
    if (!activeId || !chatSearchQuery.trim()) {
      setChatSearchResults([]);
      return;
    }
    setSearchingChat(true);
    try {
      const data = await messageService.searchMessages(activeId, chatSearchQuery.trim());
      setChatSearchResults(Array.isArray(data?.matches) ? data.matches : []);
    } catch {
      setChatSearchResults([]);
    } finally {
      setSearchingChat(false);
    }
  }, [activeId, chatSearchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (chatSearchQuery.trim()) runChatSearch();
      else setChatSearchResults([]);
    }, 350);
    return () => clearTimeout(t);
  }, [chatSearchQuery, runChatSearch]);

  /* ── render ── */
  // Locked users are being redirected to /plans — render nothing meanwhile
  // (and hold rendering until the gate status has loaded, so a rejected user
  // never sees even an empty shell of their old chats).
  if (currentUser && (!gateLoaded || !messagingUnlocked)) return null;

  return (
    <div className={`msg-shell ${activeId ? "msg-shell--has-active" : ""}`}>
      {/* ══ Left: conversation sidebar ══ */}
      <aside className="msg-sidebar">
        <div className="msg-sidebar-header">
          <div className="msg-sidebar-header-row">
            <h1 className="msg-sidebar-title">Messages</h1>
            <RefreshButton onRefresh={refreshConvs} refreshing={refreshingConvs} />
          </div>
          <p className="msg-sidebar-sub">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
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
            <div className="msg-conv-empty">
              {[0, 1, 2].map((i) => (
                <div key={i} className="msg-conv-skel" />
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="msg-conv-empty">
              {search.trim()
                ? "No conversations match your search."
                : "No conversations yet. Open a match and click Message to start one."}
            </div>
          ) : (
            filteredConvs.map((c) => {
              const other = getOtherParticipant(c, currentUser?.id);
              const isActive = c._id === activeId;
              const unread = c.unreadCount || 0;
              const otherId = other?._id || other?.id || other;
              const online = otherId ? !!presence[otherId]?.online : false;
              const pinned = !!c.prefs?.pinned;
              const muted = !!c.prefs?.muted;
              return (
                <button
                  key={c._id}
                  className={`msg-conv-item ${isActive ? "msg-conv-item--active" : ""} ${pinned ? "msg-conv-item--pinned" : ""}`}
                  onClick={() => setActiveId(c._id)}
                >
                  <span className="msg-conv-avatar-wrap">
                    {other?.avatar ? (
                      <img src={other.avatar} alt={other.name} className="msg-conv-avatar" />
                    ) : (
                      <span className="msg-conv-avatar">{conversationInitial(c, currentUser?.id)}</span>
                    )}
                    {online && <span className="msg-online-dot" />}
                  </span>
                  <div className="msg-conv-meta">
                    <div className="msg-conv-top">
                      <span className="msg-conv-name">
                        {conversationTitle(c, currentUser?.id)}
                      </span>
                      <span className="msg-conv-flags">
                        {pinned && <PinIcon size={12} className="msg-flag-pin" />}
                        {muted && <FiBellOff size={12} className="msg-flag-mute" />}
                        <span className="msg-conv-time">
                          {c.lastMessage?.createdAt ? formatRelativeShort(c.lastMessage.createdAt) : ""}
                        </span>
                      </span>
                    </div>
                    <div className="msg-conv-bottom">
                      <span className={`msg-conv-preview ${unread > 0 ? "msg-conv-preview--unread" : ""}`}>
                        {messagePreview(c.lastMessage)}
                      </span>
                      {unread > 0 && (
                        <span className="msg-conv-badge">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ══ Right: chat pane ══ */}
      <section className="msg-chat">
        {showBanner && (
          <div className={`msg-conn-banner ${connected ? "msg-conn-banner--ok" : ""}`}>
            {connected ? "Connected" : "Reconnecting…"}
          </div>
        )}

        {!activeConv ? (
          <div className="msg-no-chat">
            <div className="msg-no-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Pick someone from the list, or start a chat from a match's <strong>Message</strong> button.</p>
          </div>
        ) : (
          <>
            {selectedIds.length > 0 ? (
              <header className="msg-select-bar">
                <button type="button" className="msg-select-close" onClick={() => setSelectedIds([])} aria-label="Exit selection" title="Exit selection (Esc)">
                  <FiX size={20} />
                </button>
                <span className="msg-select-count">{selectedIds.length} selected</span>
                <div className="msg-select-actions">
                  <button type="button" className="msg-select-btn" onClick={() => {
                    setSelectedIds(allVisibleIds.every((id) => selectedIds.includes(id)) ? [] : allVisibleIds);
                  }}>
                    <FiCheck size={15} />
                    {allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id)) ? "Deselect all" : "Select all"}
                  </button>
                  <button type="button" className="msg-select-btn msg-select-btn--danger" onClick={() => setDeleteRequest({ ids: [...selectedIds], multiple: selectedIds.length > 1, onlyMe: true })}>
                    <FiTrash2 size={15} /> Delete
                  </button>
                </div>
              </header>
            ) : (
              <header className="msg-chat-header">
                <button className="msg-chat-back" onClick={closeChat} aria-label="Back to conversations" title="Back">
                  <FiArrowLeft size={20} />
                </button>
                {otherUser?.avatar ? (
                  <img src={otherUser.avatar} alt={otherUser.name} className="msg-conv-avatar" />
                ) : (
                  <span className="msg-conv-avatar">{conversationInitial(activeConv, currentUser?.id)}</span>
                )}
                <div className="msg-chat-header-meta">
                  <div className="msg-chat-header-name">
                    {conversationTitle(activeConv, currentUser?.id)}
                    {otherOnline && <span className="msg-online-label">Online</span>}
                  </div>
                  <div className="msg-chat-header-sub">
                    {otherTyping ? (
                      <span className="msg-typing-hint">typing…</span>
                    ) : otherOnline ? (
                      "Online"
                    ) : (
                      formatLastSeen(otherUser?.lastSeenAt)
                    )}
                    {otherUser?.role && <span className="msg-role"> • {otherUser.role}</span>}
                  </div>
                  {activeConv.property && (
                    <button
                      type="button"
                      className="msg-header-prop"
                      onClick={() => navigate(`/property/${activeConv.property._id || activeConv.property.id}`)}
                      title={activeConv.property.title}
                    >
                      🏠 {activeConv.property.title}
                    </button>
                  )}
                </div>
                <div className="msg-header-actions">
                  <button type="button" className="msg-header-btn" title="Search messages" onClick={() => setChatSearchOpen((o) => !o)}>
                    <FiSearch size={18} />
                  </button>
                  <div ref={headerMenuRef} className="msg-header-menu-wrap">
                    <button type="button" className="msg-header-btn" title="More options" onClick={() => setHeaderMenuOpen((o) => !o)}>
                      <FiMoreVertical size={18} />
                    </button>
                    {headerMenuOpen && (
                      <div className="msg-header-menu" role="menu">
                        <button type="button" onClick={handleViewProfile}>
                          <FiUser size={15} /> View Profile
                        </button>
                        <button type="button" onClick={() => updateConvPref(activeId, { muted: !activeConv.prefs?.muted })}>
                          {activeConv.prefs?.muted ? <FiBell size={15} /> : <FiBellOff size={15} />}
                          {activeConv.prefs?.muted ? "Unmute Notifications" : "Mute Notifications"}
                        </button>
                        <button type="button" onClick={() => { setHeaderMenuOpen(false); setConfirmClear(true); }}>
                          <FiTrash2 size={15} /> Clear Chat
                        </button>
                        <button type="button" className="msg-header-menu--danger" onClick={handleReportUser}>
                          <FiFlag size={15} /> Report User
                        </button>
                        <button
                          type="button"
                          className="msg-header-menu--danger"
                          onClick={() => { setHeaderMenuOpen(false); setConfirmBlock(true); }}
                        >
                          <FiSlash size={15} /> {otherIsBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            {dealMatch && dealMatch.conversationId === activeId && (
              <DealRoomPanel match={dealMatch} currentUser={currentUser} onMatchChange={(patch) => setDealMatch((prev) => (prev ? { ...prev, ...patch } : prev))} />
            )}

            {chatSearchOpen && (
              <div className="msg-chat-search">
                <div className="msg-chat-search-input">
                  <FiSearch size={15} />
                  <input
                    type="text"
                    placeholder="Search messages…"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button type="button" onClick={() => setChatSearchOpen(false)} aria-label="Close search">
                    <FiX size={16} />
                  </button>
                </div>
                {chatSearchQuery.trim() && (
                  <div className="msg-chat-search-results">
                    {searchingChat ? (
                      <div className="msg-chat-search-note">Searching…</div>
                    ) : chatSearchResults.length === 0 ? (
                      <div className="msg-chat-search-note">No matches found</div>
                    ) : (
                      chatSearchResults.map((r) => (
                        <button key={r._id} type="button" className="msg-search-hit" onClick={() => { setChatSearchOpen(false); jumpToMessage(r._id); }}>
                          <span className="msg-search-hit-from">{r.sender?.name}</span>
                          <span className="msg-search-hit-text">{r.content}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              className="msg-chat-stream"
              ref={streamRef}
              onScroll={handleScroll}
            >
              {loadingMessages ? (
                <div className="msg-stream-loading">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`msg-bubble-skel ${i % 2 ? "msg-bubble-skel--mine" : ""}`} />
                  ))}
                </div>
              ) : (
                <>
                  {olderLoading && <div className="msg-history-loading">Loading older messages…</div>}
                  {groupedStream.length === 0 ? (
                    <div className="msg-empty-chat">
                      <span className="msg-empty-chat-emoji">👋</span>
                      <p>No messages yet. Say hello!</p>
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
                      const mine = (m.sender?._id || m.sender?.id || m.sender) === currentUser?.id;
                      const selecting = selectedIds.length > 0;
                      const selectable = selecting;
                      const isSelected = selecting && selectedIds.includes(m._id);
                      const menuOpen = menuForId === m._id;
                      const isHighlight = highlightMsgId === m._id;
                      const deleted = !!m.deletedAt;
                      const reactions = m.reactions && typeof m.reactions === "object" ? m.reactions : {};
                      const myReaction = reactions[currentUser?.id];
                      const images = (Array.isArray(m.attachments) ? m.attachments : []).filter((a) => a.type === "image" || (!a.type && a.url));
                      const video = (Array.isArray(m.attachments) ? m.attachments : []).find((a) => a.type === "video");
                      const audio = (Array.isArray(m.attachments) ? m.attachments : []).find((a) => a.type === "audio");
                      const doc = (Array.isArray(m.attachments) ? m.attachments : []).find((a) => a.type === "file");

                      return (
                        <div
                          key={row.id}
                          data-mid={m._id}
                          className={`msg-bubble-row ${mine ? "msg-bubble-row--mine" : ""}${selecting ? " msg-bubble-row--selecting" : ""}${isHighlight ? " msg-bubble-row--highlight" : ""}`}
                          id={`msg-${m._id}`}
                        >
                          {!selecting && (
                            <div className="msg-menu-wrap" ref={menuOpen ? menuRef : null}>
                              <button
                                type="button"
                                className="msg-menu-trigger"
                                onClick={(e) => {
                                  if (menuOpen) { setMenuForId(null); return; }
                                  // Flip the menu upward when there isn't room
                                  // below the trigger inside the message stream.
                                  const btn = e.currentTarget.getBoundingClientRect();
                                  const stream = streamRef.current?.getBoundingClientRect();
                                  const spaceBelow = stream ? stream.bottom - btn.bottom : 9999;
                                  setMenuDir(spaceBelow < 370 ? "up" : "down");
                                  setMenuForId(m._id);
                                }}
                                aria-label="Message options"
                                aria-expanded={menuOpen}
                              >
                                <FiChevronDown size={15} />
                              </button>
                              {menuOpen && (
                                <div className={`msg-menu${menuDir === "up" ? " msg-menu--up" : ""}`}>
                                  <button type="button" onClick={() => { setReplyTarget(m); setMenuForId(null); }}>
                                    <FiShare2 size={14} /> Reply
                                  </button>
                                  {!deleted && m.content && (
                                    <button type="button" onClick={() => { handleCopy(m); setMenuForId(null); }}>
                                      <FiCopy size={14} /> Copy
                                    </button>
                                  )}
                                  {mine && !deleted && m.type === "text" && (
                                    <button type="button" onClick={() => startEdit(m)}>
                                      <FiEdit2 size={14} /> Edit message
                                    </button>
                                  )}
                                  {!deleted && (
                                    <button type="button" onClick={() => { setForwardTarget(m); setForwardOpen(true); setMenuForId(null); }}>
                                      <FiShare2 size={14} /> Forward
                                    </button>
                                  )}
                                  <button type="button" onClick={() => { handleStar(m); setMenuForId(null); }}>
                                    <FiStar size={14} /> {Array.isArray(m.starredBy) && m.starredBy.includes(currentUser?.id) ? "Remove star" : "Star"}
                                  </button>
                                  <button type="button" onClick={() => { setInfoFor(m); setMenuForId(null); }}>
                                    <FiInfo size={14} /> Message information
                                  </button>
                                  {!deleted && (
                                    <button type="button" onClick={() => { handleReport(m); setMenuForId(null); }}>
                                      <FiFlag size={14} /> Report
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className={mine ? "msg-menu-danger" : ""}
                                    onClick={() => {
                                      setDeleteRequest({ ids: [m._id], multiple: false, onlyMe: !mine });
                                      setMenuForId(null);
                                    }}
                                  >
                                    <FiTrash2 size={14} /> {mine ? "Delete message" : "Delete for me"}
                                  </button>
                                  <button type="button" onClick={() => { setSelectedIds([m._id]); setMenuForId(null); }}>
                                    <FiCheck size={14} /> Select more
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`msg-bubble ${mine ? "msg-bubble--mine" : "msg-bubble--theirs"}${selectable ? " msg-bubble--selectable" : ""}${isSelected ? " msg-bubble--selected" : ""}`}
                            onClick={selecting ? () => toggleSelect(m._id) : undefined}
                            role={selecting ? "checkbox" : undefined}
                            aria-checked={selecting ? isSelected : undefined}
                          >
                            {!deleted && m.forwarded && <div className="msg-forward-tag">Forwarded</div>}

                            {!deleted && m.parent && (
                              <QuoteBlock
                                senderName={m.parent.sender?.name}
                                content={m.parent.content}
                                attachmentKind={m.parent.type}
                                onClick={() => {
                                  if (!selecting) jumpToMessage(m.parent._id);
                                }}
                              />
                            )}

                            {deleted ? (
                              <div className="msg-deleted">This message was deleted</div>
                            ) : (
                              <>
                                {m.type === "image" && images.length > 0 && (
                                  <div className={`msg-images ${images.length > 1 ? "msg-images--multi" : ""}`}>
                                    {images.slice(0, 4).map((img, i) => (
                                      <img
                                        key={i}
                                        src={img.url}
                                        alt={img.name || "photo"}
                                        className="msg-bubble-image"
                                        onClick={() => {
                                          if (selecting) { toggleSelect(m._id); return; }
                                          setLightbox({ images: images.map((x) => x.url), index: i });
                                        }}
                                      />
                                    ))}
                                    {images.length > 4 && (
                                      <div className="msg-images-more" onClick={() => setLightbox({ images: images.map((x) => x.url), index: 4 })}>
                                        +{images.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {m.type === "video" && video && (
                                  <video controls src={video.url} className="msg-video" />
                                )}
                                {m.type === "audio" && audio && <VoiceMessagePlayer src={audio.url} />}
                                {m.type === "document" && doc && (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="msg-bubble-file" onClick={(e) => selecting && e.preventDefault()}>
                                    <FiFileText size={18} />
                                    <span className="msg-bubble-file-name">
                                      {doc.name || "Document"}
                                      <small>{formatFileSize(doc.size)}</small>
                                    </span>
                                    <FiDownload size={15} />
                                  </a>
                                )}
                                {m.type === "location" && (
                                  <a
                                    href={`https://www.google.com/maps?q=${m.location?.lat || 0},${m.location?.lng || 0}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="msg-location"
                                    onClick={(e) => selecting && e.preventDefault()}
                                  >
                                    <FiImage size={18} />
                                    <strong>{m.location?.label || "Location"}</strong>
                                    <small>{m.location?.lat?.toFixed?.(6)}, {m.location?.lng?.toFixed?.(6)}</small>
                                  </a>
                                )}
                                {m.type === "property" && <PropertyMessageCard property={m.property || null} />}
                                {m.content && <div className="msg-bubble-text"><Linkify text={m.content} /></div>}
                              </>
                            )}

                            {isSelected && (
                              <span className="msg-bubble-check">
                                <FiCheck size={14} />
                              </span>
                            )}

                            <span className="msg-bubble-time">
                              {!deleted && m.edited && <span className="msg-bubble-edited">Edited · </span>}
                              {formatTime(m.createdAt)}
                              {mine && (
                                <span className={`msg-tick ${m.read ? "msg-tick--read" : ""}`}>
                                  {m.read ? "✓✓" : m.deliveredAt || m.delivered ? "✓✓" : "✓"}
                                </span>
                              )}
                              {Array.isArray(m.starredBy) && m.starredBy.includes(currentUser?.id) && (
                                <FiStar size={11} className="msg-star-ind" />
                              )}
                            </span>
                          </div>

                          {!selecting && !deleted && (
                            <div className="msg-reactions-row">
                              <MessageReactions
                                reactions={reactions}
                                mine={myReaction}
                                onReact={(emoji) => handleReact(m._id, emoji)}
                                onOpenPicker={() => setEmojiFor(emojiFor === m._id ? null : m._id)}
                                disabled={false}
                              />
                              {emojiFor === m._id && (
                                <EmojiPicker
                                  onPick={(emoji) => {
                                    handleReact(m._id, myReaction === emoji ? "" : emoji);
                                    setEmojiFor(null);
                                  }}
                                  onClose={() => setEmojiFor(null)}
                                  className="emoji-picker--bubble"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {newMsgPill && (
                    <button type="button" className="msg-new-pill" onClick={() => scrollToBottom(true)}>
                      <FiChevronDown size={16} /> New messages
                    </button>
                  )}
                </>
              )}
            </div>

            {/* pending attachment previews */}
            {pendingAttachments.length > 0 && (
              <div className="msg-attach-strip">
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="msg-attach-preview">
                    {a.type === "file" ? (
                      <span className="msg-attach-file"><FiFileText size={16} /> {a.name}</span>
                    ) : a.type === "video" ? (
                      <video src={a.url} className="msg-attach-thumb" muted />
                    ) : (
                      <img src={a.url} alt={a.name} />
                    )}
                    <button type="button" onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
            {pendingLocation && (
              <div className="msg-attach-strip">
                <div className="msg-attach-preview msg-attach-loc">
                  📍 {pendingLocation.label}
                  <button type="button" onClick={() => setPendingLocation(null)}>×</button>
                </div>
              </div>
            )}
            {pendingProperty && (
              <div className="msg-attach-strip">
                <div className="msg-attach-preview msg-attach-prop">
                  🏠 {pendingProperty.title}
                  <button type="button" onClick={() => setPendingProperty(null)}>×</button>
                </div>
              </div>
            )}

            {editingMessage ? (
              <div className="msg-edit-bar">
                <div className="msg-edit-bar-head">
                  <FiEdit2 size={14} />
                  <span>Edit message</span>
                  <button type="button" className="msg-edit-cancel" onClick={cancelEdit} aria-label="Cancel edit" title="Cancel (Esc)">
                    <FiX size={18} />
                  </button>
                </div>
                <div className="msg-edit-bar-row">
                  <input
                    className="msg-edit-input"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                    }}
                    placeholder="Edit message…"
                    autoFocus
                  />
                  <button type="button" className="msg-edit-save" onClick={handleEditSave} disabled={!editDraft.trim() || savingEdit} aria-label="Save edit" title="Save (Enter)">
                    <FiCheck size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="msg-composer">
                {replyTarget && (
                  <div className="msg-reply-preview">
                    <QuoteBlock senderName={replyTarget.sender?.name} content={replyTarget.content} attachmentKind={replyTarget.type} onClick={() => jumpToMessage(replyTarget._id)} />
                    <button type="button" className="msg-reply-cancel" onClick={() => setReplyTarget(null)} aria-label="Cancel reply" title="Cancel reply">
                      <FiX size={16} />
                    </button>
                  </div>
                )}
                <div className="msg-composer-bar">
                  <button type="button" className={`msg-composer-emoji ${emojiFor === "composer" ? "is-active" : ""}`} onClick={() => setEmojiFor(emojiFor === "composer" ? null : "composer")} title="Emoji" aria-label="Emoji">
                    <FiSmile size={20} />
                  </button>
                  {emojiFor === "composer" && (
                    <EmojiPicker onPick={handlePickEmoji} onClose={() => setEmojiFor(null)} className="emoji-picker--composer" />
                  )}
                  <button
                    type="button"
                    className="msg-composer-attach"
                    onClick={() => setAttachOpen((o) => !o)}
                    disabled={uploading}
                    title="Attach"
                    aria-label="Attach"
                  >
                    <FiPaperclip size={20} />
                  </button>
                  {attachOpen && (
                    <AttachmentMenu
                      onOpenChange={setAttachOpen}
                      onClose={() => setAttachOpen(false)}
                      onPick={(kind) => {
                        if (kind === "photos") handlePickFile();
                        if (kind === "videos") handlePickVideo();
                        if (kind === "documents") handlePickDoc();
                        if (kind === "location") shareLocation();
                        if (kind === "property") openShareProps();
                      }}
                    />
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: "none" }} />
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideo} style={{ display: "none" }} />
                  <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,text/plain" onChange={handleDoc} style={{ display: "none" }} />

                  <textarea
                    className="msg-composer-input"
                    placeholder={uploading ? "Uploading…" : "Type a message…"}
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={uploading}
                  />

                  {draft.trim() || pendingAttachments.length > 0 || pendingLocation || pendingProperty ? (
                    <button type="button" className="msg-composer-send" onClick={handleSend} disabled={uploading} title="Send">
                      <FiSend size={18} />
                    </button>
                  ) : (
                    <div className="msg-composer-mic">
                      <VoiceRecorder onSend={handleVoiceSend} uploading={uploading} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── overlays / dialogs ── */}
      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
      {infoFor && <MessageInfoModal message={infoFor} onClose={() => setInfoFor(null)} />}

      {deleteRequest && (
        <div className="msg-modal-overlay" onClick={() => !deleting && setDeleteRequest(null)}>
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{deleteRequest.ids.length > 1 ? `Delete ${deleteRequest.ids.length} messages?` : "Delete message?"}</h3>
            <p>
              {deleteRequest.onlyMe ? (
                <>This removes the {deleteRequest.ids.length > 1 ? "messages" : "message"} only from <strong>your</strong> view. The other person can still see {deleteRequest.ids.length > 1 ? "them" : "it"}.</>
              ) : (
                <><strong>Delete for me</strong> hides it only from your view. <strong>Delete for everyone</strong> replaces it with "This message was deleted" for both sides.</>
              )}
            </p>
            <div className="msg-modal-actions">
              <button type="button" className="msg-modal-btn" onClick={() => setDeleteRequest(null)} disabled={deleting}>Cancel</button>
              {deleteRequest.onlyMe ? (
                <button type="button" className="msg-modal-btn msg-modal-btn--danger" onClick={handleDeleteForMe} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete for me"}
                </button>
              ) : (
                <>
                  <button type="button" className="msg-modal-btn msg-modal-btn--warn" onClick={handleDeleteForMe} disabled={deleting}>Delete for me</button>
                  <button type="button" className="msg-modal-btn msg-modal-btn--danger" onClick={handleDeleteEveryone} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete for everyone"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* clear chat confirm */}
      {confirmClear && (
        <div className="msg-modal-overlay" onClick={() => setConfirmClear(false)}>
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear this chat?</h3>
            <p>This removes the messages from <strong>your</strong> view only. The other person keeps their copy of the conversation.</p>
            <div className="msg-modal-actions">
              <button type="button" className="msg-modal-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button type="button" className="msg-modal-btn msg-modal-btn--danger" onClick={handleClearChat}>Clear Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* block / unblock confirm */}
      {confirmBlock && (
        <div className="msg-modal-overlay" onClick={() => !blockBusy && setConfirmBlock(false)}>
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{otherIsBlocked ? "Unblock this user?" : "Block this user?"}</h3>
            <p>
              {otherIsBlocked
                ? "You'll be able to message each other again."
                : "Neither of you will be able to send messages in this chat until you unblock them."}
            </p>
            <div className="msg-modal-actions">
              <button type="button" className="msg-modal-btn" onClick={() => setConfirmBlock(false)} disabled={blockBusy}>Cancel</button>
              <button type="button" className="msg-modal-btn msg-modal-btn--danger" onClick={handleToggleBlock} disabled={blockBusy}>
                {blockBusy ? "Please wait…" : otherIsBlocked ? "Unblock" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* forward dialog */}
      {forwardOpen && (
        <div className="msg-modal-overlay" onClick={() => setForwardOpen(false)}>
          <div className="msg-modal msg-modal--forward" onClick={(e) => e.stopPropagation()}>
            <h3>Forward message</h3>
            <p className="msg-forward-target">{forwardTarget?.content || messagePreview(forwardTarget)}</p>
            <div className="msg-forward-list">
              {conversations.filter((c) => c._id !== activeId).map((c) => (
                  <button key={c._id} type="button" className="msg-forward-item" onClick={() => setForwardTarget((t) => ({ ...(t || {}), _fwd: true }))}>
                    <span className="msg-conv-avatar msg-conv-avatar--sm">{conversationInitial(c, currentUser?.id)}</span>
                    <span>{conversationTitle(c, currentUser?.id)}</span>
                  </button>
                ))}
            </div>
            <div className="msg-modal-actions">
              <button type="button" className="msg-modal-btn" onClick={() => setForwardOpen(false)}>Cancel</button>
              <button type="button" className="msg-modal-btn msg-modal-btn--primary" onClick={handleForward} disabled={!conversations.some((c) => c._id !== activeId)}>
                Forward to {conversations.filter((c) => c._id !== activeId).length} chat{conversations.filter((c) => c._id !== activeId).length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* property share dialog */}
      {sharePropsOpen && (
        <div className="msg-modal-overlay" onClick={() => setSharePropsOpen(false)}>
          <div className="msg-modal msg-modal--forward" onClick={(e) => e.stopPropagation()}>
            <h3>Share a property</h3>
            {propQuery.isLoading ? (
              <div className="msg-share-note">Loading properties…</div>
            ) : propQuery.properties.length === 0 ? (
              <div className="msg-share-note">No properties available to share right now.</div>
            ) : (
              <div className="msg-share-list">
                {propQuery.properties.filter((p) => p.status === "active").slice(0, 20).map((p) => (
                  <button key={p._id || p.id} type="button" className="msg-share-item" onClick={() => pickProperty(p)}>
                    {p.photos?.[0] ? <img src={p.photos[0]} alt="" /> : <span className="msg-conv-avatar msg-conv-avatar--sm">🏠</span>}
                    <span className="msg-share-item-meta">
                      <strong>{p.title}</strong>
                      <small>{p.location?.area}, {p.location?.city}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="msg-modal-actions">
              <button type="button" className="msg-modal-btn" onClick={() => setSharePropsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* small pure helpers used in JSX above */
const conversationTitle = (conversation, currentUserId) => {
  const other = getOtherParticipant(conversation, currentUserId);
  return other?.name || "Unknown user";
};
const conversationInitial = (conversation, currentUserId) => {
  const t = conversationTitle(conversation, currentUserId);
  return (t || "?").charAt(0).toUpperCase();
};

export default Messages;