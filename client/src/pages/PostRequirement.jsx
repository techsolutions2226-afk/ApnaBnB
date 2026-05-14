/* ─── PostRequirement — Post a property requirement ───
    Buyers post what they're looking for.
    Dealers post on behalf of their clients.
    ─────────────────────────────────────────────── */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import requirementService from "../services/requirementService";
import "../styles/Requirement.css";

/* ── Static Options ── */
const PROPERTY_TYPES = ["House", "Apartment", "Plot"];

const CITIES = ["Lahore", "Islamabad", "Karachi"];

const URGENCY_OPTIONS = ["30 days", "45 days", "60 days", "90 days"];

/* ── Validation ── */
const validate = (data) => {
  const errors = {};

  if (!data.title.trim()) errors.title = "Title is required";
  else if (data.title.trim().length < 10)
    errors.title = "Title must be at least 10 characters";

  if (!data.city) errors.city = "Select a city";
  if (!data.area.trim()) errors.area = "Enter a preferred area";
  if (!data.propertyType) errors.propertyType = "Select a property type";

  if (!data.budgetMin || Number(data.budgetMin) <= 0)
    errors.budgetMin = "Enter minimum budget";
  if (!data.budgetMax || Number(data.budgetMax) <= 0)
    errors.budgetMax = "Enter maximum budget";
  if (
    data.budgetMin &&
    data.budgetMax &&
    Number(data.budgetMin) >= Number(data.budgetMax)
  )
    errors.budgetMax = "Max budget must be greater than min";

  if (!data.size.trim()) errors.size = "Enter preferred size";
  if (!data.urgency) errors.urgency = "Select urgency";

  return errors;
};

const PostRequirement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDealer = currentUser?.role === "dealer";

  const [form, setForm] = useState({
    title: "",
    city: "",
    area: "",
    propertyType: "",
    budgetMin: "",
    budgetMax: "",
    size: "",
    bedrooms: "",
    bathrooms: "",
    urgency: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /* ── Handlers ── */
  const handleChange = useCallback(
    (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = validate(form);
      setErrors(validationErrors);

      const allTouched = {};
      Object.keys(form).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);

      if (Object.keys(validationErrors).length > 0) return;

      setIsSubmitting(true);

      try {
        // Prepare data for API
        const requirementData = {
          title: form.title.trim(),
          location: {
            city: form.city,
            area: form.area.trim()
          },
          budget: {
            min: Number(form.budgetMin),
            max: Number(form.budgetMax)
          },
          propertyType: form.propertyType,
          size: form.size.trim(),
          bedrooms: Number(form.bedrooms) || undefined,
          bathrooms: Number(form.bathrooms) || undefined,
          notes: form.notes.trim() || undefined,
          urgency: form.urgency || undefined
        };

        // Call API
        await requirementService.create(requirementData);

        setIsSubmitting(false);
        toast.success("Requirement posted successfully!");

        /* Navigate to dashboard after posting */
        navigate(
          isDealer ? "/dashboard/dealer" : "/dashboard/buyer"
         );
       } catch (error) {
         setIsSubmitting(false);
         toast.error(error.message || "Failed to post requirement");
       }
     },
     [form, isDealer, navigate]
   );

  /* ── Error helpers ── */
  const showError = (field) => touched[field] && errors[field];
  const fieldClass = (base, field) =>
    `${base}${showError(field) ? ` ${base}--error` : ""}`;

  return (
    <div className="req-page">
      {/* ── Breadcrumb ── */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link
          to={isDealer ? "/dashboard/dealer" : "/dashboard/buyer"}
          className="dash-breadcrumb-link"
        >
          Dashboard
        </Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Post Requirement</span>
      </nav>

      <div className="req-header">
        <h1 className="req-title">Post a Requirement</h1>
        <p className="req-subtitle">
          {isDealer
            ? "Describe what your client is looking for — other dealers and sellers will see this."
            : "Tell us what you're looking for — dealers and sellers will reach out with matching properties."}
        </p>
      </div>

      <form className="req-form" onSubmit={handleSubmit} noValidate>
        {/* ── What are you looking for? ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">
            {isDealer ? "Client Requirement" : "What are you looking for?"}
          </h3>

          {/* Title */}
          <div className="req-field">
            <label className="req-label" htmlFor="req-title">
              Requirement Title
            </label>
            <input
              id="req-title"
              type="text"
              className={fieldClass("req-input", "title")}
              placeholder={
                isDealer
                  ? "e.g. Corporate client needs 4 Bed house"
                  : "e.g. 3 Bed family home near F-10"
              }
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
            />
            {showError("title") && (
              <div className="req-error">{errors.title}</div>
            )}
          </div>

          {/* Property Type */}
          <div className="req-row">
            <div className="req-field">
              <label className="req-label" htmlFor="req-type">
                Property Type
              </label>
              <select
                id="req-type"
                className={fieldClass("req-select", "propertyType")}
                value={form.propertyType}
                onChange={(e) => handleChange("propertyType", e.target.value)}
                onBlur={() => handleBlur("propertyType")}
              >
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {showError("propertyType") && (
                <div className="req-error">{errors.propertyType}</div>
              )}
            </div>

            <div className="req-field">
              <label className="req-label" htmlFor="req-size">
                Preferred Size
                <span className="req-label-hint">(e.g. 10 Marla, 1200 sq ft)</span>
              </label>
              <input
                id="req-size"
                type="text"
                className={fieldClass("req-input", "size")}
                placeholder="e.g. 10 Marla"
                value={form.size}
                onChange={(e) => handleChange("size", e.target.value)}
                onBlur={() => handleBlur("size")}
              />
              {showError("size") && (
                <div className="req-error">{errors.size}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Preferred Location</h3>

          <div className="req-row">
            <div className="req-field">
              <label className="req-label" htmlFor="req-city">
                City
              </label>
              <select
                id="req-city"
                className={fieldClass("req-select", "city")}
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                onBlur={() => handleBlur("city")}
              >
                <option value="">Select city</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {showError("city") && (
                <div className="req-error">{errors.city}</div>
              )}
            </div>

            <div className="req-field">
              <label className="req-label" htmlFor="req-area">
                Preferred Area
                <span className="req-label-hint">(can list multiple)</span>
              </label>
              <input
                id="req-area"
                type="text"
                className={fieldClass("req-input", "area")}
                placeholder="e.g. DHA Phase 5 / Gulberg"
                value={form.area}
                onChange={(e) => handleChange("area", e.target.value)}
                onBlur={() => handleBlur("area")}
              />
              {showError("area") && (
                <div className="req-error">{errors.area}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Budget & Details ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Budget & Details</h3>

          {/* Budget Range */}
          <div className="req-field">
            <label className="req-label">
              Budget Range
              <span className="req-label-hint">(PKR)</span>
            </label>
            <div className="req-budget-row">
              <div>
                <input
                  type="number"
                  className={fieldClass("req-input", "budgetMin")}
                  placeholder="Min (e.g. 18000000)"
                  value={form.budgetMin}
                  onChange={(e) => handleChange("budgetMin", e.target.value)}
                  onBlur={() => handleBlur("budgetMin")}
                  min="0"
                />
                {showError("budgetMin") && (
                  <div className="req-error">{errors.budgetMin}</div>
                )}
              </div>
              <span className="req-budget-sep">to</span>
              <div>
                <input
                  type="number"
                  className={fieldClass("req-input", "budgetMax")}
                  placeholder="Max (e.g. 26000000)"
                  value={form.budgetMax}
                  onChange={(e) => handleChange("budgetMax", e.target.value)}
                  onBlur={() => handleBlur("budgetMax")}
                  min="0"
                />
                {showError("budgetMax") && (
                  <div className="req-error">{errors.budgetMax}</div>
                )}
              </div>
            </div>
          </div>

          {/* Bedrooms + Bathrooms */}
          <div className="req-row">
            <div className="req-field">
              <label className="req-label" htmlFor="req-bedrooms">
                Bedrooms
                <span className="req-label-hint">(optional)</span>
              </label>
              <input
                id="req-bedrooms"
                type="number"
                className="req-input"
                placeholder="e.g. 3"
                value={form.bedrooms}
                onChange={(e) => handleChange("bedrooms", e.target.value)}
                min="0"
                max="20"
              />
            </div>

            <div className="req-field">
              <label className="req-label" htmlFor="req-bathrooms">
                Bathrooms
                <span className="req-label-hint">(optional)</span>
              </label>
              <input
                id="req-bathrooms"
                type="number"
                className="req-input"
                placeholder="e.g. 3"
                value={form.bathrooms}
                onChange={(e) => handleChange("bathrooms", e.target.value)}
                min="0"
                max="20"
              />
            </div>
          </div>

          {/* Urgency */}
          <div className="req-field">
            <label className="req-label">
              Timeline / Urgency
            </label>
            <div className="req-urgency-options">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`req-urgency-pill${form.urgency === opt ? " req-urgency-pill--selected" : ""}`}
                  onClick={() => handleChange("urgency", opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {showError("urgency") && (
              <div className="req-error">{errors.urgency}</div>
            )}
          </div>
        </div>

        {/* ── Additional Notes ── */}
        <div className="req-form-section">
          <h3 className="req-form-section-title">Additional Notes</h3>

          <div className="req-field">
            <label className="req-label" htmlFor="req-notes">
              Notes
              <span className="req-label-hint">(optional — preferences, must-haves, etc.)</span>
            </label>
            <textarea
              id="req-notes"
              className="req-textarea"
              placeholder={
                isDealer
                  ? "e.g. Client is relocating. Need co-brokering partner. Standard commission split."
                  : "e.g. Close to schools and parks. Prefer corner plot. Must have verified documentation."
              }
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="req-actions">
          <button
            type="submit"
            className="req-btn req-btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Requirement"}
          </button>
          <Link
            to={isDealer ? "/dashboard/dealer" : "/dashboard/buyer"}
            className="req-btn req-btn--secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default PostRequirement;
