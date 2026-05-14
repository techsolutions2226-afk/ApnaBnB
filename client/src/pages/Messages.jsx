/* ─── Messages — In-platform messaging system ───
   Conversation list + chat panel. Supports all 3 connection types:
   seller↔buyer, dealer↔buyer, dealer↔dealer.
   Frontend-only demo — messages stored in local state.
   ─────────────────────────────────────────────── */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConversations, useMessages, useSendMessage } from "../hooks/useMessages";
import Breadcrumb from "../components/common/Breadcrumb";
import SearchInput from "../components/common/SearchInput";
import "../styles/Message.css";
import "../styles/Dashboard.css"; /* breadcrumb styles */

/* ══════════════════════════════════════
   HELPERS
   ══════════════════════════════════════ */

const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
};

/** Format timestamp to short time string */
const formatTime = (ts) => {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
};

/** Format timestamp to relative date for sidebar */
const formatRelativeDate = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return formatTime(ts);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Format date for message date separators */
const formatDateSep = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

/** Get date key for grouping messages */
const getDateKey = (ts) => new Date(ts).toLocaleDateString();

/* ══════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════ */

const Messages = () => {
  const { currentUser, getDashboardPath } = useAuth();
  const userId = currentUser?.id;

  /* ── State ── */
  const [activeConvId, setActiveConvId] = useState(null);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  /* ── Load conversations for current user ── */
  const { conversations = [], isLoading: convsLoading, error: convsError, refetch: refetchConversations } = useConversations();

  /* ── Load messages for active conversation ── */
  const { messages = [], isLoading: msgsLoading, error: msgsError, refetch: refetchMessages } = useMessages(activeConvId);

  /* ── Poll for new messages while page is visible.
        Conversations list refreshed every 10s; active chat every 5s.
        Refetch callbacks are stored in refs so the polling effect
        doesn't tear down on every parent render. ── */
  const refetchConversationsRef = useRef(refetchConversations);
  const refetchMessagesRef = useRef(refetchMessages);
  useEffect(() => {
    refetchConversationsRef.current = refetchConversations;
  }, [refetchConversations]);
  useEffect(() => {
    refetchMessagesRef.current = refetchMessages;
  }, [refetchMessages]);

  useEffect(() => {
    if (!userId) return undefined;

    let convInterval = null;
    let msgInterval = null;

    const startPolling = () => {
      if (document.hidden) return;
      if (!convInterval) {
        convInterval = setInterval(() => refetchConversationsRef.current(), 10000);
      }
      if (activeConvId && !msgInterval) {
        msgInterval = setInterval(() => refetchMessagesRef.current(), 5000);
      }
    };

    const stopPolling = () => {
      if (convInterval) {
        clearInterval(convInterval);
        convInterval = null;
      }
      if (msgInterval) {
        clearInterval(msgInterval);
        msgInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refetchConversationsRef.current();
        if (activeConvId) refetchMessagesRef.current();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, activeConvId]);

  /* ── Send message hook ── */
  const { send: sendMessageAPI, isLoading: isSending, error: sendError } = useSendMessage();

  /* ── Sort conversations by most recent message ── */
  const sortedConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    return [...conversations].sort(
      (a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0)
    );
  }, [conversations]);

  /* ── Build a user cache for all participants ── */
  const userCache = useMemo(() => {
    const cache = {};
    sortedConversations.forEach((conv) => {
      conv.participants?.forEach((participant) => {
        if (participant._id && !cache[participant._id]) {
          cache[participant._id] = participant;
        }
      });
    });
    return cache;
  }, [sortedConversations]);

  /* ── Build property cache ── */
  const propertyCache = useMemo(() => {
    const cache = {};
    sortedConversations.forEach((conv) => {
      if (conv.property && !cache[conv.property._id]) {
        cache[conv.property._id] = conv.property;
      }
    });
    return cache;
  }, [sortedConversations]);

  /* ── Get the "other" participant for a conversation ── */
  const getOtherUser = useCallback(
    (conv) => {
      const otherId = conv.participants?.find((p) => p._id !== userId)?._id;
      return otherId ? userCache[otherId] : null;
    },
    [userId, userCache]
  );

  /* ── Filter conversations by search ── */
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return sortedConversations;
    const q = search.trim().toLowerCase();
    return sortedConversations.filter((conv) => {
      const other = getOtherUser(conv);
      const otherName = other
        ? `${other.firstName} ${other.lastName}`.toLowerCase()
        : "";
      const prop = propertyCache[conv.property?._id];
      const propTitle = prop ? prop.title.toLowerCase() : "";
      const lastMsg = conv.lastMessage?.toLowerCase() || "";
      return (
        otherName.includes(q) ||
        propTitle.includes(q) ||
        lastMsg.includes(q)
      );
    });
  }, [sortedConversations, search, getOtherUser, propertyCache]);

  /* ── Active conversation ── */
  const activeConv = useMemo(
    () => sortedConversations.find((c) => c._id === activeConvId) || null,
    [sortedConversations, activeConvId]
  );

  /* ── Group messages by date ── */
  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDateKey = null;
    messages.forEach((msg) => {
      const dk = new Date(msg.createdAt || msg.timestamp).toLocaleDateString();
      if (dk !== lastDateKey) {
        groups.push({ type: "date", date: msg.createdAt || msg.timestamp });
        lastDateKey = dk;
      }
      groups.push({ type: "message", ...msg });
    });
    return groups;
  }, [messages]);

  /* ── Auto-scroll to bottom when messages change ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupedMessages]);

  /* ── Auto-select first conversation if none selected ── */
  useEffect(() => {
    if (!activeConvId && sortedConversations.length > 0) {
      setActiveConvId(sortedConversations[0]._id);
    }
  }, [activeConvId, sortedConversations]);

  /* ── Handlers ── */
  const handleSelectConv = useCallback((convId) => {
    setActiveConvId(convId);
    setNewMessage("");
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !activeConvId || isSending) return;

    try {
      await sendMessageAPI(activeConvId, newMessage.trim());
      setNewMessage("");
      // Refetch messages after successful send
      setTimeout(() => refetchMessages(), 300);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [newMessage, activeConvId, isSending, sendMessageAPI, refetchMessages]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /* ── Determine mobile view mode ── */
  const showChat = activeConvId !== null;

  /* ── Loading state ── */
  if (convsLoading) {
    return (
      <div className="msg-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Messages" },
          ]}
        />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

   /* ── Error state ── */
   if (convsError) {
     return (
       <div className="msg-page">
         <Breadcrumb
           items={[
             { label: "Home", to: "/" },
             { label: "Dashboard", to: getDashboardPath() },
             { label: "Messages" },
           ]}
         />
         <div style={{ padding: "40px", textAlign: "center", color: "#d32f2f" }}>
           <p>Error loading messages: {convsError}</p>
         </div>
       </div>
     );
   }

  /* ── No conversations at all ── */
  if (conversations.length === 0) {
    return (
      <div className="msg-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Messages" },
          ]}
        />

        <div className="msg-header">
          <h1 className="msg-title">Messages</h1>
          <p className="msg-subtitle">Your conversations will appear here.</p>
        </div>

      <div className="msg-container"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="msg-empty">
          <div className="msg-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="msg-empty-title">No conversations yet</h3>
          <p className="msg-empty-text">
            When you connect with buyers, sellers, or dealers, your conversations will appear here.
          </p>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="msg-page">
      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: getDashboardPath() },
          { label: "Messages" },
        ]}
      />

      <div className="msg-header">
        <h1 className="msg-title">Messages</h1>
        <p className="msg-subtitle">
          {sortedConversations.length} conversation{sortedConversations.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="msg-container">
        {/* ════════════════════════
           SIDEBAR — Conversation List
           ════════════════════════ */}
        <div className={`msg-sidebar${showChat ? " msg-sidebar--hidden" : ""}`}>
          <div className="msg-sidebar-header">
            <h2 className="msg-sidebar-title">Conversations</h2>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="msg-search-wrap"
            />
          </div>

          <div className="msg-conv-list">
            {filteredConversations.map((conv) => {
              const other = getOtherUser(conv);
              const otherName = other
                ? `${other.firstName} ${other.lastName}`
                : "Unknown";
              const otherInitial = other ? other.firstName.charAt(0) : "?";
              const unread = conv.unread?.[userId] || 0;
              const isActive = conv._id === activeConvId;

              const lastMsg = conv.lastMessage || "No messages yet";
              const lastTime = conv.lastMessageAt || conv.updatedAt || new Date().toISOString();

              return (
                <div
                  key={conv._id}
                  className={`msg-conv-item${isActive ? " msg-conv-item--active" : ""}`}
                  onClick={() => handleSelectConv(conv._id)}
                >
                  {other?.avatar ? (
                    <img
                      src={other.avatar}
                      alt={otherName}
                      className="msg-conv-avatar"
                    />
                  ) : (
                    <div className="msg-conv-avatar-fallback">{otherInitial}</div>
                  )}

                  <div className="msg-conv-content">
                    <div className="msg-conv-top">
                      <span className="msg-conv-name">{otherName}</span>
                      <span className="msg-conv-time">
                        {formatRelativeDate(lastTime)}
                      </span>
                    </div>
                    <div
                      className={`msg-conv-preview${unread > 0 ? " msg-conv-preview--unread" : ""}`}
                    >
                      {lastMsg}
                    </div>
                  </div>

                  {unread > 0 && (
                    <div className="msg-conv-unread">{unread}</div>
                  )}
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#717171", fontSize: 14 }}>
                No conversations match your search.
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════
           CHAT PANEL
           ════════════════════════ */}
        {activeConv ? (
          <div className={`msg-chat${!showChat ? " msg-chat--hidden" : ""}`}>
            {/* ── Chat Header ── */}
            {(() => {
              const other = getOtherUser(activeConv);
              const otherName = other
                ? `${other.firstName} ${other.lastName}`
                : "Unknown";
              const otherInitial = other ? other.firstName.charAt(0) : "?";
              const prop = propertyCache[activeConv.property?._id];

              return (
                <div className="msg-chat-header">
                  <button
                    className="msg-chat-back"
                    onClick={() => setActiveConvId(null)}
                    aria-label="Back to conversations"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  {other?.avatar ? (
                    <img
                      src={other.avatar}
                      alt={otherName}
                      className="msg-chat-avatar"
                    />
                  ) : (
                    <div className="msg-chat-avatar-fallback">
                      {otherInitial}
                    </div>
                  )}

                  <div className="msg-chat-info">
                    <h3 className="msg-chat-name">{otherName}</h3>
                    {prop && (
                      <div className="msg-chat-property">
                        Re:{" "}
                        <Link
                          to={`/property/${prop._id}`}
                          className="msg-chat-property-link"
                        >
                          {prop.title}
                        </Link>
                      </div>
                    )}
                  </div>

                  <span
                    className={`msg-chat-type msg-conv-type--${activeConv.type}`}
                  >
                    {TYPE_LABELS[activeConv.type] || activeConv.type}
                  </span>
                </div>
              );
            })()}

            {/* ── Messages Area ── */}
            {msgsLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, height: "200px" }}>
                <div className="auth-spinner" />
              </div>
            ) : msgsError ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#d32f2f" }}>
                Error loading messages: {msgsError}
              </div>
             ) : (
               <div className="msg-chat-messages">
                 {groupedMessages.map((item, idx) => {
                   if (item.type === "date") {
                     return (
                       <div key={`date-${idx}`} className="msg-date-sep">
                         {formatDateSep(item.date)}
                       </div>
                     );
                   }

                    const isMine = item.senderId?._id === userId || item.sender?._id === userId;
                    return (
                      <div
                        key={item._id || idx}
                        className={`msg-bubble-row msg-bubble-row--${isMine ? "mine" : "theirs"}`}
                      >
                        <div>
                          <div
                            className={`msg-bubble msg-bubble--${isMine ? "mine" : "theirs"}`}
                          >
                            {item.content || item.text}
                          </div>
                          <div className="msg-bubble-time">
                            {formatTime(item.createdAt || item.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
               })}
               <div ref={messagesEndRef} />
             </div>
             )}

             <div className="msg-chat-input-bar">
               <textarea
                 className="msg-chat-textarea"
                 placeholder="Type a message..."
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 onKeyDown={handleKeyDown}
                 disabled={isSending}
                 rows={1}
               />
               <button
                 className="msg-chat-send"
                 onClick={handleSend}
                 disabled={!newMessage.trim() || isSending}
                 aria-label="Send message"
               >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                 </svg>
               </button>
             </div>
          </div>
        ) : (
          /* ── No conversation selected (desktop) ── */
          <div className="msg-empty">
            <div className="msg-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="msg-empty-title">Select a conversation</h3>
            <p className="msg-empty-text">
              Choose a conversation from the sidebar to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
