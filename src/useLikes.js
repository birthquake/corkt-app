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
import { createLikeActivity, getUserInfoForActivity } from "./activityService";

// iOS Safari detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Hook to manage likes for a specific photo
export const useLikes = (
  photoId,
  currentUserId,
  photoOwnerId = null,
  photoUrl = null
) => {
  const [likes, setLikes] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!photoId) {
      setLikes([]);
      setLikesCount(0);
      setIsLiked(false);
      setLoading(false);
      return;
    }

    // Real-time listener for likes (use polling on iOS for stability)
    if (isIOS && isSafari) {
      fetchLikes();
      const interval = setInterval(fetchLikes, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    } else {
      // Real-time listener for non-iOS
      const likesQuery = query(
        collection(db, "likes"),
        where("photoId", "==", photoId)
      );

      const unsubscribe = onSnapshot(likesQuery, (snapshot) => {
        const likesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLikes(likesData);
        setLikesCount(likesData.length);
        setIsLiked(likesData.some((like) => like.userId === currentUserId));
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [photoId, currentUserId]);

  const fetchLikes = async () => {
    try {
      const likesQuery = query(
        collection(db, "likes"),
        where("photoId", "==", photoId)
      );

      const snapshot = await getDocs(likesQuery);
      const likesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLikes(likesData);
      setLikesCount(likesData.length);
      setIsLiked(likesData.some((like) => like.userId === currentUserId));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching likes:", err);
      setLoading(false);
    }
  };

  const toggleLike = useCallback(async () => {
    if (!currentUserId || !photoId || liking) return;

    setLiking(true);
    const likeId = `${photoId}_${currentUserId}`;

    try {
      if (isLiked) {
        // Unlike - optimistic update
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));

        await deleteDoc(doc(db, "likes", likeId));
        console.log(`💔 Unliked photo: ${photoId}`);
      } else {
        // Like - optimistic update
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);

        await setDoc(doc(db, "likes", likeId), {
          photoId: photoId,
          userId: currentUserId,
          timestamp: serverTimestamp(),
        });
        console.log(`❤️ Liked photo: ${photoId}`);

        // Create activity notification (only for likes, not unlikes)
        if (photoOwnerId && photoUrl) {
          try {
            // Get current user info for the activity
            const userInfo = await getUserInfoForActivity(currentUserId);

            // Create like activity
            await createLikeActivity(
              photoId,
              photoOwnerId,
              currentUserId,
              userInfo.displayName,
              userInfo.profilePicture,
              photoUrl
            );
            console.log("✅ Like activity created");
          } catch (activityError) {
            // Don't fail the like if activity creation fails
            console.error("Failed to create like activity:", activityError);
          }
        }
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setLiking(false);
    }
  }, [photoId, currentUserId, isLiked, liking, photoOwnerId, photoUrl]);

  return {
    likes,
    likesCount,
    isLiked,
    loading,
    liking,
    toggleLike,
  };
};

// Hook to get likes for multiple photos (for feed optimization)
export const useMultiplePhotoLikes = (photoIds, currentUserId) => {
  const [likesData, setLikesData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photoIds || photoIds.length === 0) {
      setLikesData({});
      setLoading(false);
      return;
    }

    const fetchAllLikes = async () => {
      try {
        setLoading(true);

        // Fetch likes for all photos in one query
        const likesQuery = query(
          collection(db, "likes"),
          where("photoId", "in", photoIds.slice(0, 10)) // Firestore limit of 10 for 'in' queries
        );

        const snapshot = await getDocs(likesQuery);
        const allLikes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Group likes by photoId
        const groupedLikes = {};
        photoIds.forEach((photoId) => {
          const photoLikes = allLikes.filter(
            (like) => like.photoId === photoId
          );
          groupedLikes[photoId] = {
            likes: photoLikes,
            likesCount: photoLikes.length,
            isLiked: photoLikes.some((like) => like.userId === currentUserId),
          };
        });

        setLikesData(groupedLikes);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching multiple photo likes:", err);
        setLoading(false);
      }
    };

    fetchAllLikes();
  }, [photoIds, currentUserId]);

  return { likesData, loading };
};

// Utility functions
export const formatLikesCount = (count) => {
  if (count === 0) return "";
  if (count === 1) return "1 like";
  if (count < 1000) return `${count} likes`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k likes`;
  return `${(count / 1000000).toFixed(1)}m likes`;
};

export const formatLikesCountShort = (count) => {
  if (count === 0) return "";
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}m`;
};
