import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import RefreshButton from "../../components/common/RefreshButton";
import SelectCheckbox from "../../components/admin/SelectCheckbox";
import BulkActionBar from "../../components/admin/BulkActionBar";
import useRowSelection from "../../hooks/useRowSelection";
import useStickyOffset from "../../hooks/useStickyOffset";
import ColumnPicker from "../../components/admin/ColumnPicker";
import TruncatedCell from "../../components/admin/TruncatedCell";
import { USER_COLUMNS, DEFAULT_VISIBLE } from "../../config/adminUserColumns";
import { FiEye, FiEdit2, FiTrash2, FiCheckCircle, FiShieldOff, FiUserPlus, FiShield, FiXCircle, FiImage, FiUserCheck, FiUserX, FiCopy, FiCheck } from "react-icons/fi";
import "../../styles/Admin.css";

const ROLES = ["seller", "buyer", "dealer"];

const COLS_STORAGE_KEY = "adm_user_columns_v1";

/* Roughly how wide each column needs to be readable. Used only to give the
   table a sensible min-width so columns don't crush together when many are
   shown; the browser still does the real layout. */
const COL_WIDTH = 150;
const FIXED_WIDTH = 44 + 190; // checkbox + actions

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "buyer",
  phone: "",
  location: "",
  avatar: "",
  verified: false,
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState("");
  const [accountState, setAccountState] = useState(""); // "" | deactivated | suspended | active
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // { ... , _id }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [photoView, setPhotoView] = useState(null); // { name, avatar } for popup

  /* Persisted so an admin who works in, say, the security columns doesn't
     have to re-pick them every time they open the tab. */
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = localStorage.getItem(COLS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // Drop keys from an older build so a renamed column can't wedge the table.
      const valid = Array.isArray(parsed)
        ? parsed.filter((k) => USER_COLUMNS.some((c) => c.key === k))
        : null;
      return valid && valid.length ? valid : DEFAULT_VISIBLE;
    } catch {
      return DEFAULT_VISIBLE;
    }
  });

  const [expandedCell, setExpandedCell] = useState(null); // { label, value }
  const [copied, setCopied] = useState(false);
  const [activateTarget, setActivateTarget] = useState(null);

  const handleCopy = useCallback((text) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {
      // A full or blocked localStorage must not break the table.
    }
  }, [visibleCols]);

  /* Render in the config's order, not the order they were ticked, so the
     table's shape stays predictable. The pinned column is always included. */
  const shownColumns = useMemo(
    () => USER_COLUMNS.filter((c) => c.sticky || visibleCols.includes(c.key)),
    [visibleCols],
  );

  const tableMinWidth = FIXED_WIDTH + shownColumns.length * COL_WIDTH;

  // The frozen Name column is offset by the checkbox column's measured
  // width; a constant drifts by the collapsed border (see the hook).
  const [tableRef, stickyOffset] = useStickyOffset();

  const selection = useRowSelection(users);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
        // Server understands `deactivated` and `suspended` independently, so
        // one select can drive either without conflating the two states.
        deactivated:
          accountState === "deactivated"
            ? "true"
            : accountState === "active"
              ? "false"
              : undefined,
        suspended: accountState === "suspended" ? "true" : undefined,
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, query, role, verified, accountState]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // SearchInput is used with rawEvent={false}, so it hands us the value itself.
  const handleSearch = (value) => {
    setPage(1);
    setQuery(value);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "buyer",
      password: "",
      phone: user.phone || "",
      location: user.location || "",
      avatar: user.avatar || "",
      verified: !!user.verified,
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          phone: form.phone,
          location: form.location,
          avatar: form.avatar,
          verified: form.verified,
        };
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

  /* One action for "let this account back in", whatever is blocking it.

     A user can be self-deactivated AND admin-suspended at once, and the two
     are cleared by different endpoints. Doing both here means an admin never
     has to know which state applies — but they are still separate calls, so
     neither silently clears the other elsewhere in the app. */
  const doActivate = async (user) => {
    const uid = user._id || user.id;
    try {
      if (user.deactivated) await adminService.reactivateUser(uid);
      if (user.suspended) await adminService.unsuspendUser(uid);
      toast.success(`${user.name || "User"} can sign in again`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to activate this account");
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

  /* Run a per-user admin call across the selection.

     Sequential on purpose: these hit the same rows the audit log writes to,
     and firing 15 deletes at once has produced ordering surprises before.
     Failures are counted rather than thrown, so one bad row cannot silently
     abandon the rest of the batch. */
  const runBulk = async (fn, { verb, past }) => {
    const ids = selection.selected;
    if (!ids.length) return;
    setBulkBusy(true);
    let ok = 0;
    const failed = [];
    for (const id of ids) {
      try {
        await fn(id);
        ok += 1;
      } catch (err) {
        failed.push(err?.message || id);
      }
    }
    setBulkBusy(false);
    setBulkDeleteOpen(false);
    selection.clear();

    if (ok) toast.success(`${ok} ${ok === 1 ? "user" : "users"} ${past}`);
    if (failed.length) toast.error(`Could not ${verb} ${failed.length} of ${ids.length}`);

    // Deleting the last rows of a page would otherwise strand us on an empty one.
    if (page > 1 && ok >= users.length) setPage(page - 1);
    else fetchUsers();
  };

  const bulkDelete = () =>
    runBulk((id) => adminService.deleteUser(id), { verb: "delete", past: "deleted" });

  const bulkVerify = () =>
    runBulk((id) => adminService.verifyUser(id), { verb: "verify", past: "verified" });

  /* Says exactly what will be lifted, so the button is never ambiguous when
     an account is in both states. */
  const activateTitle = (user) => {
    if (user.deactivated && user.suspended)
      return "Activate — lifts the user's deactivation AND the admin suspension";
    if (user.deactivated) return "Activate — the user deactivated this account";
    return "Activate — lifts the admin suspension";
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
          <select
            className="adm-select"
            value={accountState}
            onChange={(e) => {
              setAccountState(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any account state</option>
            <option value="deactivated">Deactivated by user</option>
            <option value="suspended">Suspended by admin</option>
            <option value="active">Active only</option>
          </select>
          <ColumnPicker
            columns={USER_COLUMNS}
            visible={visibleCols}
            onChange={setVisibleCols}
            onReset={() => setVisibleCols(DEFAULT_VISIBLE)}
          />
          <button type="button" className="adm-btn adm-btn--primary" onClick={openCreate}>
            <FiUserPlus size={16} />
            Add User
          </button>
        </div>
      </div>

      <BulkActionBar
        count={selection.count}
        noun="user"
        busy={bulkBusy}
        onClear={selection.clear}
        onDelete={() => setBulkDeleteOpen(true)}
        deleteLabel="Delete selected"
        actions={
          <button
            type="button"
            className="adm-btn adm-bulkbar-btn"
            onClick={bulkVerify}
            disabled={bulkBusy}
          >
            <FiCheckCircle size={14} />
            Verify
          </button>
        }
      />

      {/* Table — column-driven. The Full Name column is pinned left so the
          row's identity stays on screen while scrolling through 30+ columns. */}
      <div className="adm-table-wrap adm-table-wrap--sticky">
        {isLoading ? (
          <div className="adm-loading">Loading users…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : users.length === 0 ? (
          <p className="adm-empty">No users found.</p>
        ) : (
          <table
            ref={tableRef}
            className="adm-table adm-table--dense"
            style={{ minWidth: tableMinWidth, "--adm-check-col": `${stickyOffset}px` }}
          >
            <thead>
              <tr>
                <th className="adm-th-check adm-sticky-col adm-sticky-check">
                  <SelectCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                    label="Select all users on this page"
                  />
                </th>
                {shownColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.sticky ? "adm-sticky-col adm-sticky-name" : ""}${
                      col.numeric ? " adm-th-num" : ""
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const uid = user._id || user.id;
                return (
                  <tr
                    key={uid}
                    className={`${
                      user.suspended
                        ? "adm-row--suspended"
                        : user.deactivated
                          ? "adm-row--deactivated"
                          : ""
                    }${selection.isSelected(uid) ? " adm-row--selected" : ""}`}
                  >
                    <td className="adm-td-check adm-sticky-col adm-sticky-check">
                      <SelectCheckbox
                        checked={selection.isSelected(uid)}
                        onChange={() => selection.toggle(uid)}
                        label={`Select ${user.name || "user"}`}
                      />
                    </td>

                    {shownColumns.map((col) => {
                      // A column renders either its own JSX (badges, links)
                      // or plain text, which gets the truncate treatment.
                      const custom = col.render ? col.render(user) : null;
                      return (
                        <td
                          key={col.key}
                          className={`${col.sticky ? "adm-sticky-col adm-sticky-name" : ""}${
                            col.numeric ? " adm-td-num" : ""
                          }`}
                        >
                          {col.render ? (
                            custom || <span className="adm-muted">—</span>
                          ) : (
                            <TruncatedCell
                              value={col.plain(user)}
                              mono={col.mono}
                              label={col.label}
                              onExpand={setExpandedCell}
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="adm-th-actions">
                      <div className="adm-actions">
                        <Link
                          to={`/admin/users/${uid}`}
                          className="adm-action-icon"
                          title="View full profile, listings & requirements"
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

                        {/* One Activate button for any blocked account. It
                            clears whichever states apply, so an admin never
                            has to know which of the two put the user here. */}
                        {(user.deactivated || user.suspended) && (
                          <button
                            type="button"
                            className="adm-action-icon adm-action-icon--ok"
                            title={activateTitle(user)}
                            onClick={() => setActivateTarget(user)}
                          >
                            <FiUserCheck size={15} />
                          </button>
                        )}

                        {!user.suspended && (
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
                        )}

                        {!user.verified && (
                          <button
                            type="button"
                            className="adm-action-icon"
                            title="Mark email verified"
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
      >
        <div className="adm-form">
          <div className="adm-form-row">
            <label className="adm-form-label">
              Name *
              <input
                className="adm-form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </label>
            <label className="adm-form-label">
              Email *
              <input
                className="adm-form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
              />
            </label>
          </div>
          <div className="adm-form-row">
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
              Phone
              <input
                className="adm-form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+92…"
              />
            </label>
          </div>
          <div className="adm-form-row">
            <label className="adm-form-label">
              Location
              <input
                className="adm-form-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, area"
              />
            </label>
            <label className="adm-form-label">
              Profile picture URL
              <input
                className="adm-form-input"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                placeholder="https://…/avatar.png"
              />
            </label>
          </div>
          <label className="adm-form-label">
            {editUser ? "New password (optional)" : "Password *"}
            <input
              className="adm-form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editUser ? "Leave blank to keep current" : "Account password"}
            />
          </label>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
            />
            Email verified
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
          Suspended users cannot sign in. Their account stays intact
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

      {/* Profile photo popup */}
      <Modal
        isOpen={!!photoView}
        onClose={() => setPhotoView(null)}
        title={`Photo — ${photoView?.name || "user"}`}
        size="small"
      >
        <div className="adm-photo-view">
          {photoView?.avatar ? (
            <img src={photoView.avatar} alt={photoView.name} />
          ) : (
            <p className="adm-empty">This user has no profile photo.</p>
          )}
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

      {/* Activate confirm — covers both blocked states */}
      <ConfirmDialog
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={async () => {
          const target = activateTarget;
          setActivateTarget(null);
          if (target) await doActivate(target);
        }}
        title={`Activate ${activateTarget?.name || "this account"}?`}
        message={
          activateTarget
            ? [
                activateTarget.deactivated
                  ? activateTarget.deactivatedAt
                    ? `This user deactivated their own account on ${new Date(activateTarget.deactivatedAt).toLocaleString()}.`
                    : "This user deactivated their own account."
                  : null,
                activateTarget.suspended ? "This account is suspended by an admin." : null,
                "Activating restores their sign-in and makes their listings visible again. They'll be emailed about it.",
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
        confirmLabel="Activate account"
        icon={<FiUserCheck size={22} />}
      />

      {/* Full value of a truncated cell */}
      <Modal
        isOpen={!!expandedCell}
        onClose={() => {
          setExpandedCell(null);
          setCopied(false);
        }}
        title={expandedCell?.label || "Value"}
        size="small"
      >
        <div className="adm-cellvalue-box">
          <p className="adm-cellvalue">{expandedCell?.value}</p>
          <div className="adm-cellvalue-actions">
            <button
              type="button"
              className={`adm-cellvalue-copy-btn ${copied ? "adm-cellvalue-copy-btn--copied" : ""}`}
              onClick={() => handleCopy(expandedCell?.value)}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <FiCheck size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FiCopy size={14} />
                  <span>Copy {expandedCell?.label || "value"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={bulkDelete}
        isLoading={bulkBusy}
        title={`Delete ${selection.count} ${selection.count === 1 ? "user" : "users"}?`}
        message="This permanently removes every selected user and everything they created — properties, listings, requirements, matches and messages."
        confirmLabel={`Delete ${selection.count}`}
        variant="danger"
        icon={<FiXCircle size={22} />}
      />
    </div>
  );
};

export default AdminUsers;
