import { useEffect, useCallback } from "react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const ImageLightbox = ({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
  }, [onClose, onNavigate, currentIndex, images.length]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-foreground text-2xl border border-border bg-card px-3 py-1 hover:bg-muted z-10"
        aria-label="Close"
      >
        ✕
      </button>

      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground text-2xl border border-border bg-card px-3 py-1 hover:bg-muted z-10"
          aria-label="Previous image"
        >
          ◀
        </button>
      )}

      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground text-2xl border border-border bg-card px-3 py-1 hover:bg-muted z-10"
          aria-label="Next image"
        >
          ▶
        </button>
      )}

      <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`Photo ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-[85vh] object-contain border border-border"
        />
        {images.length > 1 && (
          <p className="text-xs text-muted-foreground mt-2">
            {currentIndex + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
