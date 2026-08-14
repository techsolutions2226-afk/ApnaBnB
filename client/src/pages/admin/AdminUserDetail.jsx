import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiShieldOff,
  FiShield,
  FiTrash2,
  FiEdit2,
  FiUser,
  FiHome,
  FiFileText,
  FiLink,
} from "react-icons/fi";
import "../../styles/Admin.css";

/* ─── AdminUserDetail — user profile + their entire action history ─── */
const AdminUserDetail = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const user = data?.user;
  const counts = data?.activity;

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [detail, activity] = await Promise.all([
        adminService.getUser(id),
        adminService.getUserActivity(id, { page, limit: 15 }),
      ]);
      setData(detail);
      setLogs(activity.logs || []);
      setTotalLogs(activity.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  const doVerify = async () => {
    try {
      await adminService.verifyUser(id);
      toast.success("User verified");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to verify user");
    }
  };

  const doSuspend = async () => {
    try {
      await adminService.suspendUser(id);
      toast.success("User suspended");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to suspend user");
    }
  };

  const doDelete = async () => {
    try {
      await adminService.deleteUser(id);
      toast.success("User deleted");
      window.location.href = "/admin/users";
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  if (isLoading && !data) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Loading user…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="adm-page">
        <div className="adm-error">{error}</div>
        <Link to="/admin/users" className="adm-back-link">
          <FiArrowLeft size={14} /> Back to users
        </Link>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalLogs / 15));

  const statCards = [
    { icon: FiHome, label: "Properties", value: counts?.listings ?? 0 },
    { icon: FiFileText, label: "Requirements", value: counts?.requirements ?? 0 },
    { icon: FiLink, label: "Matches", value: counts?.matches ?? 0 },
  ];

  return (
    <div className="adm-page">
      <Link to="/admin/users" className="adm-back-link">
        <FiArrowLeft size={14} /> Back to users
      </Link>

      {/* Profile card */}
      <div className="adm-profile-card">
        <div className="adm-profile-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <span>{(user?.name || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="adm-profile-info">
          <div className="adm-profile-name-row">
            <h2 className="adm-profile-name">{user?.name}</h2>
            <StatusBadge status={user?.role} prefix="adm-badge" />
            {user?.suspended ? (
              <span className="adm-suspended-tag">
                <FiShieldOff size={13} /> Suspended
              </span>
            ) : user?.verified ? (
              <span className="adm-verified">
                <span className="adm-verified-dot" /> Verified
              </span>
            ) : (
              <span className="adm-unverified">
                <span className="adm-unverified-dot" /> Unverified
              </span>
            )}
          </div>
          <p className="adm-profile-email">{user?.email}</p>
          <p className="adm-profile-meta">
            Joined{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "—"}
            {user?.location ? ` · ${user.location}` : ""}
            {user?.phone ? ` · ${user.phone}` : ""}
          </p>
        </div>
        <div className="adm-profile-actions">
          {!user?.suspended ? (
            <button type="button" className="adm-btn adm-btn--outline" onClick={doSuspend}>
              <FiShield size={15} /> Suspend
            </button>
          ) : (
            <button type="button" className="adm-btn adm-btn--primary" onClick={doVerify}>
              <FiCheckCircle size={15} /> Reactivate
            </button>
          )}
          <button
            type="button"
            className="adm-btn adm-btn--danger"
            onClick={() => setDeleteOpen(true)}
          >
            <FiTrash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-userstats">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div className="adm-userstat" key={s.label}>
              <div className="adm-userstat-icon">
                <Icon size={18} />
              </div>
              <div className="adm-userstat-value">{s.value}</div>
              <div className="adm-userstat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Action history */}
      <div className="adm-card">
        <h3 className="adm-card-title">Action History</h3>
        <p className="adm-subtitle adm-card-sub">
          Every action this user has taken on the platform.
        </p>
        {logs.length === 0 ? (
          <p className="adm-empty">No recorded activity for this user yet.</p>
        ) : (
          <div className="adm-timeline">
            {logs.map((log) => (
              <div className="adm-timeline-item" key={log._id || log.id}>
                <div className="adm-timeline-dot" />
                <div className="adm-timeline-content">
                  <div className="adm-timeline-action">{log.action}</div>
                  {log.meta && (
                    <div className="adm-timeline-meta">
                      {Object.entries(log.meta).map(([k, v]) => (
                        <span key={k} className="adm-timeline-kv">
                          <strong>{k}:</strong>{" "}
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="adm-timeline-time">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                    {log.ip ? ` · IP ${log.ip}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={doDelete}
        title={`Delete ${user?.name || "user"}?`}
        message="This permanently removes the user and everything they created — properties, listings, requirements, matches and messages."
        confirmLabel="Delete user"
        variant="danger"
        icon={<FiTrash2 size={22} />}
      />
    </div>
  );
};

export default AdminUserDetail;