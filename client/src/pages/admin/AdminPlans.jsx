import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { FiPlusSquare, FiEdit2, FiTrash2, FiStar } from "react-icons/fi";
import planService from "../../services/planService";
import RefreshButton from "../../components/common/RefreshButton";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import "../../styles/Admin.css";

const ROLES = ["dealer", "seller", "buyer"];

/* ─── AdminPlans — create/edit/delete subscription plans per role ───
   Plans live in the DB; the public Plans page reads them live. Deleting a
   plan never touches past payments (they snapshot name/amount). */
const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editor modal state
  const [editing, setEditing] = useState(null); // plan row or null
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null); // plan pending delete confirm

  const emptyForm = {
    name: "",
    role: "dealer",
    monthlyPrice: "",
    yearlyPrice: "",
    currency: "PKR",
    description: "",
    popular: false,
    active: true,
    sortOrder: 0,
    featuresText: "", // one feature per line, prefix "!" to mark excluded
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await planService.getAll(
        roleFilter ? { role: roleFilter } : {},
      );
      setPlans(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── form helpers ── */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setIsNew(true);
    setEditing({});
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name || "",
      role: plan.role || "dealer",
      monthlyPrice: String(plan.monthlyPrice ?? ""),
      yearlyPrice: String(plan.yearlyPrice ?? ""),
      currency: plan.currency || "PKR",
      description: plan.description || "",
      popular: !!plan.popular,
      active: !!plan.active,
      sortOrder: plan.sortOrder ?? 0,
      featuresText: (plan.features || [])
        .map((f) => (f.included ? f.text : `! ${f.text}`))
        .join("\n"),
    });
    setIsNew(false);
    setEditing(plan);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const parseFeatures = (text) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        line.startsWith("!")
          ? { text: line.slice(1).trim(), included: false }
          : { text: line, included: true },
      );

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Plan name is required.");
    if (form.monthlyPrice === "" || form.yearlyPrice === "") {
      return toast.error("Both monthly and yearly prices are required.");
    }
    const payload = {
      name: form.name.trim(),
      role: form.role,
      monthlyPrice: Number(form.monthlyPrice),
      yearlyPrice: Number(form.yearlyPrice),
      currency: form.currency || "PKR",
      description: form.description.trim() || null,
      popular: form.popular,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
      features: parseFeatures(form.featuresText),
    };
    if (isNew && form.slug?.trim()) payload.slug = form.slug.trim();

    setSaving(true);
    try {
      if (isNew) {
        await planService.create(payload);
        toast.success(`Plan "${payload.name}" created.`);
      } else {
        await planService.update(editing._id || editing.id, payload);
        toast.success(`Plan "${payload.name}" updated.`);
      }
      setEditing(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const plan = deleting;
    setDeleting(null);
    try {
      await planService.remove(plan._id || plan.id);
      toast.success(`Plan "${plan.name}" deleted.`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete plan");
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Subscription Plans</h1>
          <p className="adm-subtitle">
            Create and edit plans per role. The public Plans page updates
            instantly.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
          <button className="adm-primary-btn" onClick={openCreate}>
            <FiPlusSquare size={15} /> New Plan
          </button>
        </div>
      </div>

      <div className="adm-toolbar adm-toolbar--wrap">
        <select
          className="adm-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-card">
        {isLoading ? (
          <div className="adm-loading">Loading plans…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : plans.length === 0 ? (
          <p className="adm-empty">No plans yet — create the first one.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Role</th>
                  <th>Monthly</th>
                  <th>Yearly</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan._id || plan.id}>
                    <td>
                      <div className="adm-table-title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {plan.popular && (
                          <FiStar size={13} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                        )}
                        {plan.name}
                      </div>
                      <div className="adm-table-sub">
                        {plan.slug} · {(plan.features || []).length} features
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{plan.role}</td>
                    <td>
                      {Number(plan.monthlyPrice) === 0 &&
                      Number(plan.yearlyPrice) === 0 ? (
                        <span
                          className="adm-badge adm-badge--active"
                          title="Free plan — users activate it in one click"
                        >
                          Free
                        </span>
                      ) : (
                        <>
                          {plan.currency}{" "}
                          {Number(plan.monthlyPrice).toLocaleString()}
                        </>
                      )}
                    </td>
                    <td>
                      {plan.currency}{" "}
                      {Number(plan.yearlyPrice).toLocaleString()}
                    </td>
                    <td>
                      <StatusBadge
                        status={plan.active ? "active" : "rejected"}
                        label={plan.active ? "Active" : "Hidden"}
                        prefix="adm-badge"
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="adm-action-btn"
                          onClick={() => openEdit(plan)}
                          title="Edit plan"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="adm-action-btn adm-action-btn--danger"
                          onClick={() => setDeleting(plan)}
                          title="Delete plan"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "New Plan" : `Edit Plan — ${editing?.name || ""}`}
      >
        <div className="adm-form">
          <label className="adm-form-label">
            Name *
            <input
              className="adm-form-input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Pro"
            />
          </label>

          <label className="adm-form-label">
            Role *
            <select
              className="adm-form-input"
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div className="adm-form-row">
            <label className="adm-form-label">
              Monthly price *
              <input
                className="adm-form-input"
                type="number"
                min="0"
                value={form.monthlyPrice}
                onChange={(e) => setField("monthlyPrice", e.target.value)}
                placeholder="7999"
              />
            </label>
            <label className="adm-form-label">
              Yearly price *
              <input
                className="adm-form-input"
                type="number"
                min="0"
                value={form.yearlyPrice}
                onChange={(e) => setField("yearlyPrice", e.target.value)}
                placeholder="79990"
              />
            </label>
            <label className="adm-form-label">
              Currency
              <input
                className="adm-form-input"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
              />
            </label>
          </div>

          <p className="adm-form-hint">
            Tip: set both prices to <strong>0</strong> to make this plan
            completely free — users of that role can activate it in one click,
            no payment needed.
          </p>

          <label className="adm-form-label">
            Description
            <textarea
              className="adm-form-input adm-form-textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Best for growing dealers…"
            />
          </label>

          <label className="adm-form-label">
            Features — one per line, prefix &quot;!&quot; for NOT included
            <textarea
              className="adm-form-input adm-form-textarea"
              rows={6}
              value={form.featuresText}
              onChange={(e) => setField("featuresText", e.target.value)}
              placeholder={"Up to 50 active listings\nAdvanced matchmaking\n! API access"}
            />
          </label>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <label className="adm-check">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => setField("popular", e.target.checked)}
              />
              Most popular badge
            </label>
            <label className="adm-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField("active", e.target.checked)}
              />
              Visible on Plans page
            </label>
            <label className="adm-check" style={{ gap: 8 }}>
              Sort order
              <input
                className="adm-form-input"
                type="number"
                style={{ width: 70 }}
                value={form.sortOrder}
                onChange={(e) => setField("sortOrder", e.target.value)}
              />
            </label>
          </div>

          <div className="adm-form-actions">
            <button
              className="adm-proof-btn adm-proof-btn--reject"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="adm-proof-btn adm-proof-btn--approve"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : isNew ? "Create Plan" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={!!deleting}
        title="Delete Plan"
        message={`Delete the "${deleting?.name}" plan? Past payments keep their recorded amount, but new users won't be able to select it.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default AdminPlans;
