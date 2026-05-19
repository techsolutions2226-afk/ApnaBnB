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
import { FiSearch, FiPaperclip, FiSend, FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import messageService from "../services/messageService";
import uploadService from "../services/uploadService";
import "../styles/Messages.css";

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
  if (lastMessage.attachments?.length > 0 && !lastMessage.content) return "📷 Photo";
  if (lastMessage.attachments?.length > 0 && lastMessage.content) {
    return `📷 ${lastMessage.content}`;
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

  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeIdRef = useRef(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  /* ── Initial fetch + URL handling ──────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoadingConvs(true);

    const openFromUrl = async (list) => {
      const convId = searchParams.get("conversation");
      const withUser = searchParams.get("with");

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
    messageService
      .getMessages(activeId)
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data) ? data : []);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeId ? { ...c, unreadCount: 0 } : c)),
        );
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load messages");
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <header className="msg-chat-header">
              <button
                onClick={() => setActiveId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: window.innerWidth < 900 ? "inline-flex" : "none",
                }}
                aria-label="Back"
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
                  {getOtherParticipant(activeConv, currentUser?.id)?.role || ""}
                </div>
              </div>
            </header>

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
                  return (
                    <div
                      key={row.id}
                      className={`msg-bubble-row ${
                        mine ? "msg-bubble-row--mine" : ""
                      }`}
                    >
                      <div
                        className={`msg-bubble ${
                          mine ? "msg-bubble--mine" : "msg-bubble--theirs"
                        }`}
                      >
                        {m.attachments?.map((a, i) => (
                          <img
                            key={i}
                            src={a.url}
                            alt={a.name || "attachment"}
                            className="msg-bubble-image"
                            onClick={() => window.open(a.url, "_blank")}
                          />
                        ))}
                        {m.content && <div>{m.content}</div>}
                        <span className="msg-bubble-time">
                          {formatTime(m.createdAt)}
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
                    <img src={a.url} alt={a.name} />
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
              <textarea
                className="msg-composer-input"
                placeholder={
                  uploading ? "Uploading image…" : "Type a message…"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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
          </>
        )}
      </section>
    </div>
  );
};

export default Messages;
