import { useState, useEffect, useCallback } from "react";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";
import Carousel from "./Carousel";
import "./hotelgallery.css";

const VISIBLE = 5;

const HotelGallery = ({ images = [] }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i + 1) % images.length),
    [images.length],
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, next, prev]);

  if (!images.length) return null;

  const visible = images.slice(0, VISIBLE);
  const rest = images.length - VISIBLE;
  const isOpen = openIndex !== null;

  return (
    <>
      {/* Мобильная карусель */}
      <div className="hgal-mobile">
        <Carousel data={images.slice(0, 10)} />
      </div>

      {/* Десктопная сетка: слева большое фото, справа 2x2, на последнем «+N more» */}
      <div className="hgal-grid">
        {visible.map((img, idx) => (
          <button
            key={idx}
            type="button"
            className={`hgal-cell${idx === 0 ? " hgal-cell--big" : ""}`}
            onClick={() => setOpenIndex(idx === VISIBLE - 1 && rest > 0 ? VISIBLE : idx)}
          >
            <img src={img.url} alt={img.alt || ""} loading="lazy" />
            {idx === VISIBLE - 1 && rest > 0 && (
              <span className="hgal-more">+{rest} more</span>
            )}
          </button>
        ))}
      </div>

      {/* Попап (lightbox) со всеми фото */}
      {isOpen && (
        <div className="hgal-popup" onClick={close}>
          <button type="button" className="hgal-popup-close" onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
          <button
            type="button"
            className="hgal-popup-arrow hgal-popup-arrow--left"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
          >
            <ArrowBackIosIcon />
          </button>
          <img
            className="hgal-popup-img"
            src={images[openIndex]?.url}
            alt={images[openIndex]?.alt || ""}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="hgal-popup-arrow hgal-popup-arrow--right"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
          >
            <ArrowForwardIosIcon />
          </button>
          <span className="hgal-popup-counter" onClick={(e) => e.stopPropagation()}>
            {openIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
};

export default HotelGallery;
