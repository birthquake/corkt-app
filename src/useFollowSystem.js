import { useState, useEffect, useCallback } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// iOS Safari detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Hook to manage following relationships - iOS compatible with stable references
export const useFollowSystem = (currentUserId) => {
  const [following, setFollowing] = useState(new Set());
  const [followers, setFollowers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    if (!currentUserId) {
      setFollowing(new Set());
      setFollowers(new Set());
      setLoading(false);
      return;
    }

    // Only fetch if we haven't fetched recently (prevent rapid re-fetching)
    const now = Date.now();
    if (now - lastFetch < 5000 && !loading) {
      // 5 second cooldown
      return;
    }

    // Use polling instead of real-time listeners on iOS to avoid conflicts
    if (isIOS && isSafari) {
      fetchFollowDataPeriodically();
    } else {
      fetchFollowDataOnce();
    }
  }, [currentUserId]); // Only depend on currentUserId, not internal state

  // Fetch follow data once (for non-iOS or as fallback)
  const fetchFollowDataOnce = async () => {
    if (loading) return; // Prevent double-fetching

    try {
      setLoading(true);
      setLastFetch(Date.now());

      // Fetch following
      const followingQuery = query(
        collection(db, "follows"),
        where("followerId", "==", currentUserId)
      );
      const followingSnapshot = await getDocs(followingQuery);
      const followingIds = followingSnapshot.docs.map(
        (doc) => doc.data().followingId
      );

      // Fetch followers
      const followersQuery = query(
        collection(db, "follows"),
        where("followingId", "==", currentUserId)
      );
      const followersSnapshot = await getDocs(followersQuery);
      const followerIds = followersSnapshot.docs.map(
        (doc) => doc.data().followerId
      );

      // Only update state if data actually changed
      const newFollowingSet = new Set(followingIds);
      const newFollowersSet = new Set(followerIds);

      const followingChanged =
        newFollowingSet.size !== following.size ||
        !Array.from(newFollowingSet).every((id) => following.has(id));
      const followersChanged =
        newFollowersSet.size !== followers.size ||
        !Array.from(newFollowersSet).every((id) => followers.has(id));

      if (followingChanged) {
        setFollowing(newFollowingSet);
      }
      if (followersChanged) {
        setFollowers(newFollowersSet);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching follow data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Periodic fetch for iOS (every 30 seconds)
  const fetchFollowDataPeriodically = () => {
    fetchFollowDataOnce();

    const interval = setInterval(() => {
      // Only fetch if component is still mounted and user hasn't changed
      if (currentUserId) {
        fetchFollowDataOnce();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  };

  // Follow a user with iOS-safe implementation and better error handling
  const followUser = async (userIdToFollow) => {
    if (!currentUserId || currentUserId === userIdToFollow) {
      console.warn("Cannot follow: invalid user IDs", {
        currentUserId,
        userIdToFollow,
      });
      return;
    }

    console.log(
      `🔄 Starting follow operation: ${currentUserId} -> ${userIdToFollow}`
    );

    try {
      // Optimistic update - create new Set to avoid mutating state
      setFollowing((prev) => {
        const newSet = new Set([...prev, userIdToFollow]);
        console.log(
          `✅ Optimistic update: added ${userIdToFollow}, new following:`,
          Array.from(newSet)
        );
        return newSet;
      });

      // Create follow relationship document
      const followDocId = `${currentUserId}_${userIdToFollow}`;
      const followDoc = doc(db, "follows", followDocId);

      console.log(`📝 Creating follow document: ${followDocId}`);

      await setDoc(followDoc, {
        followerId: currentUserId,
        followingId: userIdToFollow,
        createdAt: new Date(),
      });

      console.log(`✅ Follow document created successfully: ${followDocId}`);

      // Update user stats with error handling (but don't fail the whole operation)
      try {
        if (isIOS && isSafari) {
          console.log("📱 Using iOS-safe count updates");
          await updateUserFollowCountsSeparately(
            currentUserId,
            userIdToFollow,
            "follow"
          );
        } else {
          console.log("💻 Using batch count updates");
          await updateUserFollowCountsBatch(
            currentUserId,
            userIdToFollow,
            "follow"
          );
        }
        console.log("✅ Follow counts updated successfully");
      } catch (countError) {
        console.warn(
          "⚠️ Error updating follow counts (non-critical):",
          countError
        );
        // Don't fail the entire operation if count updates fail
      }

      console.log(`🎉 Successfully followed user: ${userIdToFollow}`);

      // Verify the follow worked by checking if it's in our following set
      setFollowing((prev) => {
        if (!prev.has(userIdToFollow)) {
          console.warn("🔧 Adding user to following set (verification)");
          return new Set([...prev, userIdToFollow]);
        }
        return prev;
      });
    } catch (err) {
      console.error("❌ Error following user:", err);
      console.error("❌ Error details:", {
        code: err.code,
        message: err.message,
        currentUserId,
        userIdToFollow,
      });

      setError(`Failed to follow user: ${err.message}`);

      // Revert optimistic update
      setFollowing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userIdToFollow);
        console.log(`🔄 Reverted optimistic update: removed ${userIdToFollow}`);
        return newSet;
      });

      // Re-throw the error so the UI can handle it
      throw err;
    }
  };

  // Unfollow a user with iOS-safe implementation
  const unfollowUser = async (userIdToUnfollow) => {
    if (!currentUserId || currentUserId === userIdToUnfollow) return;

    try {
      // Optimistic update - create new Set to avoid mutating state
      setFollowing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userIdToUnfollow);
        return newSet;
      });

      // Delete follow relationship document
      const followDoc = doc(
        db,
        "follows",
        `${currentUserId}_${userIdToUnfollow}`
      );
      await deleteDoc(followDoc);

      // Update user stats with error handling
      try {
        if (isIOS && isSafari) {
          await updateUserFollowCountsSeparately(
            currentUserId,
            userIdToUnfollow,
            "unfollow"
          );
        } else {
          await updateUserFollowCountsBatch(
            currentUserId,
            userIdToUnfollow,
            "unfollow"
          );
        }
      } catch (countError) {
        console.warn("Error updating follow counts:", countError);
      }

      console.log(`Unfollowed user: ${userIdToUnfollow}`);
    } catch (err) {
      console.error("Error unfollowing user:", err);
      setError(err.message);
      // Revert optimistic update
      setFollowing((prev) => new Set([...prev, userIdToUnfollow]));
    }
  };

  // Update follow counts using batch (non-iOS)
  const updateUserFollowCountsBatch = async (
    currentUserId,
    targetUserId,
    action
  ) => {
    const batch = writeBatch(db);

    const currentUserRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", targetUserId);

    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(currentUserRef),
      getDoc(targetUserRef),
    ]);

    const increment = action === "follow" ? 1 : -1;

    if (currentUserDoc.exists()) {
      const currentData = currentUserDoc.data();
      batch.update(currentUserRef, {
        followingCount: Math.max(
          0,
          (currentData.followingCount || 0) + increment
        ),
      });
    }

    if (targetUserDoc.exists()) {
      const targetData = targetUserDoc.data();
      batch.update(targetUserRef, {
        followersCount: Math.max(
          0,
          (targetData.followersCount || 0) + increment
        ),
      });
    }

    await batch.commit();
  };

  // Update follow counts separately (iOS-safe)
  const updateUserFollowCountsSeparately = async (
    currentUserId,
    targetUserId,
    action
  ) => {
    const increment = action === "follow" ? 1 : -1;

    // Update current user's following count
    try {
      const currentUserRef = doc(db, "users", currentUserId);
      const currentUserDoc = await getDoc(currentUserRef);
      if (currentUserDoc.exists()) {
        const currentData = currentUserDoc.data();
        await setDoc(
          currentUserRef,
          {
            ...currentData,
            followingCount: Math.max(
              0,
              (currentData.followingCount || 0) + increment
            ),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn("Error updating current user follow count:", err);
    }

    // Small delay to prevent conflicts
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update target user's followers count
    try {
      const targetUserRef = doc(db, "users", targetUserId);
      const targetUserDoc = await getDoc(targetUserRef);
      if (targetUserDoc.exists()) {
        const targetData = targetUserDoc.data();
        await setDoc(
          targetUserRef,
          {
            ...targetData,
            followersCount: Math.max(
              0,
              (targetData.followersCount || 0) + increment
            ),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn("Error updating target user follow count:", err);
    }
  };

  // Check if current user is following a specific user
  const isFollowing = (userId) => {
    return following.has(userId);
  };

  // Check if a specific user is following current user
  const isFollower = (userId) => {
    return followers.has(userId);
  };

  // Check if users are mutual friends (follow each other)
  const areMutualFriends = (userId) => {
    return isFollowing(userId) && isFollower(userId);
  };

  // Get follower/following counts
  const getFollowStats = () => {
    return {
      followingCount: following.size,
      followersCount: followers.size,
    };
  };

  // Refresh follow data manually (debounced)
  const refreshFollowData = () => {
    const now = Date.now();
    if (now - lastFetch > 2000) {
      // Only refresh if 2+ seconds since last fetch
      fetchFollowDataOnce();
    }
  };

  return {
    following: Array.from(following),
    followers: Array.from(followers),
    followingSet: following,
    followersSet: followers,
    loading,
    error,
    followUser,
    unfollowUser,
    isFollowing,
    isFollower,
    areMutualFriends,
    getFollowStats,
    refreshFollowData,
  };
};

// Hook to get follow button state and handler - Fixed loading state issues
export const useFollowButton = (currentUserId, targetUserId) => {
  const { isFollowing, followUser, unfollowUser, loading } =
    useFollowSystem(currentUserId);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Reset loading state if it gets stuck
  useEffect(() => {
    if (actionLoading) {
      const timeout = setTimeout(() => {
        console.warn("🔧 Action loading timeout - resetting");
        setActionLoading(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [actionLoading]);

  const handleFollowToggle = useCallback(async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      console.warn("Cannot toggle follow: invalid user IDs", {
        currentUserId,
        targetUserId,
      });
      return;
    }

    console.log(
      `🔄 Follow toggle started: ${currentUserId} -> ${targetUserId}, currently following: ${isFollowing(
        targetUserId
      )}`
    );

    setActionLoading(true);
    setActionError(null);

    try {
      if (isFollowing(targetUserId)) {
        console.log("🔄 Unfollowing user...");
        await unfollowUser(targetUserId);
        console.log("✅ Unfollow completed");
      } else {
        console.log("🔄 Following user...");
        await followUser(targetUserId);
        console.log("✅ Follow completed");
      }

      // Small delay for iOS compatibility
      if (isIOS && isSafari) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error("❌ Error toggling follow:", err);
      setActionError(err.message);

      // Show error briefly then clear it
      setTimeout(() => {
        setActionError(null);
      }, 3000);
    } finally {
      // Ensure loading state is always reset
      setActionLoading(false);
    }
  }, [currentUserId, targetUserId, isFollowing, followUser, unfollowUser]);

  const getButtonProps = useCallback(() => {
    const isCurrentlyFollowing = isFollowing(targetUserId);
    const isSameUser = currentUserId === targetUserId;
    const isDisabled = actionLoading || isSameUser;

    // Debug logging for disabled state
    if (isDisabled) {
      console.log("🔍 Button disabled:", {
        actionLoading,
        loading,
        isSameUser,
        currentUserId,
        targetUserId,
      });
    }

    let buttonText = "Follow";
    let backgroundColor = "#007bff";

    if (isSameUser) {
      return null; // Don't render button for same user
    } else if (actionLoading) {
      buttonText = "...";
    } else if (actionError) {
      buttonText = "Error";
      backgroundColor = "#dc3545";
    } else if (isCurrentlyFollowing) {
      buttonText = "Unfollow";
      backgroundColor = "#6c757d";
    }

    return {
      onClick: handleFollowToggle,
      disabled: isDisabled,
      children: buttonText,
      style: {
        padding: "6px 16px",
        backgroundColor: backgroundColor,
        color: "white",
        border: "none",
        borderRadius: "16px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "background-color 0.2s ease",
        opacity: isDisabled ? 0.6 : 1,
      },
    };
  }, [
    targetUserId,
    actionLoading,
    loading,
    currentUserId,
    isFollowing,
    handleFollowToggle,
    actionError,
  ]);

  return {
    isFollowing: isFollowing(targetUserId),
    loading: actionLoading || loading,
    error: actionError,
    handleFollowToggle,
    getButtonProps,
  };
};

// Helper function to filter photos based on privacy settings - simplified for iOS
export const filterPhotosByPrivacy = (photos, currentUserId, followingSet) => {
  return photos.filter((photo) => {
    // Always show own photos
    if (photo.uid === currentUserId) {
      return true;
    }

    // Check photo visibility with safe fallbacks
    const visibility = photo.visibility || "public";

    switch (visibility) {
      case "public":
        return true;

      case "friends":
        // Show if current user follows the photo owner
        return followingSet && followingSet.has && followingSet.has(photo.uid);

      case "tagged":
        // Show if current user is tagged in the photo
        return (
          photo.taggedUsers &&
          Array.isArray(photo.taggedUsers) &&
          photo.taggedUsers.some(
            (taggedUser) => taggedUser.uid === currentUserId
          )
        );

      default:
        // Default to public for backward compatibility
        return true;
    }
  });
};

// Helper function to check if user can see a specific photo - iOS safe
export const canUserSeePhoto = (photo, viewerUserId, viewerFollowingSet) => {
  // Always can see own photos
  if (photo.uid === viewerUserId) {
    return true;
  }

  // Check photo visibility with safe fallbacks
  const visibility = photo.visibility || "public";

  switch (visibility) {
    case "public":
      return true;

    case "friends":
      // Can see if viewer follows the photo owner
      return (
        viewerFollowingSet &&
        viewerFollowingSet.has &&
        viewerFollowingSet.has(photo.uid)
      );

    case "tagged":
      // Can see if viewer is tagged in the photo
      return (
        photo.taggedUsers &&
        Array.isArray(photo.taggedUsers) &&
        photo.taggedUsers.some((taggedUser) => taggedUser.uid === viewerUserId)
      );

    default:
      // Default to public for backward compatibility
      return true;
  }
};
