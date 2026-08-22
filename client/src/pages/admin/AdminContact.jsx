import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiSave, FiExternalLink } from "react-icons/fi";
import RefreshButton from "../../components/common/RefreshButton";
import contactService from "../../services/contactService";
import "../../styles/Admin.css";

/* ─── AdminContact — edits the public Contact Us page ───
   One singleton record on the API, so this is a single form rather than a
   list + modal like Plans. Repeating groups (hours, socials, FAQs) are edited
   as inline rows and saved as JSON arrays. */

const TEXT_FIELDS = [
  { key: "heading", label: "Page heading", placeholder: "Get in touch" },
  { key: "email", label: "Email address", placeholder: "support@apnabnb.pk" },
  { key: "phone", label: "Phone number", placeholder: "+92 300 000 0000" },
  { key: "whatsapp", label: "WhatsApp number", placeholder: "+92 300 000 0000" },
  { key: "address", label: "Street address", placeholder: "Gulberg III, Main Boulevard" },
  { key: "city", label: "City / country", placeholder: "Lahore, Pakistan" },
];

const EMPTY = {
  heading: "",
  subheading: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  mapEmbedUrl: "",
  responseNote: "",
  officeHours: [],
  socials: [],
  faqs: [],
  formEnabled: true,
};

const AdminContact = () => {
  const [form, setForm] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await contactService.get();
      setForm({
        ...EMPTY,
        ...data,
        officeHours: Array.isArray(data.officeHours) ? data.officeHours : [],
        socials: Array.isArray(data.socials) ? data.socials : [],
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
      });
    } catch (err) {
      toast.error(err?.message || "Failed to load contact page");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /* Generic helpers for the three repeating groups. */
  const setRow = (group, index, key, value) =>
    setForm((prev) => ({
      ...prev,
      [group]: prev[group].map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));

  const addRow = (group, blank) =>
    setForm((prev) => ({ ...prev, [group]: [...prev[group], blank] }));

  const removeRow = (group, index) =>
    setForm((prev) => ({
      ...prev,
      [group]: prev[group].filter((_, i) => i !== index),
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Drop blank rows so the public page never renders an empty card.
      const payload = {
        ...form,
        officeHours: form.officeHours.filter((h) => h.day?.trim() || h.time?.trim()),
        socials: form.socials.filter((s) => s.label?.trim()),
        faqs: form.faqs.filter((f) => f.question?.trim()),
      };
      const saved = await contactService.update(payload);
      setForm({ ...EMPTY, ...saved });
      toast.success("Contact page updated");
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Contact Page</h1>
          <p className="adm-subtitle">
            Everything here renders on the public Contact Us page. Changes go
            live as soon as you save.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
          <a
            href="/contact"
            target="_blank"
            rel="noreferrer"
            className="adm-primary-btn"
            style={{ textDecoration: "none" }}
          >
            <FiExternalLink size={15} /> View page
          </a>
        </div>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        {/* ── Basics ── */}
        <h3 className="adm-card-title" style={{ marginBottom: 12 }}>Page content</h3>
        <div className="adm-form-row">
          {TEXT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="adm-form-label" htmlFor={`cf-${key}`}>{label}</label>
              <input
                id={`cf-${key}`}
                className="adm-form-input"
                value={form[key] || ""}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <label className="adm-form-label" htmlFor="cf-subheading">Intro paragraph</label>
        <textarea
          id="cf-subheading"
          className="adm-form-textarea"
          rows={3}
          value={form.subheading || ""}
          placeholder="Shown under the page heading."
          onChange={(e) => set("subheading", e.target.value)}
        />

        <label className="adm-form-label" htmlFor="cf-note">Response note</label>
        <input
          id="cf-note"
          className="adm-form-input"
          value={form.responseNote || ""}
          placeholder="We usually reply within one business day."
          onChange={(e) => set("responseNote", e.target.value)}
        />
        <p className="adm-form-hint">Shown beside the message form and on the thank-you screen.</p>

        <label className="adm-form-label" htmlFor="cf-map">Google Maps embed URL</label>
        <input
          id="cf-map"
          className="adm-form-input"
          value={form.mapEmbedUrl || ""}
          placeholder="https://www.google.com/maps/embed?pb=…"
          onChange={(e) => set("mapEmbedUrl", e.target.value)}
        />
        <p className="adm-form-hint">
          Optional. In Google Maps choose Share → Embed a map and paste the src
          value only. Leave blank to hide the map.
        </p>

        <label className="adm-form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(form.formEnabled)}
            onChange={(e) => set("formEnabled", e.target.checked)}
          />
          Show the message form on the public page
        </label>
        <p className="adm-form-hint">
          Turn this off to hide the form and point visitors at your email and
          phone instead. Contact details stay visible either way.
        </p>

        {/* ── Office hours ── */}
        <h3 className="adm-card-title" style={{ margin: "26px 0 12px" }}>Office hours</h3>
        {form.officeHours.map((row, i) => (
          <div key={i} className="adm-form-row" style={{ alignItems: "end" }}>
            <input
              className="adm-form-input"
              placeholder="Monday – Friday"
              value={row.day || ""}
              onChange={(e) => setRow("officeHours", i, "day", e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="adm-form-input"
                placeholder="9:00 AM – 6:00 PM"
                value={row.time || ""}
                onChange={(e) => setRow("officeHours", i, "time", e.target.value)}
              />
              <button
                type="button"
                className="adm-action-btn adm-action-btn--danger"
                onClick={() => removeRow("officeHours", i)}
                aria-label="Remove row"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="adm-action-btn"
          onClick={() => addRow("officeHours", { day: "", time: "" })}
        >
          <FiPlus size={14} /> Add hours row
        </button>

        {/* ── Socials ── */}
        <h3 className="adm-card-title" style={{ margin: "26px 0 12px" }}>Social links</h3>
        {form.socials.map((row, i) => (
          <div key={i} className="adm-form-row" style={{ alignItems: "end" }}>
            <input
              className="adm-form-input"
              placeholder="Facebook"
              value={row.label || ""}
              onChange={(e) => setRow("socials", i, "label", e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="adm-form-input"
                placeholder="https://facebook.com/…"
                value={row.url || ""}
                onChange={(e) => setRow("socials", i, "url", e.target.value)}
              />
              <button
                type="button"
                className="adm-action-btn adm-action-btn--danger"
                onClick={() => removeRow("socials", i)}
                aria-label="Remove link"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <p className="adm-form-hint">Links with an empty URL are hidden on the public page.</p>
        <button
          type="button"
          className="adm-action-btn"
          onClick={() => addRow("socials", { label: "", url: "" })}
        >
          <FiPlus size={14} /> Add social link
        </button>

        {/* ── FAQs ── */}
        <h3 className="adm-card-title" style={{ margin: "26px 0 12px" }}>Frequently asked</h3>
        {form.faqs.map((row, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="adm-form-input"
                placeholder="Question"
                value={row.question || ""}
                onChange={(e) => setRow("faqs", i, "question", e.target.value)}
              />
              <button
                type="button"
                className="adm-action-btn adm-action-btn--danger"
                onClick={() => removeRow("faqs", i)}
                aria-label="Remove question"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
            <textarea
              className="adm-form-textarea"
              rows={3}
              placeholder="Answer"
              value={row.answer || ""}
              onChange={(e) => setRow("faqs", i, "answer", e.target.value)}
            />
          </div>
        ))}
        <button
          type="button"
          className="adm-action-btn"
          onClick={() => addRow("faqs", { question: "", answer: "" })}
        >
          <FiPlus size={14} /> Add question
        </button>

        <div className="adm-form-actions">
          <button type="submit" className="adm-primary-btn" disabled={saving || isLoading}>
            <FiSave size={15} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminContact;
