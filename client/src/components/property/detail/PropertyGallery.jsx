import { useState, useRef, useCallback } from "react";
import { FiChevronLeft, FiChevronRight, FiX, FiGrid } from "react-icons/fi";

export default function PropertyGallery({ gallery = [], title }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const trackRef = useRef(null);

  const onSwipeScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(gallery.length - 1, next));
    setSwipeIndex((prev) => (prev === clamped ? prev : clamped));
  }, [gallery.length]);

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
        {/* Desktop / tablet mosaic */}
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

        {/* Mobile: thumb-swipe carousel (scroll-snap) */}
        <div
          className="pd-gallery-swipe"
          ref={trackRef}
          onScroll={onSwipeScroll}
          role="region"
          aria-roledescription="carousel"
          aria-label={title ? `${title} photos` : "Property photos"}
        >
          {gallery.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="pd-gallery-slide"
              onClick={() => openLightbox(i)}
              role="button"
              tabIndex={0}
              aria-label={`Photo ${i + 1} of ${gallery.length}`}
              onKeyDown={(e) => e.key === "Enter" && openLightbox(i)}
            >
              <img src={src} alt={`${title || "Property"} ${i + 1}`} draggable={false} />
            </div>
          ))}
        </div>

        <div className="pd-gallery-actions">
          <span className="pd-gallery-count">
            <span className="pd-gallery-count--desktop">
              {gallery.length} photo{gallery.length !== 1 ? "s" : ""}
            </span>
            <span className="pd-gallery-count--mobile">
              {swipeIndex + 1} / {gallery.length}
            </span>
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

        {gallery.length > 1 && gallery.length <= 8 && (
          <div className="pd-gallery-dots" aria-hidden="true">
            {gallery.map((_, i) => (
              <span
                key={i}
                className={`pd-gallery-dot${i === swipeIndex ? " is-active" : ""}`}
              />
            ))}
          </div>
        )}
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
