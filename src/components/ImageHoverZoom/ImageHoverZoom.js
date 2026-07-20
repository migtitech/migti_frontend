import { useEffect, useState } from "react";

/**
 * Global, app-wide image hover-zoom. Mounted once at the app root, it uses
 * event delegation so it applies to EVERY <img> in the app — current pages,
 * lazily-mounted ones, modals, tables — without touching each call site.
 *
 * On hovering an eligible image, a full-screen overlay shows the same image
 * enlarged (object-fit: contain, so nothing is cropped). It reuses the src the
 * browser has already loaded, so it works for AuthImage blob URLs, data URIs,
 * and remote URLs alike — no re-fetch, no auth concerns.
 *
 * Opt-outs (so icons / avatars / logos don't blow up full screen):
 *  - images smaller than MIN_SIZE px in either dimension
 *  - any <img data-no-zoom> (or inside an element marked data-no-zoom)
 *  - images with no usable src
 */
const MIN_SIZE = 48;

const isEligible = (img) => {
  if (!img || img.tagName !== "IMG") return false;
  if (!img.currentSrc && !img.src) return false;
  if (img.closest("[data-no-zoom]")) return false;
  const rect = img.getBoundingClientRect();
  // Use the rendered box; fall back to natural size for not-yet-laid-out imgs.
  const w = rect.width || img.naturalWidth || 0;
  const h = rect.height || img.naturalHeight || 0;
  return w >= MIN_SIZE && h >= MIN_SIZE;
};

const ImageHoverZoom = () => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const onOver = (e) => {
      const img = e.target;
      if (!isEligible(img)) return;
      setSrc(img.currentSrc || img.src);
    };
    const onOut = (e) => {
      if (e.target?.tagName === "IMG") setSrc(null);
    };
    const clear = () => setSrc(null);

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    // Hide the overlay if the page scrolls or the window loses focus while the
    // pointer is still technically "over" the (now moved) image.
    window.addEventListener("scroll", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, []);

  if (!src) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "rgba(0, 0, 0, 0.82)",
        pointerEvents: "none",
      }}
    >
      <img
        src={src}
        alt=""
        data-no-zoom
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        }}
      />
    </div>
  );
};

export default ImageHoverZoom;
