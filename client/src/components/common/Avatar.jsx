import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import "../../styles/Common.css";

export default function Avatar({
  src,
  name = "",
  size = "md", // "sm" | "md" | "lg" | "xl"
  isSuperhost = false,
}) {
  const [imgError, setImgError] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`cm-avatar cm-avatar--${size}`}>
      {src && !imgError ? (
        <img
          className="cm-avatar-image"
          src={src}
          alt={name}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="cm-avatar-fallback">{initial}</div>
      )}
      {isSuperhost && (
        <span className="cm-avatar-badge">
          <FaCheckCircle />
        </span>
      )}
    </div>
  );
}
