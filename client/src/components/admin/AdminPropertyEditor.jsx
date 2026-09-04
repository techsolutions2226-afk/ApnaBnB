import { useState, useEffect } from "react";
import ListingForm from "../listing/ListingForm";
import ConfirmDialog from "../common/ConfirmDialog";

/* ── AdminPropertyEditor — reuse the dashboard's ListingForm ──
   The exact form used to create/edit listings on the dashboards, so the admin
   gets the same amenities groups, map picker, and drag-and-drop photo upload.
   Only the moderation `status` is added. Saving asks for confirmation. */

const PROPERTY_STATUSES = ["active", "pending", "sold", "rented", "featured", "rejected"];

// Map the admin property row onto the shape ListingForm expects (it reads
// `gallery`/`image` for photos, `location` for city/area/coordinates).
const toInitialData = (p = {}) => ({
  title: p.title || "",
  purpose: p.purpose || "sale",
  category: p.category || "home",
  propertyType: p.propertyType || "",
  price: p.price != null ? String(p.price) : "",
  size: p.size != null ? String(p.size) : "",
  sizeUnit: p.sizeUnit || "Marla",
  bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
  bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
  description: p.description || "",
  amenities: Array.isArray(p.amenities) ? p.amenities : [],
  gallery: Array.isArray(p.photos) ? p.photos : [],
  location: p.location || {},
  coordinates: p.location?.coordinates || null,
  securityDeposit: p.securityDeposit != null ? String(p.securityDeposit) : "",
  leaseTerm: p.leaseTerm || 12,
  furnished: p.furnished || "unfurnished",
  availableFrom: p.availableFrom ? new Date(p.availableFrom).toISOString().slice(0, 10) : "",
  contactName: p.contactName || "",
  contactEmail: p.contactEmail || "",
  contactPhone: p.contactPhone || "",
});

// Translate ListingForm's output into the shape adminController.updateProperty
// expects (buildPropertyData whitelist).
const toUpdatePayload = (output, status) => ({
  title: output.title,
  purpose: output.purpose,
  category: output.category,
  propertyType: output.propertyType,
  price: output.price,
  size: output.size,
  sizeUnit: output.sizeUnit,
  bedrooms: output.bedrooms,
  bathrooms: output.bathrooms,
  description: output.description,
  amenities: output.amenities,
  // ListingForm already emits `images` as an array of URL strings, so pass it
  // through as-is (mapping .url again would turn every string into null).
  photos: Array.isArray(output.images) ? output.images.filter(Boolean) : [],
  location: {
    city: output.city,
    area: output.area,
    coordinates: output.coordinates || undefined,
  },
  securityDeposit: output.securityDeposit,
  leaseTerm: output.leaseTerm,
  furnished: output.furnished,
  availableFrom: output.availableFrom || undefined,
  contactName: output.contactName,
  contactEmail: output.contactEmail,
  contactPhone: output.contactPhone,
  status,
});

/** Statuses allowed for the current purpose (sale ↔ sold, rent ↔ rented). */
const statusesForPurpose = (purpose) =>
  PROPERTY_STATUSES.filter((s) =>
    purpose === "rent" ? s !== "sold" : s !== "rented",
  );

const coerceStatus = (purpose, status) => {
  if (purpose === "rent" && status === "sold") return "rented";
  if (purpose === "sale" && status === "rented") return "sold";
  return status;
};

const AdminPropertyEditor = ({ property, onSave, onClose, saving }) => {
  const [status, setStatus] = useState(property?.status || "active");
  // Track purpose live from ListingForm — the old bug used only the
  // property's initial purpose, so switching Sale→Rent never unlocked "rented".
  const [purpose, setPurpose] = useState(property?.purpose || "sale");
  const [pending, setPending] = useState(null);

  const purposeStatuses = statusesForPurpose(purpose);
  const statusOptions = purposeStatuses.includes(status)
    ? purposeStatuses
    : [status, ...purposeStatuses];

  useEffect(() => {
    setStatus((prev) => coerceStatus(purpose, prev));
  }, [purpose]);

  const handlePurposeChange = (nextPurpose) => {
    setPurpose(nextPurpose);
  };

  const handleSubmit = (output) => {
    const nextPurpose = output.purpose || purpose;
    const nextStatus = coerceStatus(nextPurpose, status);
    setPending(toUpdatePayload(output, nextStatus));
  };

  const handleConfirm = () => {
    if (pending) onSave(pending);
    setPending(null);
  };

  return (
    <>
      <div className="adm-form" style={{ marginBottom: 12 }}>
        <label className="adm-form-label">
          Moderation Status
          <select
            className="adm-form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <p className="adm-card-sub" style={{ margin: "6px 0 0" }}>
          {purpose === "rent"
            ? "Rental listing — use Active / Rented (Sold is hidden)."
            : "Sale listing — use Active / Sold (Rented is hidden). Switch Purpose to Rent in the form below to unlock Rented."}
        </p>
      </div>

      <ListingForm
        key={property?._id || property?.id}
        initialData={toInitialData(property)}
        onSubmit={handleSubmit}
        isSubmitting={saving}
        onCloseEditor={onClose}
        onPurposeChange={handlePurposeChange}
        submitLabel="Save Changes"
      />

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title="Save changes?"
        message="Please confirm you want to apply these changes to this property on the platform."
        confirmLabel="Yes, save changes"
        cancelLabel="Cancel"
      />
    </>
  );
};

export default AdminPropertyEditor;
