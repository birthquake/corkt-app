import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom"; // ✅ NEW: For navigation to search
import { useLikes } from "./useLikes";
import { LikeButton } from "./ActionBar";
import LocationDisplay from "./LocationDisplay";
import { formatTextWithHashtags } from "./hashtagService"; // ✅ NEW: Import hashtag formatting

const MobilePhotoCard = ({
  photo,
  userInfo,
  currentUser,
  onPhotoClick,
  onUserClick, // ✅ NEW: Callback for user clicks
  onHashtagClick, // ✅ NEW: Callback for hashtag clicks (optional)
  showUserInfo = true,
}) => {
  const navigate = useNavigate(); // ✅ NEW: Navigation hook

  // ✅ UPDATED: Enhanced useLikes integration with activity creation parameters
  const { likesCount, isLiked, toggleLike, liking } = useLikes(
    photo?.id,
    currentUser?.uid,
    photo?.uid,       // ✅ FIXED: Photo owner ID (correct field name)
    photo?.imageUrl   // Photo URL for activity thumbnail
  );

  // Double-tap to like state
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const heartAnimationRef = useRef(null);

  // ✅ NEW: Handle user click navigation
  const handleUserClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUserClick && photo.uid) {
      onUserClick(photo.uid);
    }
  }, [onUserClick, photo.uid]);

  // ✅ ENHANCED: Handle hashtag clicks with navigation to search
  const handleHashtagClick = useCallback((hashtag) => {
    console.log(`🏷️ Hashtag clicked: #${hashtag}`);
    
    if (onHashtagClick) {
      // Use custom handler if provided
      onHashtagClick(hashtag);
    } else {
      // Default behavior: navigate to search page with hashtag
      navigate(`/search?hashtag=${encodeURIComponent(hashtag)}`);
      console.log(`🔍 Navigating to search for hashtag: #${hashtag}`);
    }
  }, [onHashtagClick, navigate]);

  // Handle double-tap to like
  const handleDoubleTap = useCallback(async () => {
    if (!isLiked && !liking) {
      // Trigger heart animation
      setShowHeartAnimation(true);

      // Auto-hide heart after animation
      if (heartAnimationRef.current) {
        clearTimeout(heartAnimationRef.current);
      }
      heartAnimationRef.current = setTimeout(() => {
        setShowHeartAnimation(false);
      }, 1000);

      // Like the photo
      try {
        await toggleLike();
      } catch (error) {
        console.error("Error liking photo:", error);
      }
    }
  }, [isLiked, liking, toggleLike]);

  // Handle touch events for double-tap detection
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const touch = e.changedTouches[0];
      const touchEnd = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const touchStart = touchStartRef.current;
      const timeDiff = touchEnd.time - touchStart.time;
      const distance = Math.sqrt(
        Math.pow(touchEnd.x - touchStart.x, 2) +
          Math.pow(touchEnd.y - touchStart.y, 2)
      );

      // Check if it's a tap (not a drag) and quick enough
      if (distance < 30 && timeDiff < 300) {
        const now = Date.now();
        const tapGap = now - lastTap;

        if (tapGap < 300 && tapGap > 0) {
          // Double tap detected!
          e.preventDefault();
          handleDoubleTap();
        } else {
          // Single tap - open photo after delay to check for double tap
          setTimeout(() => {
            const newTapGap = Date.now() - now;
            if (newTapGap >= 300 && onPhotoClick) {
              onPhotoClick(photo);
            }
          }, 300);
        }

        setLastTap(now);
      }
    },
    [lastTap, handleDoubleTap, onPhotoClick, photo]
  );

  // Long press for additional actions (future feature)
  const [longPressTimer, setLongPressTimer] = useState(null);

  const handleTouchStartLongPress = useCallback(
    (e) => {
      handleTouchStart(e);

      const timer = setTimeout(() => {
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        // Show additional actions menu (future feature)
        console.log("Long press detected - could show context menu");
      }, 500);

      setLongPressTimer(timer);
    },
    [handleTouchStart]
  );

  const handleTouchEndLongPress = useCallback(
    (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      handleTouchEnd(e);
    },
    [longPressTimer, handleTouchEnd]
  );

  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return "Unknown time";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
      }}
    >
      {/* ✅ UPDATED: Clickable User Header */}
      {showUserInfo && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid #f8f9fa",
            cursor: onUserClick ? "pointer" : "default", // ✅ NEW: Show pointer cursor when clickable
            transition: "background-color 0.2s ease", // ✅ NEW: Smooth hover transition
          }}
          onClick={handleUserClick} // ✅ NEW: Make entire header clickable
          onMouseEnter={(e) => {
            // ✅ NEW: Hover effect
            if (onUserClick) {
              e.target.style.backgroundColor = "#f8f9fa";
            }
          }}
          onMouseLeave={(e) => {
            // ✅ NEW: Remove hover effect
            if (onUserClick) {
              e.target.style.backgroundColor = "transparent";
            }
          }}
        >
          {userInfo.profilePicture ? (
            <img
              src={userInfo.profilePicture}
              alt={userInfo.displayName}
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
              {userInfo.initials}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontWeight: "600",
                  fontSize: "14px",
                  color: onUserClick ? "#007bff" : "#1a1a1a", // ✅ NEW: Blue color when clickable
                }}
              >
                {userInfo.displayName}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#8e8e8e",
                }}
              >
                • {formatTimeAgo(photo.timestamp)}
              </span>
            </div>

            {/* ENHANCED LOCATION DISPLAY */}
            {photo.placeName ? (
              // Existing: Show specific place name
              <div
                style={{
                  fontSize: "12px",
                  color: "#8e8e8e",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "2px",
                }}
              >
                <span>📍</span>
                <span>{photo.placeName}</span>
              </div>
            ) : photo.latitude && photo.longitude ? (
              // NEW: Show reverse geocoded location for coordinate-only photos
              <LocationDisplay
                latitude={photo.latitude}
                longitude={photo.longitude}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Photo Container with Touch Interactions */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1",
          overflow: "hidden",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation", // Prevents zoom on double-tap
        }}
        onTouchStart={handleTouchStartLongPress}
        onTouchEnd={handleTouchEndLongPress}
      >
        <img
          src={photo.imageUrl}
          alt={photo.caption || "Photo"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          draggable={false}
        />

        {/* Double-tap Heart Animation */}
        {showHeartAnimation && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "80px",
              color: "#ff3040",
              animation: "heartPulse 1s ease-out",
              pointerEvents: "none",
              zIndex: 10,
              textShadow: "0 0 20px rgba(255, 48, 64, 0.5)",
            }}
          >
            ❤️
          </div>
        )}

        {/* Gradient overlay for better text readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "80px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.3))",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Actions Bar - SIMPLIFIED to only show the like button */}
      <div
        style={{
          padding: "8px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start", // Changed from space-between since we only have one button
        }}
      >
        {/* Like Button - Only button remaining */}
        <button
          onClick={toggleLike}
          disabled={liking}
          style={{
            background: "none",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: isLiked ? "#ff3040" : "#262626",
            fontSize: "24px",
            transition: "transform 0.1s ease",
            borderRadius: "50%",
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.9)";
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isLiked ? "❤️" : "🤍"}
          {likesCount > 0 && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: "500",
                marginLeft: "4px",
              }}
            >
              {likesCount}
            </span>
          )}
        </button>

        {/* REMOVED: Comment Button and Share Button */}
      </div>

      {/* ✅ ENHANCED: Caption with Clickable Hashtags and Clickable Username */}
      {photo.caption && (
        <div style={{ padding: "0 16px 16px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: "20px",
              color: "#262626",
            }}
          >
            <span 
              style={{ 
                fontWeight: "600",
                cursor: onUserClick ? "pointer" : "default", // ✅ NEW: Clickable username in caption
                color: onUserClick ? "#007bff" : "#262626", // ✅ NEW: Blue color when clickable
                transition: "color 0.2s ease"
              }}
              onClick={handleUserClick} // ✅ NEW: Make username in caption clickable
            >
              {userInfo.displayName}
            </span>{" "}
            {formatTextWithHashtags(photo.caption, handleHashtagClick)}
          </p>
        </div>
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes heartPulse {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 0;
            }
            15% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 1;
            }
            30% {
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default MobilePhotoCard;
