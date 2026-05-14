import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

export default function PropertyGallery({ gallery, title }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (idx = 0) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const lightboxPrev = () =>
    setLightboxIndex((i) => (i === 0 ? gallery.length - 1 : i - 1));
  const lightboxNext = () =>
    setLightboxIndex((i) => (i === gallery.length - 1 ? 0 : i + 1));

  return (
    <>
      <div className="pd-gallery" onClick={() => openLightbox(0)}>
        <div className="pd-gallery-main">
          <img src={gallery[0]} alt={title} />
        </div>
        <div className="pd-gallery-side">
          {gallery.slice(1, 5).map((src, i) => (
            <div key={i} className="pd-gallery-thumb">
              <img src={src} alt={`${title} ${i + 2}`} />
            </div>
          ))}
        </div>
        <button
          className="pd-show-all-btn"
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(0);
          }}
        >
          Show all photos
        </button>
      </div>

      {lightboxOpen && (
        <div
          className="pd-lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="pd-lightbox-close"
            onClick={() => setLightboxOpen(false)}
          >
            <FiX size={20} />
          </button>
          <div className="pd-lightbox-counter">
            {lightboxIndex + 1} / {gallery.length}
          </div>
          <button
            className="pd-lightbox-arrow pd-lightbox-arrow--prev"
            onClick={(e) => {
              e.stopPropagation();
              lightboxPrev();
            }}
          >
            <FiChevronLeft size={28} />
          </button>
          <img
            className="pd-lightbox-img"
            src={gallery[lightboxIndex]}
            alt={`${title} ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="pd-lightbox-arrow pd-lightbox-arrow--next"
            onClick={(e) => {
              e.stopPropagation();
              lightboxNext();
            }}
          >
            <FiChevronRight size={28} />
          </button>
        </div>
      )}
    </>
  );
}
