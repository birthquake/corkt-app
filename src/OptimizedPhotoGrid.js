// OptimizedPhotoGrid.js - New component for ProfilePage
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createLazyImageObserver } from "./imageOptimization";

/**
 * Optimized photo grid with lazy loading and virtualization
 * Significantly improves performance for users with many photos
 */
const OptimizedPhotoGrid = ({
  photos,
  editMode = false,
  onDeleteClick,
  deleting = false,
  onPhotoClick,
}) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());
  const observerRef = useRef(null);
  const gridRef = useRef(null);

  // Memoize photos to prevent unnecessary re-renders
  const memoizedPhotos = useMemo(
    () => photos,
    [photos.map((p) => p.id).join(",")]
  );

  // Initialize lazy loading observer
  useEffect(() => {
    const observer = createLazyImageObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const photoId = img.dataset.photoId;

            if (photoId && !loadedImages.has(photoId)) {
              // Start loading the actual image
              const fullImg = new Image();
              fullImg.onload = () => {
                setLoadedImages((prev) => new Set([...prev, photoId]));
                img.src = fullImg.src;
                img.style.opacity = "1";
                observer.unobserve(img);
              };
              fullImg.onerror = () => {
                setImageErrors((prev) => new Set([...prev, photoId]));
                observer.unobserve(img);
              };
              fullImg.src = img.dataset.src;
            }
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadedImages]);

  // Observe new images when photos change
  useEffect(() => {
    if (observerRef.current && gridRef.current) {
      const images = gridRef.current.querySelectorAll(".lazy-image");
      images.forEach((img) => {
        if (!img.dataset.observed) {
          observerRef.current.observe(img);
          img.dataset.observed = "true";
        }
      });
    }
  }, [memoizedPhotos]);

  const handleImageClick = useCallback(
    (photo) => {
      if (!editMode && onPhotoClick) {
        onPhotoClick(photo);
      }
    },
    [editMode, onPhotoClick]
  );

  const handleDeleteClick = useCallback(
    (photo, event) => {
      event.stopPropagation();
      if (onDeleteClick) {
        onDeleteClick(photo);
      }
    },
    [onDeleteClick]
  );

  // Generate blur placeholder for better perceived performance
  const generatePlaceholder = (width = 10, height = 10) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Create a simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f8f9fa");
    gradient.addColorStop(1, "#e9ecef");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL();
  };

  if (memoizedPhotos.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "#6c757d",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📸</div>
        <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>No photos yet</h3>
        <p style={{ margin: 0, fontSize: "14px" }}>
          Start capturing memories to see them here!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "2px",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {memoizedPhotos.map((photo) => {
        const isLoaded = loadedImages.has(photo.id);
        const hasError = imageErrors.has(photo.id);

        return (
          <PhotoGridItem
            key={photo.id}
            photo={photo}
            isLoaded={isLoaded}
            hasError={hasError}
            editMode={editMode}
            deleting={deleting}
            placeholder={generatePlaceholder()}
            onClick={() => handleImageClick(photo)}
            onDeleteClick={(e) => handleDeleteClick(photo, e)}
          />
        );
      })}
    </div>
  );
};

/**
 * Individual photo grid item - memoized for performance
 */
const PhotoGridItem = React.memo(
  ({
    photo,
    isLoaded,
    hasError,
    editMode,
    deleting,
    placeholder,
    onClick,
    onDeleteClick,
  }) => {
    return (
      <div
        style={{
          aspectRatio: "1",
          overflow: "hidden",
          cursor: editMode ? "default" : "pointer",
          position: "relative",
          backgroundColor: "#f8f9fa",
        }}
        onClick={onClick}
      >
        {hasError ? (
          // Error state
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8f9fa",
              color: "#6c757d",
              fontSize: "24px",
            }}
          >
            ⚠️
          </div>
        ) : (
          // Lazy loaded image
          <img
            className="lazy-image"
            data-photo-id={photo.id}
            data-src={photo.imageUrl}
            src={placeholder}
            alt={photo.caption || "Photo"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "opacity 0.3s ease, transform 0.2s ease",
              opacity: isLoaded ? 1 : 0.7,
              transform: editMode ? "none" : "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!editMode && isLoaded) {
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!editMode) {
                e.target.style.transform = "scale(1)";
              }
            }}
            loading="lazy" // Native lazy loading as fallback
          />
        )}

        {/* Loading indicator */}
        {!isLoaded && !hasError && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#007bff",
              fontSize: "16px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid #e9ecef",
                borderTop: "2px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}

        {/* Delete button in edit mode */}
        {editMode && (
          <button
            onClick={onDeleteClick}
            disabled={deleting}
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(220, 53, 69, 0.9)",
              color: "white",
              border: "none",
              fontSize: "14px",
              cursor: deleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: deleting ? 0.6 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);

PhotoGridItem.displayName = "PhotoGridItem";

export default OptimizedPhotoGrid;
