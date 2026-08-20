import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { FiTrash2, FiExternalLink } from "react-icons/fi";
import RefreshButton from "../../components/admin/RefreshButton";
import "../../styles/Admin.css";

const MATCH_TYPES = ["seller-buyer", "dealer-buyer", "dealer-dealer", "seller-dealer"];
const MATCH_STATUSES = ["pending", "accepted", "rejected", "closed"];

/* ─── AdminMatches — platform-wide matches. View + delete only (the match
   engine, scores, and logic are intentionally never modified here). ─── */
const AdminMatches = () => {
  const [matches, setMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getMatches({
        page,
        limit: 15,
        type: type || undefined,
        status: status || undefined,
      });
      setMatches(data.matches || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load matches");
    } finally {
      setIsLoading(false);
    }
  }, [page, type, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteMatch(deleteTarget._id || deleteTarget.id);
      toast.success("Match deleted");
      setDeleteTarget(null);
      if (page > 1 && total === 1) setPage(page - 1);
      else fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete match");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  const scoreColor = (score) => {
    if (score >= 80) return "#1a8f5a";
    if (score >= 60) return "#e1a100";
    return "#b91c1c";
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Matches</h1>
          <p className="adm-subtitle">
            Every property↔requirement match on the platform. Read-only analytics —
            deleting a match never touches the matching engine.
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
      </div>

      <div className="adm-toolbar">
        <select
          className="adm-select"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All match types</option>
          {MATCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/-/g, " ↔ ")}
            </option>
          ))}
        </select>
        <select
          className="adm-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {MATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-table-wrap">
        {isLoading ? (
          <div className="adm-loading">Loading…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : matches.length === 0 ? (
          <p className="adm-empty">No matches found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Requirement</th>
                <th>Type</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const mid = match._id || match.id;
                const prop = match.property;
                const req = match.requirement;
                return (
                  <tr key={mid}>
                    <td>
                      <div className="adm-table-title">
                        {prop?.title || "—"}
                      </div>
                      <div className="adm-table-sub">
                        {prop?.location ? `${prop.location.area}, ${prop.location.city}` : ""}
                      </div>
                    </td>
                    <td>
                      <div className="adm-table-title">{req?.title || "—"}</div>
                      <div className="adm-table-sub">
                        {req?.requiredBy?.name ? `By ${req.requiredBy.name}` : ""}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={match.type} prefix="adm-badge" />
                    </td>
                    <td>
                      <span
                        className="adm-score"
                        style={{ color: scoreColor(match.score || 0) }}
                      >
                        {match.score || 0}%
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={match.status} prefix="adm-badge" />
                    </td>
                    <td>
                      {match.createdAt
                        ? new Date(match.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="adm-actions">
                        {prop?._id && (
                          <Link
                            to={`/property/${prop._id}`}
                            className="adm-action-icon"
                            title="View property"
                            target="_blank"
                          >
                            <FiExternalLink size={15} />
                          </Link>
                        )}
                        <button
                          type="button"
                          className="adm-action-icon adm-action-icon--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(match)}
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
        title="Delete match?"
        message="This removes the match record only. The property and requirement remain untouched, and the matching engine logic is not affected."
        confirmLabel="Delete match"
        variant="danger"
        icon={<FiTrash2 size={22} />}
      />
    </div>
  );
};

export default AdminMatches;