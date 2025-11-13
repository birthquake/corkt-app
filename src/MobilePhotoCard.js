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

// ✅ Flag icon component
const FlagIcon = ({ color = "var(--color-text-muted)", size = 18 }) => (
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
  currentLocation = null,
  isGlobalMode = true,
  activeFilter = 'public'
}) => {
  const navigate = useNavigate();

  const { likesCount, isLiked, toggleLike, liking } = useLikes(
    photo?.id,
    currentUser?.uid,
    photo?.uid,
    photo?.imageUrl
  );

  // Double-tap to like state
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const heartAnimationRef = useRef(null);

  // Flag-related state
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flaggingPhoto, setFlaggingPhoto] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);

  // Handle user click navigation
  const handleUserClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUserClick && photo.uid) {
      onUserClick(photo.uid);
    }
  }, [onUserClick, photo.uid]);

  // Handle hashtag clicks with navigation to search
  const handleHashtagClick = useCallback((hashtag) => {
    console.log(`🏷️ Hashtag clicked: #${hashtag}`);
    
    if (onHashtagClick) {
      onHashtagClick(hashtag);
    } else {
      navigate(`/search?hashtag=${encodeURIComponent(hashtag)}`);
      console.log(`🔍 Navigating to search for hashtag: #${hashtag}`);
    }
  }, [onHashtagClick, navigate]);

  // Photo flagging functions
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
        
        userLocation: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : null,
        flaggedFromMode: isGlobalMode ? 'global' : 'local',
        flaggedFromFilter: activeFilter,
        flaggedFromSource: 'feed_card',
        
        photoLocation: photo.latitude && photo.longitude ? {
          latitude: photo.latitude,
          longitude: photo.longitude
        } : null
      };

      await addDoc(collection(db, "flags"), flagData);
      
      analytics.trackPhotoInteraction(
        'flag',
        photo.latitude && photo.longitude ? 
          { latitude: photo.latitude, longitude: photo.longitude } : null,
        currentLocation,
        isGlobalMode ? 'global' : 'local',
        { reason, flaggedPhotoId: photo.id, source: 'feed_card' }
      );

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
      setShowHeartAnimation(true);

      if (heartAnimationRef.current) {
        clearTimeout(heartAnimationRef.current);
      }
      heartAnimationRef.current = setTimeout(() => {
        setShowHeartAnimation(false);
      }, 1000);

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

      if (distance < 30 && timeDiff < 300) {
        const now = Date.now();
        const tapGap = now - lastTap;

        if (tapGap < 300 && tapGap > 0) {
          e.preventDefault();
          handleDoubleTap();
        } else {
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

  // Long press for additional actions
  const [longPressTimer, setLongPressTimer] = useState(null);

  const handleTouchStartLongPress = useCallback(
    (e) => {
      handleTouchStart(e);

      const timer = setTimeout(() => {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

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

  // Enhanced formatTimeAgo function (fallback if not provided as prop)
  const defaultFormatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return "Unknown time";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'just now';
    }
    
    if (diffInHours < 1) {
      return diffInMinutes === 1 ? '1m' : `${diffInMinutes}m`;
    }
    
    if (diffInDays < 1) {
      return diffInHours === 1 ? '1h' : `${diffInHours}h`;
    }
    
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1d' : `${diffInDays}d`;
    }
    
    const options = {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    };
    
    return date.toLocaleDateString('en-US', options);
  }, []);

  const timeFormatter = formatTimeAgo || defaultFormatTimeAgo;

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid var(--color-border)",
        position: "relative",
      }}
    >
      {/* Clickable User Header with Conditional Timestamp */}
      {showUserInfo && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid var(--color-border)",
            cursor: onUserClick ? "pointer" : "default",
            transition: "background-color 0.2s ease",
          }}
          onClick={handleUserClick}
          onMouseEnter={(e) => {
            if (onUserClick) {
              e.target.style.backgroundColor = "var(--color-bg-tertiary)";
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
                backgroundColor: "var(--color-primary)",
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
                  color: onUserClick ? "var(--color-primary)" : "var(--color-text-primary)",
                }}
              >
                {userInfo.displayName}
              </span>
              {showTimestamp && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  • {timeFormatter(photo.timestamp)}
                </span>
              )}
            </div>

            {/* ENHANCED LOCATION DISPLAY */}
            {photo.placeName ? (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
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
          touchAction: "manipulation",
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

      {/* Actions Bar with Flag Button */}
      <div
        style={{
          padding: "8px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            color: isLiked ? "#ff3040" : "var(--color-text-primary)",
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

        {/* Flag Button - Right side (only for other users' photos) */}
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
                color: "var(--color-text-muted)",
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
                e.target.style.backgroundColor = "var(--color-bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "var(--color-text-muted)";
                e.target.style.backgroundColor = "transparent";
              }}
            >
              {flaggingPhoto ? (
                <div style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid var(--color-text-muted)",
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
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                  padding: "8px",
                  minWidth: "200px",
                  zIndex: 1000,
                  animation: "slideUpFromBottom 0.2s ease-out",
                  border: "1px solid var(--color-border)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--color-border)",
                  marginBottom: "8px"
                }}>
                  <h4 style={{ 
                    margin: "0 0 4px 0", 
                    color: "var(--color-text-primary)", 
                    fontSize: "14px", 
                    fontWeight: "600" 
                  }}>
                    Report this photo
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "var(--color-text-muted)", 
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
                      color: "var(--color-text-primary)",
                      transition: "background-color 0.2s ease",
                      marginBottom: "4px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "var(--color-bg-tertiary)";
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
                  borderTop: "1px solid var(--color-border)",
                  marginTop: "8px"
                }}>
                  <button
                    onClick={() => setShowFlagMenu(false)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "none",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      fontWeight: "500",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "var(--color-bg-tertiary)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
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

      {/* Success Toast for Flag Submission */}
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

      {/* Caption with Clickable Hashtags and Clickable Username */}
      {photo.caption && (
        <div style={{ padding: "0 16px 16px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: "20px",
              color: "var(--color-text-primary)",
            }}
          >
            <span 
              style={{ 
                fontWeight: "600",
                cursor: onUserClick ? "pointer" : "default",
                color: onUserClick ? "var(--color-primary)" : "var(--color-text-primary)",
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
