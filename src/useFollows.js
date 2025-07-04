import { useState, useEffect, useCallback } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Hook to manage following a specific user
export const useFollow = (targetUserId, currentUserId) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    // Check if current user follows target user
    const checkFollowStatus = async () => {
      try {
        const followId = `${currentUserId}_${targetUserId}`;
        const followsQuery = query(
          collection(db, "follows"),
          where("followerId", "==", currentUserId),
          where("followingId", "==", targetUserId)
        );

        const snapshot = await getDocs(followsQuery);
        setIsFollowing(!snapshot.empty);
        setLoading(false);
      } catch (error) {
        console.error("Error checking follow status:", error);
        setLoading(false);
      }
    };

    checkFollowStatus();
  }, [targetUserId, currentUserId]);

  const toggleFollow = useCallback(async () => {
    if (
      !currentUserId ||
      !targetUserId ||
      targetUserId === currentUserId ||
      actionLoading
    ) {
      return;
    }

    setActionLoading(true);
    const followId = `${currentUserId}_${targetUserId}`;

    try {
      if (isFollowing) {
        // Unfollow - optimistic update
        setIsFollowing(false);
        await deleteDoc(doc(db, "follows", followId));
        console.log(`🔄 Unfollowed user: ${targetUserId}`);
      } else {
        // Follow - optimistic update
        setIsFollowing(true);
        await setDoc(doc(db, "follows", followId), {
          followerId: currentUserId,
          followingId: targetUserId,
          createdAt: serverTimestamp(),
        });
        console.log(`✅ Followed user: ${targetUserId}`);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update on error
      setIsFollowing(!isFollowing);
    } finally {
      setActionLoading(false);
    }
  }, [currentUserId, targetUserId, isFollowing, actionLoading]);

  return {
    isFollowing,
    loading,
    actionLoading,
    toggleFollow,
  };
};

// Hook to get follow counts for a user
export const useFollowCounts = (userId) => {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFollowersCount(0);
      setFollowingCount(0);
      setLoading(false);
      return;
    }

    const fetchFollowCounts = async () => {
      try {
        // Get followers count
        const followersQuery = query(
          collection(db, "follows"),
          where("followingId", "==", userId)
        );
        const followersSnapshot = await getDocs(followersQuery);

        // Get following count
        const followingQuery = query(
          collection(db, "follows"),
          where("followerId", "==", userId)
        );
        const followingSnapshot = await getDocs(followingQuery);

        setFollowersCount(followersSnapshot.size);
        setFollowingCount(followingSnapshot.size);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching follow counts:", error);
        setLoading(false);
      }
    };

    fetchFollowCounts();
  }, [userId]);

  return {
    followersCount,
    followingCount,
    loading,
  };
};

// Hook to get list of users that current user follows
export const useFollowing = (currentUserId) => {
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setFollowingList([]);
      setLoading(false);
      return;
    }

    // Real-time listener for following list
    const followingQuery = query(
      collection(db, "follows"),
      where("followerId", "==", currentUserId)
    );

    const unsubscribe = onSnapshot(followingQuery, (snapshot) => {
      const following = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Extract just the user IDs being followed
      const followingIds = following.map((follow) => follow.followingId);
      setFollowingList(followingIds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  return {
    followingList,
    loading,
  };
};

// Hook to get list of users following the current user
export const useFollowers = (currentUserId) => {
  const [followersList, setFollowersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setFollowersList([]);
      setLoading(false);
      return;
    }

    // Real-time listener for followers list
    const followersQuery = query(
      collection(db, "follows"),
      where("followingId", "==", currentUserId)
    );

    const unsubscribe = onSnapshot(followersQuery, (snapshot) => {
      const followers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Extract just the user IDs of followers
      const followerIds = followers.map((follow) => follow.followerId);
      setFollowersList(followerIds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  return {
    followersList,
    loading,
  };
};

// Utility function to filter photos by followed users
export const filterPhotosByFollowing = (photos, followingList) => {
  if (!followingList || followingList.length === 0) {
    return [];
  }

  return photos.filter((photo) => followingList.includes(photo.uid));
};

// Utility function to format follow counts
export const formatFollowCount = (count) => {
  if (count === 0) return "0";
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}m`;
};

export default {
  useFollow,
  useFollowCounts,
  useFollowing,
  useFollowers,
  filterPhotosByFollowing,
  formatFollowCount,
};
