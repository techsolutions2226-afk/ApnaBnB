import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX, FiGrid } from "react-icons/fi";

export default function PropertyGallery({ gallery = [], title }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!gallery || gallery.length === 0) {
    return (
      <div className="pd-gallery pd-gallery--empty">
        <div className="pd-gallery-empty-msg">No photos available</div>
      </div>
    );
  }

  const openLightbox = (idx = 0) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const lightboxPrev = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i === 0 ? gallery.length - 1 : i - 1));
  };
  const lightboxNext = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i === gallery.length - 1 ? 0 : i + 1));
  };

  const sideCount = Math.min(4, Math.max(0, gallery.length - 1));
  const sideImages = gallery.slice(1, 1 + sideCount);

  return (
    <>
      <div className="pd-gallery">
        <div
          className="pd-gallery-main"
          onClick={() => openLightbox(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openLightbox(0)}
        >
          <img src={gallery[0]} alt={title || "Property"} />
        </div>

        {sideImages.length > 0 && (
          <div
            className={`pd-gallery-side pd-gallery-side--${sideImages.length}`}
          >
            {sideImages.map((src, i) => (
              <div
                key={i}
                className="pd-gallery-thumb"
                onClick={() => openLightbox(i + 1)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openLightbox(i + 1)}
              >
                <img src={src} alt={`${title || "Property"} ${i + 2}`} />
              </div>
            ))}
          </div>
        )}

        <div className="pd-gallery-actions">
          <span className="pd-gallery-count">
            {gallery.length} photo{gallery.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="pd-show-all-btn"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(0);
            }}
          >
            <FiGrid size={14} />
            Show all photos
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="pd-lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="pd-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
          <div className="pd-lightbox-counter">
            {lightboxIndex + 1} / {gallery.length}
          </div>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                className="pd-lightbox-arrow pd-lightbox-arrow--prev"
                onClick={lightboxPrev}
                aria-label="Previous"
              >
                <FiChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="pd-lightbox-arrow pd-lightbox-arrow--next"
                onClick={lightboxNext}
                aria-label="Next"
              >
                <FiChevronRight size={28} />
              </button>
            </>
          )}
          <img
            className="pd-lightbox-img"
            src={gallery[lightboxIndex]}
            alt={`${title || "Property"} ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
