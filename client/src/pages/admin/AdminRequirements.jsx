import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import AdminRequirementEditor from "../../components/admin/AdminRequirementEditor";
import RefreshButton from "../../components/admin/RefreshButton";
import { formatPrice } from "../../utils/formatters";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "../../styles/Admin.css";

const REQ_STATUSES = ["active", "fulfilled", "closed"];

/* ─── AdminRequirements — requirements CRUD ─── */
const AdminRequirements = () => {
  const [requirements, setRequirements] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getRequirements({
        page,
        limit: 15,
        q: query || undefined,
        status: status || undefined,
      });
      setRequirements(data.requirements || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load requirements");
    } finally {
      setIsLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEdit = (req) => {
    setEditTarget(req);
  };

  const handleSaveRequirement = async (data) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminService.updateRequirement(editTarget._id || editTarget.id, data);
      toast.success("Requirement updated");
      setEditTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update requirement");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteRequirement(deleteTarget._id || deleteTarget.id);
      toast.success("Requirement deleted");
      setDeleteTarget(null);
      if (page > 1 && total === 1) setPage(page - 1);
      else fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete requirement");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Requirements</h1>
          <p className="adm-subtitle">Manage all buyer/dealer requirements on the platform.</p>
        </div>
        <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
      </div>

      <div className="adm-toolbar">
        <SearchInput
          value={query}
          onChange={(v) => {
            setPage(1);
            setQuery(v);
          }}
          placeholder="Search requirements…"
          rawEvent={false}
        />
        <select
          className="adm-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {REQ_STATUSES.map((s) => (
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
        ) : requirements.length === 0 ? (
          <p className="adm-empty">No requirements found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Posted By</th>
                <th>City</th>
                <th>Budget</th>
                <th>Type</th>
                <th>Status</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const rid = req._id || req.id;
                return (
                  <tr key={rid}>
                    <td>
                      <div className="adm-table-title">{req.title}</div>
                      <div className="adm-table-sub">
                        {req.location?.area || "—"}
                        {req.size ? ` · ${req.size}` : ""}
                      </div>
                    </td>
                    <td>
                      <div className="adm-table-title">{req.requiredBy?.name || "—"}</div>
                      <div className="adm-table-sub">{req.requiredBy?.email}</div>
                    </td>
                    <td>{req.location?.city || "—"}</td>
                    <td>
                      {req.budget
                        ? `${formatPrice(req.budget.min || 0, { prefix: true })} – ${formatPrice(
                            req.budget.max || 0,
                            { prefix: true }
                          )}`
                        : "—"}
                    </td>
                    <td>{req.propertyType || "—"}</td>
                    <td>
                      <StatusBadge status={req.status} prefix="adm-badge" />
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-action-icon"
                          title="Edit"
                          onClick={() => openEdit(req)}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="adm-action-icon adm-action-icon--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(req)}
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

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Requirement"
        size="large"
      >
        <AdminRequirementEditor
          requirement={editTarget}
          saving={saving}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveRequirement}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete requirement?`}
        message="This permanently removes the requirement and its related matches."
        confirmLabel="Delete"
        variant="danger"
        icon={<FiTrash2 size={22} />}
      />
    </div>
  );
};

export default AdminRequirements;