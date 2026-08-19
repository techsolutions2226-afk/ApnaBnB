/* ImageLightbox — full-screen image viewer with zoom, prev/next, download and
   a position counter. Works with any array of image URLs. */
import { useEffect, useState } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiDownload, FiZoomIn, FiZoomOut } from "react-icons/fi";

const ImageLightbox = ({ images = [], index = 0, onClose, title }) => {
  const [i, setI] = useState(index);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!images.length) return null;
  const src = images[i];

  return (
    <div className="lightbox" onClick={onClose}>
      <img
        src={src}
        alt={title || "attachment"}
        className={`lightbox-img ${zoom ? "lightbox-img--zoom" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setZoom((z) => !z);
        }}
      />
      <div className="lightbox-top" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-count">
          {i + 1} / {images.length}
        </span>
        <div className="lightbox-actions">
          {zoom ? (
            <FiZoomOut size={22} onClick={() => setZoom(false)} />
          ) : (
            <FiZoomIn size={22} onClick={() => setZoom(true)} />
          )}
          <a href={src} download target="_blank" rel="noopener noreferrer">
            <FiDownload size={22} />
          </a>
          <FiX size={26} onClick={onClose} />
        </div>
      </div>
      {images.length > 1 && (
        <div className="lightbox-nav" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setI((p) => (p - 1 + images.length) % images.length)} aria-label="Previous">
            <FiChevronLeft size={30} />
          </button>
          <button type="button" onClick={() => setI((p) => (p + 1) % images.length)} aria-label="Next">
            <FiChevronRight size={30} />
          </button>
        </div>
      )}
      <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
        {images.map((_, k) => (
          <span key={k} className={`lightbox-dot ${k === i ? "lightbox-dot--on" : ""}`} onClick={() => setI(k)} />
        ))}
      </div>
    </div>
  );
};

export default ImageLightbox;