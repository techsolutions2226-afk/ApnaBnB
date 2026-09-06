import { useState, useEffect } from "react";
import Modal from "../../common/Modal";

const ROLES = ["seller", "buyer", "dealer"];

/**
 * Combined Edit / Reset-password modal for the user detail page.
 * mode: "edit" | "password"
 */
export default function UserEditModal({
  isOpen,
  mode = "edit",
  user,
  saving,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "buyer",
    phone: "",
    location: "",
    avatar: "",
    verified: false,
    password: "",
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "buyer",
      phone: user.phone || "",
      location: user.location || "",
      avatar: user.avatar || "",
      verified: !!user.verified,
      password: "",
    });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isPassword = mode === "password";
  const title = isPassword ? `Reset password — ${user?.name || "user"}` : `Edit ${user?.name || "user"}`;
  const roleOptions =
    user?.role === "admin" ? ["admin", ...ROLES] : ROLES;

  const handleSubmit = () => {
    if (isPassword) {
      onSave({ password: form.password });
      return;
    }
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
    onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={isPassword ? "small" : "default"}>
      <div className="adm-form">
        {isPassword ? (
          <label className="adm-form-label">
            New password *
            <input
              className="adm-form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter a new password"
              autoFocus
            />
          </label>
        ) : (
          <>
            <div className="adm-form-row">
              <label className="adm-form-label">
                Name *
                <input
                  className="adm-form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="adm-form-label">
                Email *
                <input
                  className="adm-form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  {roleOptions.map((r) => (
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
                />
              </label>
              <label className="adm-form-label">
                Avatar URL
                <input
                  className="adm-form-input"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                />
              </label>
            </div>
            <label className="adm-form-label">
              New password (optional)
              <input
                className="adm-form-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to keep current"
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
          </>
        )}

        <div className="adm-form-actions">
          <button type="button" className="adm-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={saving || (isPassword && !form.password)}
            onClick={handleSubmit}
          >
            {saving ? "Saving…" : isPassword ? "Reset password" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
