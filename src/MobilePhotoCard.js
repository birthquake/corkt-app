// MobilePhotoCard.js - Enhanced with Flag Button in Actions Bar
import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useLikes } from "./useLikes";
import { LikeButton } from "./ActionBar";
import LocationDisplay from "./LocationDisplay";
import { formatTextWithHashtags } from "./hashtagService";
import analytics from "./analyticsService";

// ✅ NEW: Flag icon component
const FlagIcon = ({ color = "#6c757d", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

const MobilePhotoCard = ({
  photo,
  userInfo,
  currentUser,
  onPhotoClick,
  onUserClick,
  onHashtagClick,
  showUserInfo = true,
  showTimestamp = false,
  formatTimeAgo,
  // ✅ NEW: Add these props for location/mode context (if available)
  currentLocation = null,
  isGlobalMode = true,
  activeFilter = 'public'
}) => {
  const navigate = useNavigate();

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

  // ✅ NEW: Flag-related state
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flaggingPhoto, setFlaggingPhoto] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);

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

  // ✅ NEW: Photo flagging functions
  const handleFlagPhoto = useCallback(async (reason) => {
    if (!photo || !currentUser || flaggingPhoto) return;
    
    setFlaggingPhoto(true);
    setShowFlagMenu(false);
    
    try {
      const flagData = {
        photoId: photo.id,
        photoOwnerId: photo.uid,
        photoUrl: photo.imageUrl,
        photoCaption: photo.caption || '',
        flaggedBy: currentUser.uid,
        flaggedByEmail: currentUser.email,
        reason: reason,
        timestamp: serverTimestamp(),
        location: photo.placeName || 'Unknown location',
        flagStatus: 'pending',
        
        // Additional metadata for analytics
        userLocation: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : null,
        flaggedFromMode: isGlobalMode ? 'global' : 'local',
        flaggedFromFilter: activeFilter,
        flaggedFromSource: 'feed_card', // ✅ NEW: Track source of flag
        
        // Photo metadata
        photoLocation: photo.latitude && photo.longitude ? {
          latitude: photo.latitude,
          longitude: photo.longitude
        } : null
      };

      await addDoc(collection(db, "flags"), flagData);
      
      // Track in analytics
      analytics.trackPhotoInteraction(
        'flag',
        photo.latitude && photo.longitude ? 
          { latitude: photo.latitude, longitude: photo.longitude } : null,
        currentLocation,
        isGlobalMode ? 'global' : 'local',
        { reason, flaggedPhotoId: photo.id, source: 'feed_card' }
      );

      // Show success feedback
      setFlagSuccess(true);
      setTimeout(() => setFlagSuccess(false), 2000);
      
      console.log('✅ Photo flagged successfully from feed card:', reason);
      
    } catch (error) {
      console.error('❌ Error flagging photo:', error);
    } finally {
      setFlaggingPhoto(false);
    }
  }, [photo, currentUser, currentLocation, isGlobalMode, activeFilter, flaggingPhoto]);

  const toggleFlagMenu = useCallback(() => {
    setShowFlagMenu(prev => !prev);
  }, []);

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

  // ✅ UPDATED: Enhanced formatTimeAgo function (fallback if not provided as prop)
  const defaultFormatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return "Unknown time";
    
    // Convert Firestore timestamp to Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    
    // Convert to different time units
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    
    // Less than 1 minute
    if (diffInMinutes < 1) {
      return 'just now';
    }
    
    // Less than 1 hour - show minutes
    if (diffInHours < 1) {
      return diffInMinutes === 1 ? '1m' : `${diffInMinutes}m`;
    }
    
    // Less than 24 hours - show hours
    if (diffInDays < 1) {
      return diffInHours === 1 ? '1h' : `${diffInHours}h`;
    }
    
    // Less than 7 days - show days
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1d' : `${diffInDays}d`;
    }
    
    // 7 days or more - show actual date
    const options = {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    };
    
    return date.toLocaleDateString('en-US', options);
  }, []);

  // Use provided formatTimeAgo or fall back to default
  const timeFormatter = formatTimeAgo || defaultFormatTimeAgo;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
        position: "relative", // ✅ NEW: For absolute positioning of success message
      }}
    >
      {/* ✅ UPDATED: Clickable User Header with Conditional Timestamp */}
      {showUserInfo && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid #f8f9fa",
            cursor: onUserClick ? "pointer" : "default",
            transition: "background-color 0.2s ease",
          }}
          onClick={handleUserClick}
          onMouseEnter={(e) => {
            if (onUserClick) {
              e.target.style.backgroundColor = "#f8f9fa";
            }
          }}
          onMouseLeave={(e) => {
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
                  color: onUserClick ? "#007bff" : "#1a1a1a",
                }}
              >
                {userInfo.displayName}
              </span>
              {/* ✅ UPDATED: Conditional timestamp display */}
              {showTimestamp && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#8e8e8e",
                  }}
                >
                  • {timeFormatter(photo.timestamp)}
                </span>
              )}
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

      {/* ✅ UPDATED: Actions Bar with Flag Button */}
      <div
        style={{
          padding: "8px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between", // ✅ CHANGED: Back to space-between for flag button
        }}
      >
        {/* Like Button - Left side */}
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

        {/* ✅ NEW: Flag Button - Right side (only for other users' photos) */}
        {photo.uid !== currentUser?.uid && (
          <div style={{ position: "relative" }}>
            <button
              onClick={toggleFlagMenu}
              disabled={flaggingPhoto}
              style={{
                background: "none",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                color: "#6c757d",
                fontSize: "18px",
                transition: "all 0.2s ease",
                borderRadius: "50%",
                opacity: flaggingPhoto ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "#dc3545";
                e.target.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#6c757d";
                e.target.style.backgroundColor = "transparent";
              }}
            >
              {flaggingPhoto ? (
                <div style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid #6c757d",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              ) : (
                <FlagIcon color="currentColor" size={18} />
              )}
            </button>

            {/* Flag Menu Dropdown */}
            {showFlagMenu && (
              <div
                style={{
                  position: "absolute",
                  bottom: "45px",
                  right: "0",
                  backgroundColor: "white",
                  borderRadius: "12px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                  padding: "8px",
                  minWidth: "200px",
                  zIndex: 1000,
                  animation: "slideUpFromBottom 0.2s ease-out"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  marginBottom: "8px"
                }}>
                  <h4 style={{ 
                    margin: "0 0 4px 0", 
                    color: "#1a1a1a", 
                    fontSize: "14px", 
                    fontWeight: "600" 
                  }}>
                    Report this photo
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#666", 
                    fontSize: "12px" 
                  }}>
                    Help us keep the community safe
                  </p>
                </div>
                
                {[
                  { id: 'inappropriate', label: 'Inappropriate content', emoji: '🚫' },
                  { id: 'spam', label: 'Spam or misleading', emoji: '📢' },
                  { id: 'harassment', label: 'Harassment or bullying', emoji: '😡' },
                  { id: 'violence', label: 'Violence or dangerous', emoji: '⚠️' },
                  { id: 'copyright', label: 'Copyright violation', emoji: '©️' },
                  { id: 'other', label: 'Something else', emoji: '❓' }
                ].map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleFlagPhoto(reason.id)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      color: "#1a1a1a",
                      transition: "background-color 0.2s ease",
                      marginBottom: "4px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{reason.emoji}</span>
                    <span style={{ fontWeight: "500" }}>{reason.label}</span>
                  </button>
                ))}
                
                <div style={{
                  padding: "8px 16px",
                  borderTop: "1px solid #f0f0f0",
                  marginTop: "8px"
                }}>
                  <button
                    onClick={() => setShowFlagMenu(false)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "none",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#666",
                      fontWeight: "500"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ NEW: Success Toast for Flag Submission */}
      {flagSuccess && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(34, 197, 94, 0.95)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "500",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            animation: "fadeInOut 2s ease-out"
          }}
        >
          <span>✅</span>
          <span>Reported</span>
        </div>
      )}

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
                cursor: onUserClick ? "pointer" : "default",
                color: onUserClick ? "#007bff" : "#262626",
                transition: "color 0.2s ease"
              }}
              onClick={handleUserClick}
            >
              {userInfo.displayName}
            </span>{" "}
            {formatTextWithHashtags(photo.caption, handleHashtagClick)}
          </p>
        </div>
      )}

      {/* CSS Animations */}
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
          
          @keyframes slideUpFromBottom {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes fadeInOut {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
            20% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            80% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default MobilePhotoCard;
