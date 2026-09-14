import { FiMapPin } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { formatDetectedPlace } from "../../utils/searchLocation";

/* ═════════════════════════════════════════════════════════
   DetectedLocationHint — one line under the hero search saying where the
   default City came from ("Showing homes near Lahore, Punjab, Pakistan"),
   with a Change button that opens the existing City dropdown.

   Only shown while the City is still the detected default: once the user
   picks a city themselves the line would be stale, so it disappears.
   ═════════════════════════════════════════════════════════ */
export default function DetectedLocationHint({ city, detected, isManual, onChange }) {
  const { t } = useTranslation("home");
  if (isManual || !city || !detected) return null;

  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-white/90">
      <FiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t("location.near", { place: formatDetectedPlace(city, detected) })}</span>
      <button
        type="button"
        onClick={onChange}
        className="font-semibold underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded"
      >
        {t("location.change")}
      </button>
    </p>
  );
}
