import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Creates a like activity notification
 * @param {string} photoId - ID of the photo that was liked
 * @param {string} photoOwnerId - ID of the user who owns the photo
 * @param {string} actorId - ID of the user who liked the photo
 * @param {string} actorName - Display name of the user who liked
 * @param {string} actorAvatar - Avatar URL of the user who liked
 * @param {string} photoUrl - Thumbnail URL of the liked photo
 */
export const createLikeActivity = async (photoId, photoOwnerId, actorId, actorName, actorAvatar, photoUrl) => {
  try {
    // Don't create activity if user likes their own photo
    if (photoOwnerId === actorId) {
      return;
    }

    const activityData = {
      type: 'like',
      userId: photoOwnerId, // Who receives the notification
      actorId: actorId,     // Who performed the action
      actorName: actorName,
      actorAvatar: actorAvatar,
      photoId: photoId,
      photoUrl: photoUrl,
      timestamp: serverTimestamp(),
      read: false
    };

    await addDoc(collection(db, 'activities'), activityData);
    console.log('Like activity created successfully');
  } catch (error) {
    console.error('Error creating like activity:', error);
  }
};

/**
 * Creates a nearby photo activity notification
 * @param {string} photoId - ID of the new photo
 * @param {string} photoOwnerId - ID of the user who posted the photo
 * @param {string} actorName - Display name of the user who posted
 * @param {string} actorAvatar - Avatar URL of the user who posted
 * @param {string} photoUrl - Thumbnail URL of the new photo
 * @param {number} distance - Distance in meters from the notification recipient
 * @param {string} recipientId - ID of the user who should receive the notification
 */
export const createNearbyPhotoActivity = async (photoId, photoOwnerId, actorName, actorAvatar, photoUrl, distance, recipientId) => {
  try {
    // Don't create activity for the photo owner themselves
    if (photoOwnerId === recipientId) {
      return;
    }

    const activityData = {
      type: 'new_photo_nearby',
      userId: recipientId,   // Who receives the notification
      actorId: photoOwnerId, // Who performed the action
      actorName: actorName,
      actorAvatar: actorAvatar,
      photoId: photoId,
      photoUrl: photoUrl,
      timestamp: serverTimestamp(),
      read: false,
      distance: Math.round(distance) // Distance in meters
    };

    await addDoc(collection(db, 'activities'), activityData);
    console.log('Nearby photo activity created successfully');
  } catch (error) {
    console.error('Error creating nearby photo activity:', error);
  }
};

/**
 * Helper function to get user info for activity creation
 * @param {string} userId - User ID to fetch info for
 * @returns {Object} User info with displayName and profilePicture
 */
export const getUserInfoForActivity = async (userId) => {
  try {
    console.log('👤 Fetching user info for userId:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('👤 Found user data:', userData);
      
      return {
        displayName: userData.realName || userData.displayName || 'Anonymous',  // ✅ FIXED: Check realName first
        profilePicture: userData.profilePicture || userData.avatar || null
      };
    }
    console.log('👤 No user document found for:', userId);
    return {
      displayName: 'Anonymous',
      profilePicture: null
    };
  } catch (error) {
    console.error('👤 Error fetching user info:', error);
    return {
      displayName: 'Anonymous',
      profilePicture: null
    };
  }
};

/**
 * Marks an activity as read
 * @param {string} activityId - ID of the activity to mark as read
 */
export const markActivityAsRead = async (activityId) => {
  try {
    const activityRef = doc(db, 'activities', activityId);
    await updateDoc(activityRef, {
      read: true
    });
    console.log('Activity marked as read');
  } catch (error) {
    console.error('Error marking activity as read:', error);
  }
};