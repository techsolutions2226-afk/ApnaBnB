import { useState, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import "../../styles/Common.css";

export default function ImageCarousel({
  images = [],
  alt = "Property image",
  badge = null,
  isWishlisted = false,
  onWishlistToggle = null,
  onImageClick = null,
}) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const total = images.length;

  const goTo = useCallback(
    (idx) => {
      if (idx < 0) setCurrent(total - 1);
      else if (idx >= total) setCurrent(0);
      else setCurrent(idx);
    },
    [total]
  );

  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(current - 1);
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(current + 1);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.();
  };

  /* Touch swipe support */
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(current + 1);
      else goTo(current - 1);
    }
    setTouchStart(null);
  };

  if (total === 0) return null;

  /* Visible dots: show max 5, centered on current */
  const maxDots = 5;
  let dotStart = Math.max(0, current - Math.floor(maxDots / 2));
  let dotEnd = dotStart + maxDots;
  if (dotEnd > total) {
    dotEnd = total;
    dotStart = Math.max(0, dotEnd - maxDots);
  }
  const visibleDots = Array.from(
    { length: dotEnd - dotStart },
    (_, i) => dotStart + i
  );

  return (
    <div
      className="cm-carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Badge */}
      {badge && <span className="cm-carousel-badge">{badge}</span>}

      {/* Wishlist button */}
      {onWishlistToggle && (
        <button
          className={`cm-carousel-wishlist ${isWishlisted ? "cm-carousel-wishlist--saved" : "cm-carousel-wishlist--unsaved"}`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {isWishlisted ? <FaHeart /> : <FaRegHeart />}
        </button>
      )}

      {/* Image track */}
      <div
        className="cm-carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="cm-carousel-slide"
            onClick={() => onImageClick?.(i)}
          >
            <img src={src} alt={`${alt} ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            className="cm-carousel-btn cm-carousel-btn--prev"
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <FiChevronLeft />
          </button>
          <button
            className="cm-carousel-btn cm-carousel-btn--next"
            onClick={handleNext}
            aria-label="Next image"
          >
            <FiChevronRight />
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="cm-carousel-dots">
          {visibleDots.map((idx) => (
            <button
              key={idx}
              className={`cm-carousel-dot${idx === current ? " cm-carousel-dot--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrent(idx);
              }}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
