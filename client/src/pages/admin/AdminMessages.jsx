import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { FiTrash2, FiMail } from "react-icons/fi";
import "../../styles/Admin.css";

/* ─── AdminMessages — all conversation messages (decrypted) + delete ─── */
const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getMessages({ page, limit: 15 });
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = messages;
    if (q) {
      list = list.filter(
        (m) =>
          (m.content || "").toLowerCase().includes(q) ||
          (m.sender?.name || "").toLowerCase().includes(q) ||
          (m.sender?.email || "").toLowerCase().includes(q)
      );
    }
    // Server already returns newest-first; keep as-is.
    return list;
  }, [messages, query]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteMessage(deleteTarget._id || deleteTarget.id);
      toast.success("Message deleted");
      setDeleteTarget(null);
      if (page > 1 && total === 1) setPage(page - 1);
      else fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete message");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">Messages</h1>
        <p className="adm-subtitle">
          All platform conversation messages, decrypted for review.
        </p>
      </div>

      <div className="adm-toolbar">
        <SearchInput
          value={query}
          onChange={(v) => setQuery(v)}
          placeholder="Search message text, sender name or email…"
          rawEvent={false}
        />
      </div>

      <div className="adm-table-wrap">
        {isLoading ? (
          <div className="adm-loading">Loading…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : filtered.length === 0 ? (
          <p className="adm-empty">No messages found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Message</th>
                <th>Attachments</th>
                <th>Read</th>
                <th>Sent</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const mid = m._id || m.id;
                const attachments = Array.isArray(m.attachments) ? m.attachments : [];
                return (
                  <tr key={mid} className={!m.read ? "adm-row--unread" : ""}>
                    <td>
                      <div className="adm-table-title">{m.sender?.name || "Unknown"}</div>
                      <div className="adm-table-sub">
                        <StatusBadge status={m.sender?.role} prefix="adm-badge" />
                      </div>
                    </td>
                    <td className="adm-msg-cell">
                      <span className="adm-msg-content">
                        {m.content || <em className="adm-msg-empty">[attachment only]</em>}
                      </span>
                    </td>
                    <td>
                      {attachments.length > 0 ? (
                        <span className="adm-attachments">{attachments.length} file(s)</span>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td>
                      {m.read ? (
                        <span className="adm-active-tag">Read</span>
                      ) : (
                        <span className="adm-unread-tag">Unread</span>
                      )}
                    </td>
                    <td>
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-action-icon adm-action-icon--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

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
    </div>
  );
};

export default AdminMessages;