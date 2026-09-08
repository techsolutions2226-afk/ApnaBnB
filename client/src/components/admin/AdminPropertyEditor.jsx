import { useState, useEffect } from "react";
import ListingForm from "../listing/ListingForm";
import ConfirmDialog from "../common/ConfirmDialog";
import {
  formToPropertyPayload,
  propertyToFormInitial,
} from "../../utils/propertyPayload";

/* ── AdminPropertyEditor — reuse the dashboard's ListingForm ──
   The exact form used to create/edit listings on the dashboards, so the admin
   gets the same amenities groups, map picker, and drag-and-drop photo upload.
   Only the moderation `status` is added. Saving asks for confirmation. */

const PROPERTY_STATUSES = ["active", "pending", "sold", "rented", "featured", "rejected"];

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
    setPending(formToPropertyPayload(output, { status: nextStatus }));
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
        initialData={propertyToFormInitial(property)}
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
