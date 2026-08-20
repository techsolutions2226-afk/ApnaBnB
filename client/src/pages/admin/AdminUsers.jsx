import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import RefreshButton from "../../components/admin/RefreshButton";
import { FiEye, FiEdit2, FiTrash2, FiCheckCircle, FiShieldOff, FiUserPlus, FiShield, FiXCircle } from "react-icons/fi";
import "../../styles/Admin.css";

const ROLES = ["seller", "buyer", "dealer"];

const EMPTY_FORM = { name: "", email: "", password: "", role: "buyer" };

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // { ... , _id }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsers({
        page,
        limit: 15,
        q: query || undefined,
        role: role || undefined,
        verified: verified ? verified : undefined,
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, query, role, verified]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    setPage(1);
    setQuery(e.target.value);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "" });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await adminService.updateUser(editUser._id || editUser.id, payload);
        toast.success("User updated");
      } else {
        if (!form.password) {
          toast.error("A password is required for new users");
          return;
        }
        await adminService.createUser(form);
        toast.success("User created");
      }
      setCreateOpen(false);
      setEditUser(null);
      if (page > 1 && users.length === 1) setPage(page - 1);
      else fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const doVerify = async (id) => {
    try {
      await adminService.verifyUser(id);
      toast.success("User verified");
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to verify user");
    }
  };

  const doSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await adminService.suspendUser(suspendTarget._id || suspendTarget.id, suspendReason);
      toast.success("User suspended");
      setSuspendTarget(null);
      setSuspendReason("");
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to suspend user");
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteUser(deleteTarget._id || deleteTarget.id);
      toast.success("User deleted");
      setDeleteTarget(null);
      if (page > 1 && users.length === 1) setPage(page - 1);
      else fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Users</h1>
          <p className="adm-subtitle">Manage every account on the platform.</p>
        </div>
        <RefreshButton onRefresh={fetchUsers} refreshing={isLoading} />
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar">
        <SearchInput
          value={query}
          onChange={handleSearch}
          placeholder="Search by name or email…"
          rawEvent={false}
        />
        <div className="adm-select-row">
          <select
            className="adm-select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="adm-select"
            value={verified}
            onChange={(e) => {
              setVerified(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <button type="button" className="adm-btn adm-btn--primary" onClick={openCreate}>
            <FiUserPlus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="adm-table-wrap">
        {isLoading ? (
          <div className="adm-loading">Loading users…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : users.length === 0 ? (
          <p className="adm-empty">No users found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Suspended</th>
                <th>Joined</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const uid = user._id || user.id;
                return (
                  <tr key={uid} className={user.suspended ? "adm-row--suspended" : ""}>
                    <td>
                      <div className="adm-user-cell">
                        <div className="adm-user-avatar-fallback">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="adm-user-info">
                          <span className="adm-user-name">{user.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={user.role} prefix="adm-badge" />
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {user.verified ? (
                        <span className="adm-verified">
                          <span className="adm-verified-dot" /> Verified
                        </span>
                      ) : (
                        <span className="adm-unverified">
                          <span className="adm-unverified-dot" /> Unverified
                        </span>
                      )}
                    </td>
                    <td>
                      {user.suspended ? (
                        <span className="adm-suspended-tag">
                          <FiShieldOff size={13} /> Suspended
                        </span>
                      ) : (
                        <span className="adm-active-tag">Active</span>
                      )}
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <Link
                          to={`/admin/users/${uid}`}
                          className="adm-action-icon"
                          title="View profile & activity"
                        >
                          <FiEye size={15} />
                        </Link>
                        <button
                          type="button"
                          className="adm-action-icon"
                          title="Edit"
                          onClick={() => openEdit(user)}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        {!user.suspended ? (
                          <button
                            type="button"
                            className="adm-action-icon"
                            title="Suspend"
                            onClick={() => {
                              setSuspendTarget(user);
                              setSuspendReason("");
                            }}
                          >
                            <FiShield size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adm-action-icon"
                            title="Verify & un-suspend"
                            onClick={() => doVerify(uid)}
                          >
                            <FiCheckCircle size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="adm-action-icon adm-action-icon--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(user)}
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

      {/* Add / edit modal */}
      <Modal
        isOpen={createOpen || !!editUser}
        onClose={() => {
          setCreateOpen(false);
          setEditUser(null);
        }}
        title={editUser ? "Edit User" : "Add User"}
        size="small"
      >
        <div className="adm-form">
          <label className="adm-form-label">
            Name
            <input
              className="adm-form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </label>
          <label className="adm-form-label">
            Email
            <input
              className="adm-form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com"
            />
          </label>
          <label className="adm-form-label">
            Role
            <select
              className="adm-form-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-form-label">
            {editUser ? "New password (optional)" : "Password"}
            <input
              className="adm-form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editUser ? "Leave blank to keep current" : "Account password"}
            />
          </label>
          <div className="adm-form-actions">
            <button
              type="button"
              className="adm-btn"
              onClick={() => {
                setCreateOpen(false);
                setEditUser(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : editUser ? "Save changes" : "Create user"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Suspend modal */}
      <Modal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name || "user"}?`}
        size="small"
      >
        <p className="adm-modal-note">
          Suspended users are blocked from logging in. Their account stays intact
          and can be re-activated anytime.
        </p>
        <label className="adm-form-label">
          Reason (optional)
          <input
            className="adm-form-input"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. reported spam / policy violation"
          />
        </label>
        <div className="adm-form-actions">
          <button type="button" className="adm-btn" onClick={() => setSuspendTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--danger"
            onClick={doSuspend}
          >
            Suspend
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete ${deleteTarget?.name || "user"}?`}
        message="This permanently removes the user and everything they created — properties, listings, requirements, matches and messages."
        confirmLabel="Delete user"
        variant="danger"
        icon={<FiXCircle size={22} />}
      />
    </div>
  );
};

export default AdminUsers;