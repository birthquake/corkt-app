import React, { useState } from "react";
import { useLikes } from "./useLikes";

// Main ActionBar component for photo interactions
export const ActionBar = ({
  photo,
  currentUserId,
  onLike,
  onComment,
  onShare,
  showCounts = true,
  size = "medium",
}) => {
  const { likesCount, isLiked, toggleLike, liking } = useLikes(
    photo?.id,
    currentUserId
  );
  const [sharing, setSharing] = useState(false);

  // Handle like with callback
  const handleLike = async () => {
    try {
      await toggleLike();
      if (onLike) {
        onLike(photo?.id);
      }
    } catch (error) {
      console.error("Error liking photo:", error);
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share && photo) {
        await navigator.share({
          title: `Check out this photo on Corkt`,
          text: photo.caption || "Amazing photo!",
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `Check out this photo on Corkt: ${
          photo?.caption || "Amazing photo!"
        }`;
        await navigator.clipboard.writeText(shareText);

        // Show temporary feedback
        const button = document.activeElement;
        const originalText = button?.textContent;
        if (button) {
          button.textContent = "Copied!";
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      }

      if (onShare) {
        onShare(photo?.id);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    } finally {
      setSharing(false);
    }
  };

  // Handle comment functionality
  const handleComment = () => {
    if (onComment) {
      onComment(photo?.id);
    }
    // For now, just focus on comment input if it exists
    const commentInput = document.querySelector(
      'input[placeholder*="comment"]'
    );
    if (commentInput) {
      commentInput.focus();
    }
  };

  // Style configurations
  const sizeConfig = {
    small: { iconSize: 20, padding: "4px 8px", fontSize: "12px" },
    medium: { iconSize: 24, padding: "8px 16px", fontSize: "14px" },
    large: { iconSize: 28, padding: "12px 20px", fontSize: "16px" },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  const buttonStyle = {
    background: "none",
    border: "none",
    padding: config.padding,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    fontSize: config.fontSize,
    fontWeight: "500",
  };

  const iconStyle = {
    fontSize: `${config.iconSize}px`,
    lineHeight: 1,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 4px",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      {/* Left side - Like and Comment */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={liking || !currentUserId}
          style={{
            ...buttonStyle,
            color: isLiked ? "#e91e63" : "#8e8e8e",
            opacity: liking ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLiked) e.target.style.color = "#e91e63";
          }}
          onMouseLeave={(e) => {
            if (!isLiked) e.target.style.color = "#8e8e8e";
          }}
        >
          <span style={iconStyle}>{isLiked ? "♥" : "♡"}</span>
          {showCounts && likesCount > 0 && <span>{likesCount}</span>}
        </button>

        {/* Comment Button */}
        <button
          onClick={handleComment}
          style={{
            ...buttonStyle,
            color: "#8e8e8e",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#007bff")}
          onMouseLeave={(e) => (e.target.style.color = "#8e8e8e")}
        >
          <span style={iconStyle}>💬</span>
          {/* {showCounts && <span>0</span>} */}
        </button>
      </div>

      {/* Right side - Share */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            ...buttonStyle,
            color: "#8e8e8e",
            opacity: sharing ? 0.6 : 1,
          }}
          onMouseEnter={(e) => (e.target.style.color = "#28a745")}
          onMouseLeave={(e) => (e.target.style.color = "#8e8e8e")}
        >
          <span style={iconStyle}>📤</span>
        </button>
      </div>
    </div>
  );
};

// Simplified Like Button for quick use
export const LikeButton = ({
  photoId,
  currentUserId,
  size = 24,
  showCount = false,
  style = {},
}) => {
  const { likesCount, isLiked, toggleLike, liking } = useLikes(
    photoId,
    currentUserId
  );

  return (
    <button
      onClick={toggleLike}
      disabled={liking || !currentUserId}
      style={{
        background: "none",
        border: "none",
        fontSize: `${size}px`,
        cursor: liking || !currentUserId ? "not-allowed" : "pointer",
        padding: "8px",
        color: isLiked ? "#e91e63" : "#8e8e8e",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        borderRadius: "8px",
        transition: "all 0.2s ease",
        opacity: liking ? 0.6 : 1,
        ...style,
      }}
    >
      {isLiked ? "♥" : "♡"}
      {showCount && likesCount > 0 && (
        <span style={{ fontSize: "14px", fontWeight: "500" }}>
          {likesCount}
        </span>
      )}
    </button>
  );
};

// Action Button Component for reusability
export const ActionButton = ({
  icon,
  label,
  count,
  isActive = false,
  activeColor = "#007bff",
  inactiveColor = "#8e8e8e",
  onClick,
  disabled = false,
  loading = false,
  size = "medium",
}) => {
  const sizeConfig = {
    small: { iconSize: 18, padding: "4px 8px", fontSize: "12px" },
    medium: { iconSize: 22, padding: "6px 12px", fontSize: "14px" },
    large: { iconSize: 26, padding: "8px 16px", fontSize: "16px" },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: "none",
        border: "none",
        padding: config.padding,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "8px",
        transition: "all 0.2s ease",
        fontSize: config.fontSize,
        fontWeight: "500",
        color: isActive ? activeColor : inactiveColor,
        opacity: disabled || loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.target.style.color = activeColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.target.style.color = isActive ? activeColor : inactiveColor;
        }
      }}
    >
      <span style={{ fontSize: `${config.iconSize}px` }}>
        {loading ? "⏳" : icon}
      </span>
      {label && <span>{label}</span>}
      {count > 0 && <span>{count}</span>}
    </button>
  );
};

// Photo Interaction Summary Component
export const PhotoInteractionSummary = ({ photo, currentUserId }) => {
  const { likesCount } = useLikes(photo?.id, currentUserId);

  if (!photo) return null;

  return (
    <div
      style={{
        padding: "8px 16px",
        borderBottom: "1px solid #f0f0f0",
        fontSize: "14px",
        color: "#666",
      }}
    >
      {likesCount > 0 && (
        <div style={{ marginBottom: "4px", fontWeight: "500" }}>
          {likesCount === 1 ? "1 like" : `${likesCount} likes`}
        </div>
      )}

      {photo.taggedUsers && photo.taggedUsers.length > 0 && (
        <div style={{ fontSize: "12px", color: "#007bff" }}>
          with{" "}
          {photo.taggedUsers.map((user, index) => (
            <span key={user.uid}>
              @{user.displayScreenName || user.realName}
              {index < photo.taggedUsers.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced ActionBar with more features
export const EnhancedActionBar = ({
  photo,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onSave,
  showLabels = false,
  showCounts = true,
  vertical = false,
}) => {
  const { likesCount, isLiked, toggleLike, liking } = useLikes(
    photo?.id,
    currentUserId
  );
  const [saved, setSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (actionType, callback) => {
    setActionLoading((prev) => ({ ...prev, [actionType]: true }));
    try {
      if (callback) await callback();
    } catch (error) {
      console.error(`Error with ${actionType}:`, error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionType]: false }));
    }
  };

  const containerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderTop: "1px solid #f0f0f0",
    ...(vertical && {
      flexDirection: "column",
      alignItems: "stretch",
      gap: "4px",
    }),
  };

  return (
    <div style={containerStyle}>
      <ActionButton
        icon="♥"
        label={showLabels ? "Like" : ""}
        count={showCounts ? likesCount : 0}
        isActive={isLiked}
        activeColor="#e91e63"
        onClick={() =>
          handleAction("like", async () => {
            await toggleLike();
            if (onLike) onLike(photo?.id);
          })
        }
        loading={actionLoading.like || liking}
      />

      <ActionButton
        icon="💬"
        label={showLabels ? "Comment" : ""}
        onClick={() =>
          handleAction("comment", () => {
            if (onComment) onComment(photo?.id);
          })
        }
        loading={actionLoading.comment}
      />

      <ActionButton
        icon="📤"
        label={showLabels ? "Share" : ""}
        onClick={() =>
          handleAction("share", async () => {
            if (navigator.share) {
              await navigator.share({
                title: "Check out this photo on Corkt",
                text: photo?.caption || "Amazing photo!",
              });
            }
            if (onShare) onShare(photo?.id);
          })
        }
        loading={actionLoading.share}
      />

      {onSave && (
        <ActionButton
          icon={saved ? "🔖" : "📌"}
          label={showLabels ? (saved ? "Saved" : "Save") : ""}
          isActive={saved}
          onClick={() =>
            handleAction("save", async () => {
              setSaved(!saved);
              if (onSave) onSave(photo?.id, !saved);
            })
          }
          loading={actionLoading.save}
        />
      )}
    </div>
  );
};

export default ActionBar;
