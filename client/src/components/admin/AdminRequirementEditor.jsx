import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import "../../styles/Listing.css";

/* ── AdminRequirementEditor — full dashboard-style requirement editor ──
   Lets an admin edit every field of a requirement, laid out like the
   Post/Edit Requirement pages. Lenient validation: only title is required. */

const REQ_STATUSES = ["active", "fulfilled", "closed"];
const URGENCY_OPTIONS = ["30 days", "45 days", "60 days", "90 days"];
const PURPOSES = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
];
const CATEGORIES = [
  { value: "home", label: "Home", icon: "🏠" },
  { value: "plot", label: "Plot", icon: "📐" },
  { value: "commercial", label: "Commercial", icon: "🏢" },
];
const SUBTYPES_BY_CATEGORY = {
  home: ["house", "flat", "upper-portion", "lower-portion", "farm-house", "room", "penthouse", "apartment"],
  plot: ["residential-plot", "commercial-plot", "agricultural-land", "industrial-land", "plot-form", "plot-file"],
  commercial: ["shop", "office", "warehouse", "factory", "building", "other"],
};
const SIZE_UNITS = ["Marla", "Kanal", "Sq. Ft.", "Sq. Yd.", "Sq. M."];

// Requirement.size is stored as e.g. "10 Marla" / "1200 Sq. Ft."
const splitSize = (val) => {
  const raw = String(val || "").trim();
  const m = raw.match(/^([\d.,]+)\s*(.*)$/);
  if (!m) return { size: "", unit: raw || "Marla" };
  return { size: m[1], unit: m[2].trim() || "Marla" };
};

const toForm = (r = {}) => {
  const { size, unit } = splitSize(r.size);
  return {
    title: r.title || "",
    purpose: r.purpose || "sale",
    category: r.category || "home",
    propertyType: r.propertyType || "",
    size,
    sizeUnit: unit,
    budgetMin: r.budget?.min != null ? String(r.budget.min) : "",
    budgetMax: r.budget?.max != null ? String(r.budget.max) : "",
    bedrooms: r.bedrooms != null ? String(r.bedrooms) : "",
    bathrooms: r.bathrooms != null ? String(r.bathrooms) : "",
    city: r.location?.city || "",
    area: r.location?.area || "",
    lat: r.location?.coordinates?.lat != null ? String(r.location.coordinates.lat) : "",
    lng: r.location?.coordinates?.lng != null ? String(r.location.coordinates.lng) : "",
    urgency: r.urgency || "",
    notes: r.notes || "",
    status: r.status || "active",
  };
};

const AdminRequirementEditor = ({ requirement, onSave, onClose, saving }) => {
  const [form, setForm] = useState(() => toForm(requirement));
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(null);

  useEffect(() => {
    setForm(toForm(requirement));
  }, [requirement]);

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const handleSave = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Title is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending({
      title: form.title.trim(),
      purpose: form.purpose,
      category: form.category,
      propertyType: form.propertyType,
      size: `${form.size.trim()} ${form.sizeUnit}`.trim(),
      budget: {
        min: form.budgetMin === "" ? null : Number(form.budgetMin),
        max: form.budgetMax === "" ? null : Number(form.budgetMax),
      },
      bedrooms: form.bedrooms === "" ? undefined : Number(form.bedrooms),
      bathrooms: form.bathrooms === "" ? undefined : Number(form.bathrooms),
      location: {
        city: form.city,
        area: form.area,
        ...(form.lat !== "" && form.lng !== ""
          ? { coordinates: { lat: Number(form.lat), lng: Number(form.lng) } }
          : {}),
      },
      urgency: form.urgency || undefined,
      notes: form.notes || undefined,
      status: form.status,
    });
  };

  const handleConfirm = () => {
    if (pending) onSave(pending);
    setPending(null);
  };

  return (
    <div className="adm-form adm-property-editor">
      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Purpose & Status</h3>
        <div className="lst-purpose-row">
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`lst-purpose-card${form.purpose === p.value ? " lst-purpose-card--active" : ""}`}
              onClick={() => set("purpose", p.value)}
            >
              <span className="lst-purpose-icon">{p.value === "sale" ? "🏷️" : "🔑"}</span>
              <span className="lst-purpose-label">{p.label}</span>
            </button>
          ))}
        </div>
        <label className="adm-form-label" style={{ marginTop: 12 }}>
          Status
          <select className="adm-form-input" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {REQ_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Requirement</h3>
        <label className="adm-form-label">
          Title *
          <input className="adm-form-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          {errors.title && <span className="adm-form-error">{errors.title}</span>}
        </label>
        <div className="lst-category-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`lst-category-card${form.category === c.value ? " lst-category-card--active" : ""}`}
              onClick={() => set("category", c.value)}
            >
              <span className="lst-category-icon">{c.icon}</span>
              <span className="lst-category-label">{c.label}</span>
            </button>
          ))}
        </div>
        <div className="lst-subtype-grid">
          {(SUBTYPES_BY_CATEGORY[form.category] || []).map((st) => (
            <button
              key={st}
              type="button"
              className={`lst-subtype-card${form.propertyType === st ? " lst-subtype-card--active" : ""}`}
              onClick={() => set("propertyType", st)}
            >
              <span className="lst-subtype-card-label">{st.replace(/-/g, " ")}</span>
            </button>
          ))}
        </div>
        <div className="adm-form-row">
          <label className="adm-form-label">
            Preferred Size
            <input className="adm-form-input" type="number" min="0" value={form.size} onChange={(e) => set("size", e.target.value)} />
          </label>
          <label className="adm-form-label">
            Unit
            <select className="adm-form-input" value={form.sizeUnit} onChange={(e) => set("sizeUnit", e.target.value)}>
              {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Budget & Details</h3>
        <div className="adm-form-row">
          <label className="adm-form-label">
            Min Budget (PKR)
            <input
              className="adm-form-input"
              inputMode="numeric"
              value={form.budgetMin ? Number(form.budgetMin).toLocaleString("en-US") : ""}
              onChange={(e) => set("budgetMin", e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <label className="adm-form-label">
            Max Budget (PKR)
            <input
              className="adm-form-input"
              inputMode="numeric"
              value={form.budgetMax ? Number(form.budgetMax).toLocaleString("en-US") : ""}
              onChange={(e) => set("budgetMax", e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>
        <div className="adm-form-row">
          <label className="adm-form-label">
            Bedrooms
            <input className="adm-form-input" type="number" min="0" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
          </label>
          <label className="adm-form-label">
            Bathrooms
            <input className="adm-form-input" type="number" min="0" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
          </label>
        </div>
        <label className="adm-form-label">
          Timeline / Urgency
          <select className="adm-form-input" value={form.urgency} onChange={(e) => set("urgency", e.target.value)}>
            <option value="">—</option>
            {URGENCY_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>

      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Location</h3>
        <div className="adm-form-row">
          <label className="adm-form-label">
            City
            <input className="adm-form-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </label>
          <label className="adm-form-label">
            Area / Neighbourhood
            <input className="adm-form-input" value={form.area} onChange={(e) => set("area", e.target.value)} />
          </label>
        </div>
        <div className="adm-form-row">
          <label className="adm-form-label">
            Latitude
            <input className="adm-form-input" type="number" step="any" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          </label>
          <label className="adm-form-label">
            Longitude
            <input className="adm-form-input" type="number" step="any" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="lst-form-section">
        <h3 className="lst-form-section-title">Notes</h3>
        <label className="adm-form-label">
          Notes
          <textarea className="adm-form-input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
      </div>

      <div className="adm-form-actions">
        <button type="button" className="adm-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="adm-btn adm-btn--primary" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title="Save changes?"
        message="Please confirm you want to apply these changes to this requirement on the platform."
        confirmLabel="Yes, save changes"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default AdminRequirementEditor;