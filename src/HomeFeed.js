// Replace your photo modal section in HomeFeed.js with this enhanced version:

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
// ... your other imports

const HomeFeed = ({ photos, currentUser }) => {
  // ... your existing state and logic

  // Add these new state variables for gesture handling
  const [modalTranslateY, setModalTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslateX, setImageTranslateX] = useState(0);
  const [imageTranslateY, setImageTranslateY] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef(null);
  const imageRef = useRef(null);
  const dragStartRef = useRef({ y: 0, time: 0 });

  // Reset zoom and position when photo changes
  useEffect(() => {
    if (selectedPhoto) {
      setImageScale(1);
      setImageTranslateX(0);
      setImageTranslateY(0);
      setModalTranslateY(0);
      setIsDragging(false);
      setIsZooming(false);
    }
  }, [selectedPhoto?.id]);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Calculate center point between two touches
  const getTouchCenter = useCallback((touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Handle touch start for gestures
  const handleTouchStart = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;
    
    if (touches.length === 1) {
      // Single touch - start drag tracking
      const touch = touches[0];
      dragStartRef.current = {
        y: touch.clientY,
        time: Date.now()
      };
      setIsDragging(false);
    } else if (touches.length === 2) {
      // Two fingers - start zoom tracking
      e.preventDefault();
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
      setIsZooming(true);
      setIsDragging(false);
    }
  }, [selectedPhoto, getTouchDistance, getTouchCenter]);

  // Handle touch move for gestures
  const handleTouchMove = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;

    if (touches.length === 1 && !isZooming) {
      // Single touch - handle drag to dismiss (only if not zoomed)
      if (imageScale <= 1.1) {
        const touch = touches[0];
        const deltaY = touch.clientY - dragStartRef.current.y;
        
        if (Math.abs(deltaY) > 10) {
          setIsDragging(true);
          
          // Apply elastic resistance
          const resistance = 0.5;
          const translatedY = deltaY * resistance;
          
          // Only allow downward drag for dismiss
          if (translatedY > 0) {
            setModalTranslateY(translatedY);
          }
        }
      } else {
        // Handle panning when zoomed
        e.preventDefault();
        const touch = touches[0];
        const deltaX = (touch.clientX - lastTouchCenter.x) * 0.5;
        const deltaY = (touch.clientY - lastTouchCenter.y) * 0.5;
        
        setImageTranslateX(prev => prev + deltaX);
        setImageTranslateY(prev => prev + deltaY);
        setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
      }
    } else if (touches.length === 2) {
      // Two fingers - handle zoom
      e.preventDefault();
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.min(Math.max(imageScale * scaleChange, 0.5), 4);
        
        setImageScale(newScale);
        
        // Adjust position based on zoom center
        const deltaX = (center.x - lastTouchCenter.x) * 0.5;
        const deltaY = (center.y - lastTouchCenter.y) * 0.5;
        
        setImageTranslateX(prev => prev + deltaX);
        setImageTranslateY(prev => prev + deltaY);
      }
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  }, [selectedPhoto, isZooming, imageScale, lastTouchDistance, lastTouchCenter, getTouchDistance, getTouchCenter]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;

    if (touches.length === 0) {
      // All fingers lifted
      if (isDragging) {
        // Check if drag distance is enough to dismiss
        const dismissThreshold = 100;
        if (modalTranslateY > dismissThreshold) {
          closePhotoModal();
        } else {
          // Snap back
          setModalTranslateY(0);
        }
        setIsDragging(false);
      }
      
      setIsZooming(false);
      setLastTouchDistance(0);
      
      // If image is zoomed out too much, reset to normal
      if (imageScale < 1) {
        setImageScale(1);
        setImageTranslateX(0);
        setImageTranslateY(0);
      }
    } else if (touches.length === 1 && isZooming) {
      // One finger remaining after pinch
      setIsZooming(false);
      const touch = touches[0];
      setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
    }
  }, [selectedPhoto, isDragging, modalTranslateY, closePhotoModal, imageScale, isZooming]);

  // Double tap to zoom
  const handleDoubleTab = useCallback((e) => {
    if (!selectedPhoto) return;
    
    e.preventDefault();
    
    if (imageScale > 1) {
      // Reset zoom
      setImageScale(1);
      setImageTranslateX(0);
      setImageTranslateY(0);
    } else {
      // Zoom to 2x at tap location
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = e.clientX - rect.left - rect.width / 2;
        const centerY = e.clientY - rect.top - rect.height / 2;
        
        setImageScale(2);
        setImageTranslateX(-centerX * 0.5);
        setImageTranslateY(-centerY * 0.5);
      }
    }
  }, [selectedPhoto, imageScale]);

  // Your existing closePhotoModal with gesture reset
  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
    setModalTranslateY(0);
    setImageScale(1);
    setImageTranslateX(0);
    setImageTranslateY(0);
    setIsDragging(false);
    setIsZooming(false);
  }, []);

  // ... rest of your existing HomeFeed logic

  return (
    <div
      style={{
        maxWidth: "500px", 
        margin: "0 auto", 
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",  
        paddingTop: "16px",
      }}
    >
      {/* Your existing content */}
      
      {/* Enhanced Photo Modal with Gestures */}
      {selectedPhoto && (
        <div
          ref={modalRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(0, 0, 0, ${Math.max(0.95 - modalTranslateY * 0.002, 0.3)})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px 20px 110px 20px",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
            transition: isDragging ? 'none' : 'all 0.3s ease-out',
          }}
          onClick={(e) => {
            if (e.target === modalRef.current && imageScale <= 1.1) {
              closePhotoModal();
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              maxWidth: "90vw",
              maxHeight: "calc(100vh - 130px)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              transform: `translateY(${modalTranslateY}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: Math.max(1 - modalTranslateY * 0.01, 0.3),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Your existing header code */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  cursor: "pointer"
                }}
                onClick={() => handleUserClick(selectedPhoto.uid)}
              >
                {getUserInfo(selectedPhoto).profilePicture ? (
                  <img
                    src={getUserInfo(selectedPhoto).profilePicture}
                    alt={getUserInfo(selectedPhoto).displayName}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#007bff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {getUserInfo(selectedPhoto).initials}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#343a40",
                    }}
                  >
                    {getUserInfo(selectedPhoto).displayName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    @{getUserInfo(selectedPhoto).screenName}
                  </div>
                </div>
              </div>
              <button
                onClick={closePhotoModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "4px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Enhanced Photo Container with Zoom */}
            <div
              style={{
                flex: "0 0 auto",
                maxHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa",
                overflow: "hidden",
                position: "relative",
                touchAction: "none", // Prevent default touch behaviors
              }}
            >
              <img
                ref={imageRef}
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || "Photo"}
                style={{
                  width: "100%",
                  height: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                  transform: `scale(${imageScale}) translate(${imageTranslateX}px, ${imageTranslateY}px)`,
                  transition: (isDragging || isZooming) ? 'none' : 'transform 0.3s ease-out',
                  cursor: imageScale > 1 ? 'grab' : 'default',
                }}
                onDoubleClick={handleDoubleTab}
                draggable={false}
              />
              
              {/* Zoom indicator */}
              {imageScale > 1.1 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    pointerEvents: "none",
                  }}
                >
                  {Math.round(imageScale * 100)}%
                </div>
              )}
            </div>

            {/* Your existing modal content - caption, location, etc. */}
            <div
              style={{
                padding: "20px",
                flex: "1 1 auto",
                overflow: "auto",
                maxHeight: "30vh",
              }}
            >
              {/* Your existing modal content goes here */}
              {/* Privacy indicator, caption, tagged users, time/location, interaction summary */}
            </div>

            {/* Your existing close button */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #f0f0f0",
                backgroundColor: "#ffffff",
                flexShrink: 0,
              }}
            >
              <button
                onClick={closePhotoModal}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#007bff",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Your existing styles */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default HomeFeed;
