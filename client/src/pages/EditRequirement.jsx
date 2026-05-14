/* ─── EditRequirement — Edit an existing property requirement ───
    Buyers and dealers can edit their own requirements.
    Loads requirement data from `:id` param.
    On "save" updates via API and navigates to dashboard.
    ─────────────────────────────────────────────── */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import requirementService from "../services/requirementService";
import "../styles/Requirement.css";

/* ── Static Options ── */
const PROPERTY_TYPES = ["House", "Apartment", "Plot"];

const CITIES = ["Lahore", "Islamabad", "Karachi"];

const URGENCY_OPTIONS = ["30 days", "45 days", "60 days", "90 days"];

const STATUS_OPTIONS = ["active", "fulfilled", "closed"];

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

const EditRequirement = () => {
  const { id } = useParams(); /* requirement ID from URL */
  const { currentUser, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [originalRequirement, setOriginalRequirement] = useState(null);

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
    status: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /* ── Load requirement data on mount ── */
  useEffect(() => {
    const loadRequirement = async () => {
      if (!id) {
        setError("No requirement ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await requirementService.getById(id);
        
        // Store original for comparison if needed
        setOriginalRequirement(data);
        
        // Pre-populate form - convert API format to form format
        setForm({
          title: data.title || "",
          city: data.location?.city || "",
          area: data.location?.area || "",
          propertyType: data.propertyType || "",
          budgetMin: data.budget?.min?.toString() || "",
          budgetMax: data.budget?.max?.toString() || "",
          size: data.size || "",
          bedrooms: data.bedrooms?.toString() || "",
          bathrooms: data.bathrooms?.toString() || "",
          urgency: data.urgency || "",
          status: data.status || "active",
          notes: data.notes || "",
        });
        
        setError(null);
      } catch (err) {
        console.error("Failed to load requirement:", err);
        setError(err.message || "Failed to load requirement");
      } finally {
        setIsLoading(false);
      }
    };

    loadRequirement();
  }, [id]);

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
        // Prepare data for API - same format as PostRequirement
        const requirementData = {
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
          urgency: form.urgency || undefined,
          title: form.title.trim(),
          status: form.status
        };

        // Call update API
        await requirementService.update(id, requirementData);

        setIsSubmitting(false);
        toast.success("Requirement updated successfully!");

        /* Navigate to dashboard after update */
        navigate(
           isDealer ? "/dashboard/dealer" : "/dashboard/buyer"
         );
       } catch (error) {
         setIsSubmitting(false);
         toast.error(error.message || "Failed to update requirement");
       }
     },
     [form, isDealer, navigate, id]
   );

  /* ── Error helpers ── */
  const showError = (field) => touched[field] && errors[field];
  const fieldClass = (base, field) =>
    `${base}${showError(field) ? ` ${base}--error` : ""}`;

  /* ── Loading State ── */
  if (isLoading) {
    return (
      <div className="req-page">
        <div className="req-header" style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <h1 className="req-title">Loading Requirement...</h1>
          <p className="req-subtitle">Please wait while we fetch your requirement details.</p>
        </div>
      </div>
    );
  }

  /* ── Error State (not found / no permission) ── */
  if (error || !originalRequirement) {
    return (
      <div className="req-page">
        {/* ── Breadcrumb ── */}
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link
            to={getDashboardPath()}
            className="dash-breadcrumb-link"
          >
            Dashboard
          </Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Edit Requirement</span>
        </nav>

        <div className="req-header" style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
          <h1 className="req-title">Requirement Not Found</h1>
          <p className="req-subtitle">
            {error || "The requirement you're looking for doesn't exist or you don't have permission to edit it."}
          </p>
          <div style={{ marginTop: "2rem" }}>
            <Link
              to={getDashboardPath()}
              className="req-btn req-btn--primary"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="req-page">
      {/* ── Breadcrumb ── */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link
          to={getDashboardPath()}
          className="dash-breadcrumb-link"
        >
          Dashboard
        </Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Edit Requirement</span>
      </nav>

      <div className="req-header">
        <h1 className="req-title">Edit Requirement</h1>
        <p className="req-subtitle">
          {isDealer
            ? "Update your client's requirement details."
            : "Update your property requirement details."}
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

          {/* Status */}
          <div className="req-field">
            <label className="req-label">
              Requirement Status
            </label>
            <div className="req-urgency-options">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`req-urgency-pill${form.status === opt ? " req-urgency-pill--selected" : ""}`}
                  onClick={() => handleChange("status", opt)}
                  style={{
                    textTransform: 'capitalize',
                    backgroundColor: form.status === opt 
                      ? opt === 'active' ? '#e8f5e9' : opt === 'fulfilled' ? '#fff3e0' : '#ffebee'
                      : undefined,
                    color: form.status === opt
                      ? opt === 'active' ? '#2e7d32' : opt === 'fulfilled' ? '#ef6c00' : '#c62828'
                      : undefined
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
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
            {isSubmitting ? "Saving..." : "Update Requirement"}
          </button>
          <Link
            to={getDashboardPath()}
            className="req-btn req-btn--secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditRequirement;