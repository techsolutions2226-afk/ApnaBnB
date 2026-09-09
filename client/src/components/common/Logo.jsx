import { LOGO_SRC, LOGO_ALT } from "../../config/brand";

/* Single logo component for the whole app.
   Replace client/public/logo.png (same filename) to update every page. */
export default function Logo({ size = 32, alt = LOGO_ALT, className = "" }) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={className}
      style={{
        height: size,
        width: "auto",
        maxWidth: size * 3.2,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
