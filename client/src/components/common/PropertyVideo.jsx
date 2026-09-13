import { isDirectVideoUrl } from "../../utils/cloudinaryUrl";
import "../../styles/PropertyVideo.css";

/**
 * PropertyVideo — embedded player for Cloudinary (or direct file) videos.
 * Falls back to an external link for legacy non-file URLs (e.g. YouTube).
 */
export default function PropertyVideo({
  url,
  title = "Property video",
  className = "",
}) {
  if (!url) return null;

  if (isDirectVideoUrl(url)) {
    return (
      <div className={`property-video ${className}`.trim()}>
        <video
          src={url}
          controls
          preload="metadata"
          playsInline
          className="property-video__player"
          aria-label={title}
        >
          Your browser does not support embedded video.
        </video>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`property-video__link ${className}`.trim()}
    >
      Watch property video
    </a>
  );
}
