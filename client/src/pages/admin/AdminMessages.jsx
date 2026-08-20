import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import { FiMail, FiTrash2, FiLock, FiMessageSquare } from "react-icons/fi";
import RefreshButton from "../../components/admin/RefreshButton";
import "../../styles/Admin.css";

/* ── AdminMessages — WhatsApp-style conversation review ──
   Left pane: all conversations (Alyan Shahbaz ↔ Zaid Abdullah).
   Right pane: the full decrypted thread as chat bubbles. Admin is read-only
   (no composer) but can delete an individual message on hover. */

const convoTitle = (participants = []) => {
  const names = participants.map((p) => p.name).filter(Boolean);
  return names.length > 1 ? names.join("  ↔  ") : names[0] || "Unknown conversation";
};

const convoAvatarText = (participants = []) => {
  const p = participants[0];
  return p?.name?.trim()?.[0]?.toUpperCase() || "?";
};

const AdminMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [query, setQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [convoDeleteTarget, setConvoDeleteTarget] = useState(null);

  const fetchConversations = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const data = await adminService.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load conversations");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openThread = useCallback(async (id) => {
    setSelectedId(id);
    setThread(null);
    setIsLoadingThread(true);
    try {
      const data = await adminService.getConversationMessages(id);
      setThread(data);
    } catch (err) {
      toast.error(err.message || "Failed to load conversation");
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        convoTitle(c.participants).toLowerCase().includes(q) ||
        (c.lastMessage?.content || "").toLowerCase().includes(q) ||
        (c.lastMessage?.sender?.name || "").toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteMessage(deleteTarget._id || deleteTarget.id);
      toast.success("Message deleted");
      setDeleteTarget(null);
      if (selectedId) {
        const data = await adminService.getConversationMessages(selectedId);
        setThread(data);
      }
      fetchConversations();
    } catch (err) {
      toast.error(err.message || "Failed to delete message");
    }
  };

  const doDeleteConvo = async () => {
    if (!convoDeleteTarget) return;
    try {
      await adminService.deleteConversation(convoDeleteTarget.id);
      toast.success("Conversation deleted");
      setConvoDeleteTarget(null);
      if (selectedId === convoDeleteTarget.id) {
        setSelectedId(null);
        setThread(null);
      }
      fetchConversations();
    } catch (err) {
      toast.error(err.message || "Failed to delete conversation");
    }
  };

  const threadTitle = thread?.conversation?.participants
    ? convoTitle(thread.conversation.participants)
    : "";

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Messages</h1>
          <p className="adm-subtitle">
            Conversations on the platform. Click a chat to read it —{" "}
            <FiLock size={11} style={{ verticalAlign: -1 }} /> admin view is
            read-only (admin cannot send messages).
          </p>
        </div>
        <RefreshButton onRefresh={fetchConversations} refreshing={isLoadingList} />
      </div>

      {/* Two-pane chat layout */}
      <div className="adm-chat">
        {/* Left: conversation list */}
        <aside className="adm-chat-list">
          <div className="adm-chat-search">
            <SearchInput
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="Search conversations…"
              rawEvent={false}
            />
          </div>
          <div className="adm-chat-convos">
            {isLoadingList ? (
              <div className="adm-loading">Loading…</div>
            ) : error ? (
              <div className="adm-error">{error}</div>
            ) : filtered.length === 0 ? (
              <p className="adm-empty">No conversations found.</p>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId;
                const lastMsg = c.lastMessage;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    className={`adm-chat-item${active ? " adm-chat-item--active" : ""}`}
                    onClick={() => openThread(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openThread(c.id);
                      }
                    }}
                  >
                    <span className="adm-chat-avatar">{convoAvatarText(c.participants)}</span>
                    <span className="adm-chat-item-body">
                      <span className="adm-chat-item-top">
                        <span className="adm-chat-item-name">{convoTitle(c.participants)}</span>
                        <span className="adm-chat-item-msgcount">
                          {c.messageCount}
                        </span>
                      </span>
                      <span className="adm-chat-item-preview">
                        {lastMsg
                          ? `${lastMsg.sender?.name || "…"}: ${lastMsg.content || "[attachment]"}`
                          : "No messages yet"}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="adm-chat-item-del"
                      title="Delete this conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConvoDeleteTarget(c);
                      }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: message thread */}
        <section className="adm-chat-thread">
          {!selectedId || !threadTitle ? (
            <div className="adm-chat-empty">
              <FiMessageSquare size={40} />
              <p>Select a conversation to read the messages.</p>
            </div>
          ) : (
            <>
              <header className="adm-chat-thread-header">
                <span className="adm-chat-avatar">{threadTitle.charAt(0).toUpperCase()}</span>
                <div>
                  <h3 className="adm-chat-thread-title">{threadTitle}</h3>
                  <span className="adm-chat-thread-sub">
                    {thread?.conversation?.participants?.length || 0} participant(s) ·{" "}
                    {thread?.messages?.length || 0} message(s)
                  </span>
                </div>
              </header>

              <div className="adm-chat-bubbles">
                {isLoadingThread ? (
                  <div className="adm-loading">Loading conversation…</div>
                ) : !thread || thread.messages.length === 0 ? (
                  <p className="adm-empty">No messages in this conversation.</p>
                ) : (
                  thread.messages.map((m, i) => {
                    const prev = thread.messages[i - 1];
                    const showSender = !prev || prev.senderId !== m.senderId;
                    const alignRight =
                      m.senderId === thread.conversation?.participants?.[0]?.id;
                    const attachments = Array.isArray(m.attachments) ? m.attachments : [];
                    return (
                      <div
                        key={m._id || m.id}
                        className={`adm-bubble-row${alignRight ? " adm-bubble-row--right" : ""}`}
                      >
                        <div
                          className={`adm-bubble${alignRight ? " adm-bubble--right" : ""}`}
                        >
                          {showSender && (
                            <div className="adm-bubble-meta">
                              <span className="adm-bubble-sender">{m.sender?.name || "Unknown"}</span>
                              <StatusBadge status={m.sender?.role} prefix="adm-badge" />
                            </div>
                          )}
                          <div className="adm-bubble-content">
                            {m.content || (
                              <em className="adm-msg-empty">[attachment only]</em>
                            )}
                            {attachments.length > 0 && (
                              <div className="adm-bubble-files">
                                {attachments.map((a, ai) => (
                                  <a
                                    key={ai}
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="adm-bubble-file"
                                  >
                                    📎 {a.name || "Attachment"}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="adm-bubble-time">
                              {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                              {!m.read ? " · unread" : ""}
                            </div>
                          </div>
                          <div className="adm-bubble-actions">
                            <button
                              type="button"
                              className="adm-bubble-del"
                              title="Delete message"
                              onClick={() => setDeleteTarget(m)}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete message?"
        message="This permanently removes this message for everyone in the conversation."
        confirmLabel="Delete message"
        variant="danger"
        icon={<FiMail size={22} />}
      />

      <ConfirmDialog
        isOpen={!!convoDeleteTarget}
        onClose={() => setConvoDeleteTarget(null)}
        onConfirm={doDeleteConvo}
        title="Delete conversation?"
        message={
          <>
            Delete the chat{" "}
            <strong>
              {convoDeleteTarget ? convoTitle(convoDeleteTarget.participants) : ""}
            </strong>
            ? Every message in it will be permanently removed.
          </>
        }
        confirmLabel="Delete chat"
        variant="danger"
        icon={<FiMessageSquare size={22} />}
      />
    </div>
  );
};

export default AdminMessages;