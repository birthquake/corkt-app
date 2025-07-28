import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // ✅ NEW: Import useParams
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "./firebaseConfig";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { getDisplayName, getScreenName } from "./useUserData";
import { useFollowCounts, formatFollowCount, useFollow } from "./useFollows";
import SignOut from "./SignOut";
import "./ProfilePage.css";

// Minimal SVG icon components - matching MobileBottomNavigation style
const EditIcon = ({ color = "#6c757d", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const PhotoIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const MapIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const TrophyIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55.47.98.97 1.21C12.01 18.75 13 19.24 14 20c.64.52 1.39.52 2 0 1-.76 1.99-1.25 3.03-1.79.5-.23.97-.66.97-1.21v-2.34"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
);

const CloseIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const TrashIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const PhotoEmptyIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    <line x1="9" y1="9" x2="21" y2="21"/>
  </svg>
);

const MapEmptyIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const BackIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M19 12H5"/>
    <path d="M12 19l-7-7 7-7"/>
  </svg>
);

// 🎨 NEW: Achievement Badge Icons
const CameraIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const TargetIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const CompassIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88 16.24,7.76"/>
  </svg>
);

const PlaneIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 4c-1.5 0-3.5 1-3.5 1L10 7 4 6 2 8l5 2 2 5 2-2 1-6 4.5-1.5S19 4 19.5 4"/>
  </svg>
);

const GlobeIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const FireIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const StarIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
  </svg>
);

const UsersIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const AwardIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21,13.89 7,22 12,20 17,22 15.79,13.88"/>
  </svg>
);

const CrownIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M2 20h20l-2-6-4 2-4-4-4 4-4-2-2 6z"/>
    <path d="M6 12l2-4 4 2 4-2 2 4"/>
  </svg>
);

const SparkleIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
    <circle cx="12" cy="12" r="1" fill={color}/>
    <path d="M4 4l2 2"/>
    <path d="M20 4l-2 2"/>
    <path d="M4 20l2-2"/>
    <path d="M20 20l-2-2"/>
  </svg>
);

const LockIcon = ({ color = "#6c757d", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <circle cx="12" cy="16" r="1"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ProfilePage = ({ currentUser, photos }) => {
  const { userId } = useParams(); // ✅ NEW: Get userId from URL params
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [activeTab, setActiveTab] = useState("photos");
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Avatar picker state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ NEW: Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || userId === currentUser?.uid;
  const profileUserId = userId || currentUser?.uid;

  // ✅ NEW: Follow functionality for other users' profiles
  const { isFollowing, actionLoading: followLoading, toggleFollow } = useFollow(
    isOwnProfile ? null : profileUserId, 
    currentUser?.uid
  );

  // 🎨 EXPANDED: More avatar variety with different styles
  const stockAvatars = [
    // Avataaars style (cartoon people)
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily&backgroundColor=d1d4f9",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Princess&backgroundColor=ffb3ba",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=bae1ff",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=baffc9",

    // Personas style (professional avatars)
    "https://api.dicebear.com/7.x/personas/svg?seed=Alex&backgroundColor=ffd93d",
    "https://api.dicebear.com/7.x/personas/svg?seed=Sam&backgroundColor=c0aede",
    "https://api.dicebear.com/7.x/personas/svg?seed=Jordan&backgroundColor=ffdfba",
    "https://api.dicebear.com/7.x/personas/svg?seed=Riley&backgroundColor=baffc9",

    // Big Ears style (cute/fun)
    "https://api.dicebear.com/7.x/big-ears/svg?seed=Mittens&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/big-ears/svg?seed=Fluffy&backgroundColor=ffffba",
    "https://api.dicebear.com/7.x/big-ears/svg?seed=Tiger&backgroundColor=ffb3ba",
    "https://api.dicebear.com/7.x/big-ears/svg?seed=Luna&backgroundColor=c7ceea",

    // Adventurer style (illustrated people)
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=ffc9de",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=d1d4f9",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Quinn&backgroundColor=bae1ff",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=River&backgroundColor=c0aede",

    // Fun styles
    "https://api.dicebear.com/7.x/big-smile/svg?seed=Happy&backgroundColor=ffd93d",
    "https://api.dicebear.com/7.x/big-smile/svg?seed=Joy&backgroundColor=baffc9",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=c7ceea",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2&backgroundColor=ffdfba",

    // More variety
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Ocean&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Forest&backgroundColor=baffc9",
    "https://api.dicebear.com/7.x/thumbs/svg?seed=Thumbs1&backgroundColor=ffffba",
    "https://api.dicebear.com/7.x/thumbs/svg?seed=Thumbs2&backgroundColor=ffb3ba",

    // Even more options
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=ffc9de",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=c7ceea",
    "https://api.dicebear.com/7.x/personas/svg?seed=Blake&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Sage&backgroundColor=baffc9",
    "https://api.dicebear.com/7.x/big-ears/svg?seed=Oreo&backgroundColor=d1d4f9",
    "https://api.dicebear.com/7.x/big-smile/svg?seed=Sunny&backgroundColor=ffd93d",
  ];

  // ✅ UPDATED: Get follow counts for the profile being viewed
  const {
    followersCount,
    followingCount,
    loading: followCountsLoading,
  } = useFollowCounts(profileUserId);

  // 🔧 FIX: Body scroll lock when modal opens
  useEffect(() => {
    if (showAvatarPicker) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.classList.add("modal-open");
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.classList.remove("modal-open");
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.classList.remove("modal-open");
    };
  }, [showAvatarPicker]);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setMapsLoaded(true);
      } else {
        setTimeout(checkMapsLoaded, 500);
      }
    };
    checkMapsLoaded();
  }, []);

  // ✅ UPDATED: Effect that responds to userId changes
  useEffect(() => {
    if (profileUserId) {
      fetchUserData();
      filterUserPhotos();
    }
  }, [profileUserId, photos, currentUser]);

  // ✅ UPDATED: Calculate achievements for the profile being viewed
  useEffect(() => {
    if (profileUserId && userPhotos.length >= 0) {
      calculateAchievements();
    }
  }, [profileUserId, userPhotos, followersCount]);

  // ✅ UPDATED: Fetch user data for the specified user
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userDocRef = doc(db, "users", profileUserId);
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setUserData(userData);
        setFormData({
          username: userData.username || "",
          bio: userData.bio || "",
        });
        setProfileImage(userData.profilePicture || stockAvatars[0]);
      } else {
        // ✅ NEW: Handle case where user doesn't exist
        if (isOwnProfile) {
          // Create default user profile for current user with first stock avatar
          const defaultUserData = {
            email: currentUser.email,
            username: `User${currentUser.uid.slice(0, 6)}`,
            profilePicture: stockAvatars[0],
            bio: "",
            createdAt: new Date(),
          };

          await updateDoc(userDocRef, defaultUserData);
          setUserData(defaultUserData);
          setFormData({
            username: defaultUserData.username,
            bio: defaultUserData.bio,
          });
          setProfileImage(stockAvatars[0]);
        } else {
          // User doesn't exist
          setError("User not found");
          setUserData(null);
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Filter photos for the user being viewed
  const filterUserPhotos = () => {
    const userSpecificPhotos = photos.filter((photo) => photo.uid === profileUserId);
    setUserPhotos(userSpecificPhotos);
  };

  // 🎨 UPDATED: Achievement icon mapping
  const getAchievementIcon = (achievementId, unlocked) => {
    const iconProps = { 
      color: "#ffffff", 
      size: 20 
    };

    const iconMap = {
      first_photo: <CameraIcon {...iconProps} />,
      photographer: <CameraIcon {...iconProps} />,
      pro_shooter: <TargetIcon {...iconProps} />,
      explorer: <CompassIcon {...iconProps} />,
      traveler: <PlaneIcon {...iconProps} />,
      wanderer: <CompassIcon {...iconProps} />,
      globetrotter: <GlobeIcon {...iconProps} />,
      consistent: <FireIcon {...iconProps} />,
      dedicated: <StarIcon {...iconProps} />,
      popular: <UsersIcon {...iconProps} />,
      influencer: <StarIcon {...iconProps} />,
      century: <AwardIcon {...iconProps} />,
      world_explorer: <TrophyIcon {...iconProps} />,
      celebrity: <SparkleIcon {...iconProps} />,
      legend: <CrownIcon {...iconProps} />,
    };

    return unlocked ? iconMap[achievementId] : <LockIcon color="#6c757d" size={20} />;
  };

  // ✅ UPDATED: Calculate achievements for the user being viewed
  const calculateAchievements = () => {
    const userSpecificPhotos = photos.filter((photo) => photo.uid === profileUserId);
    const photosWithLocation = userSpecificPhotos.filter(
      (photo) => photo.latitude && photo.longitude
    );

    const achievements = [];

    // Photo count achievements
    if (userSpecificPhotos.length >= 1)
      achievements.push({
        id: "first_photo",
        title: "First Photo",
        description: "Shared your first memory",
        unlocked: true,
      });
    if (userSpecificPhotos.length >= 10)
      achievements.push({
        id: "photographer",
        title: "Photographer",
        description: "Shared 10 photos",
        unlocked: true,
      });
    if (userSpecificPhotos.length >= 50)
      achievements.push({
        id: "pro_shooter",
        title: "Pro Shooter",
        description: "Shared 50 photos",
        unlocked: true,
      });

    // Location achievements
    if (photosWithLocation.length >= 1)
      achievements.push({
        id: "explorer",
        title: "Explorer",
        description: "Tagged your first location",
        unlocked: true,
      });
    if (photosWithLocation.length >= 5)
      achievements.push({
        id: "traveler",
        title: "Traveler",
        description: "Photos from 5+ locations",
        unlocked: true,
      });

    // Unique locations
    const uniqueLocations = new Set();
    photosWithLocation.forEach((photo) => {
      const locationKey = `${photo.latitude.toFixed(
        2
      )},${photo.longitude.toFixed(2)}`;
      uniqueLocations.add(locationKey);
    });

    if (uniqueLocations.size >= 3)
      achievements.push({
        id: "wanderer",
        title: "Wanderer",
        description: "Visited 3+ unique places",
        unlocked: true,
      });
    if (uniqueLocations.size >= 10)
      achievements.push({
        id: "globetrotter",
        title: "Globetrotter",
        description: "Visited 10+ unique places",
        unlocked: true,
      });

    // Streak achievements
    const photosByDate = {};
    userSpecificPhotos.forEach((photo) => {
      if (photo.timestamp) {
        const date = photo.timestamp.toDate
          ? photo.timestamp.toDate()
          : new Date(photo.timestamp);
        const dateKey = date.toDateString();
        photosByDate[dateKey] = true;
      }
    });

    const dates = Object.keys(photosByDate).sort();
    let currentStreak = 0;
    let maxStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      if (i === 0 || new Date(dates[i]) - new Date(dates[i - 1]) === 86400000) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    if (maxStreak >= 3)
      achievements.push({
        id: "consistent",
        title: "Consistent",
        description: "3-day photo streak",
        unlocked: true,
      });
    if (maxStreak >= 7)
      achievements.push({
        id: "dedicated",
        title: "Dedicated",
        description: "7-day photo streak",
        unlocked: true,
      });

    // Follow-based achievements
    if (followersCount >= 10)
      achievements.push({
        id: "popular",
        title: "Popular",
        description: "10+ followers",
        unlocked: true,
      });
    if (followersCount >= 50)
      achievements.push({
        id: "influencer",
        title: "Influencer",
        description: "50+ followers",
        unlocked: true,
      });

    // Add some locked achievements for motivation
    achievements.push(
      {
        id: "century",
        title: "Century Club",
        description: "Share 100 photos",
        unlocked: userSpecificPhotos.length >= 100,
      },
      {
        id: "world_explorer",
        title: "World Explorer",
        description: "Visit 25+ unique places",
        unlocked: uniqueLocations.size >= 25,
      },
      {
        id: "celebrity",
        title: "Celebrity",
        description: "100+ followers",
        unlocked: followersCount >= 100,
      },
      {
        id: "legend",
        title: "Legend",
        description: "Share 500 photos",
        unlocked: userSpecificPhotos.length >= 500,
      }
    );

    setAchievements(achievements);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🎨 Avatar selection with debugging (only for own profile)
  const handleAvatarSelect = async (avatarUrl) => {
    if (!isOwnProfile) return; // ✅ NEW: Prevent editing other users' profiles

    try {
      console.log("🎨 Avatar update attempt:");
      console.log("User ID:", currentUser.uid);
      console.log("Avatar URL:", avatarUrl);
      console.log("Current user data:", userData);

      setProfileImage(avatarUrl);

      const userDocRef = doc(db, "users", currentUser.uid);
      const updateData = { profilePicture: avatarUrl };

      console.log("📝 Update data:", updateData);

      await updateDoc(userDocRef, updateData);
      console.log("✅ Avatar update successful");

      setUserData({ ...userData, profilePicture: avatarUrl });
      setShowAvatarPicker(false);
    } catch (err) {
      console.error("❌ Avatar update error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      setError(`Failed to update avatar: ${err.message} (${err.code})`);
    }
  };

  // 🔧 FIXED: Updated handleSave function to update both realName and username
  const handleSave = async () => {
    if (!isOwnProfile) return; // ✅ NEW: Prevent editing other users' profiles

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        username: formData.username,
        realName: formData.username,  // ✅ FIXED: Update realName too
        bio: formData.bio,
      });

      // ✅ FIXED: Update local state with both fields
      setUserData({ 
        ...userData, 
        ...formData, 
        realName: formData.username 
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err.message);
      setError("Failed to update profile.");
    }
  };

  // Delete photo functionality (only for own photos)
  const deletePhoto = async (photo) => {
    if (!isOwnProfile) return; // ✅ NEW: Prevent deleting other users' photos

    setDeleting(true);
    try {
      if (photo.imageUrl) {
        try {
          const storageRef = ref(storage, photo.imageUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn("Storage deletion failed:", storageError);
        }
      }

      await deleteDoc(doc(db, "photos", photo.id));

      try {
        const likesQuery = query(
          collection(db, "likes"),
          where("photoId", "==", photo.id)
        );
        const likesSnapshot = await getDocs(likesQuery);
        const deletePromises = likesSnapshot.docs.map((likeDoc) =>
          deleteDoc(doc(db, "likes", likeDoc.id))
        );
        await Promise.all(deletePromises);
      } catch (likesError) {
        console.warn("Error deleting associated likes:", likesError);
      }

      setUserPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      console.error("Error deleting photo:", err);
      setError("Failed to delete photo. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const toggleEditMode = () => {
    if (!isOwnProfile) return; // ✅ NEW: Prevent editing other users' profiles
    setEditMode(!editMode);
    setDeleteConfirm(null);
  };

  const handleDeleteClick = (photo) => {
    if (!isOwnProfile) return; // ✅ NEW: Prevent deleting other users' photos
    setDeleteConfirm(photo);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deletePhoto(deleteConfirm);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const getPhotoLocations = () => {
    return userPhotos.filter((photo) => photo.latitude && photo.longitude);
  };

  const mapContainerStyle = {
    width: "100%",
    height: "300px",
    borderRadius: "12px",
  };

  const [userCurrentLocation, setUserCurrentLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location access denied for profile map");
        }
      );
    }
  }, []);

  const getMapCenter = () => {
    if (userCurrentLocation) {
      return userCurrentLocation;
    }

    const photosWithLocation = getPhotoLocations();
    if (photosWithLocation.length > 0) {
      const avgLat =
        photosWithLocation.reduce((sum, photo) => sum + photo.latitude, 0) /
        photosWithLocation.length;
      const avgLng =
        photosWithLocation.reduce((sum, photo) => sum + photo.longitude, 0) /
        photosWithLocation.length;
      return { lat: avgLat, lng: avgLng };
    }

    return { lat: 37.7749, lng: -122.4194 };
  };

  const getMapZoom = () => {
    const photosWithLocation = getPhotoLocations();

    if (photosWithLocation.length === 0) {
      return 15;
    }

    if (photosWithLocation.length === 1) {
      return 16;
    }

    const lats = photosWithLocation.map((p) => p.latitude);
    const lngs = photosWithLocation.map((p) => p.longitude);

    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const maxRange = Math.max(latRange, lngRange);

    if (maxRange < 0.01) return 16;
    if (maxRange < 0.05) return 14;
    if (maxRange < 0.1) return 13;
    if (maxRange < 0.5) return 11;
    return 10;
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
          color: "#6c757d",
          paddingTop: "16px",
        }}
      >
        Loading profile...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "#dc3545",
          paddingTop: "56px",
        }}
      >
        {/* ✅ NEW: Back button for error state */}
        {!isOwnProfile && (
          <button
            onClick={() => window.history.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "#007bff",
              border: "1px solid #007bff",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              margin: "0 auto 20px auto",
            }}
          >
            <BackIcon color="#007bff" size={16} />
            Back
          </button>
        )}
        Error: {error}
      </div>
    );

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        paddingTop: "16px",
        paddingBottom: "120px",
      }}
    >
      {/* ✅ NEW: Back button for viewing other users' profiles */}
      {!isOwnProfile && (
        <div style={{ padding: "0 16px 16px 16px" }}>
          <button
            onClick={() => window.history.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "#007bff",
              border: "1px solid #007bff",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <BackIcon color="#007bff" size={16} />
            Back
          </button>
        </div>
      )}

      {/* 🔧 FIXED: Avatar Picker Modal (only show for own profile) */}
      {showAvatarPicker && isOwnProfile && (
        <div
          className="modal-backdrop avatar-modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
            padding: "20px",
            touchAction: "none",
            overscrollBehavior: "contain",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAvatarPicker(false);
            }
          }}
        >
          <div
            className="modal-content avatar-modal-content"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                marginBottom: "20px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
                Choose Your Avatar
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#6c757d" }}>
                Choose from 32 unique avatars
              </p>
            </div>

            <div
              className="avatar-picker-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                paddingBottom: "40px",
                flex: 1,
                overflowY: "auto",
                paddingRight: "4px",
                WebkitOverflowScrolling: "touch",
                scrollBehavior: "smooth",
                overscrollBehavior: "contain",
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {stockAvatars.map((avatar, index) => (
                <div
                  key={index}
                  onClick={() => handleAvatarSelect(avatar)}
                  style={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border:
                      profileImage === avatar
                        ? "3px solid #007bff"
                        : "2px solid #e9ecef",
                    transition: "all 0.2s ease",
                    aspectRatio: "1",
                    touchAction: "manipulation",
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAvatarPicker(false)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                flexShrink: 0,
                touchAction: "manipulation",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "24px",
          borderBottom: "1px solid #e9ecef",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Profile Picture */}
          <div style={{ position: "relative" }}>
            <img
              src={profileImage || userData?.profilePicture || stockAvatars[0]}
              alt="Profile"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #007bff",
              }}
            />
            {/* ✅ UPDATED: Only show edit button for own profile */}
            {isEditing && isOwnProfile && (
              <button
                onClick={() => setShowAvatarPicker(true)}
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: "0",
                  backgroundColor: "#007bff",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                  border: "none",
                }}
              >
                <EditIcon color="white" size={12} />
              </button>
            )}
          </div>

          {/* Profile Stats */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#343a40",
                  }}
                >
                  {userPhotos.length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Photos</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#343a40",
                  }}
                >
                  {followCountsLoading
                    ? "..."
                    : formatFollowCount(followersCount)}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>
                  Followers
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#343a40",
                  }}
                >
                  {followCountsLoading
                    ? "..."
                    : formatFollowCount(followingCount)}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>
                  Following
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#343a40",
                  }}
                >
                  {achievements.filter((a) => a.unlocked).length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Badges</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        {/* ✅ UPDATED: Only allow editing for own profile */}
        {isEditing && isOwnProfile ? (
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username"
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "12px",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                boxSizing: "border-box",
              }}
            />
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Write a bio..."
              rows="3"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                fontSize: "14px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: "#343a40",
              }}
            >
              {getDisplayName(userData, currentUser?.uid) || "User"}
            </h2>
            {/* ✅ NEW: Show screen name for other users */}
            {!isOwnProfile && userData && (
              <p style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                color: "#6c757d",
              }}>
                @{getScreenName(userData)}
              </p>
            )}
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#343a40",
                lineHeight: "1.4",
              }}
            >
              {userData?.bio || `${isOwnProfile ? "No bio yet." : "No bio."}`}
            </p>
          </div>
        )}

        {/* ✅ UPDATED: Different buttons for own profile vs other users */}
        {isOwnProfile ? (
          // Own profile - show edit/sign out buttons
          isEditing ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  color: "#007bff",
                  border: "1px solid #007bff",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Edit Profile
              </button>
              <div style={{ display: "flex", alignItems: "center" }}>
                <SignOut />
              </div>
            </div>
          )
        ) : (
          // Other user's profile - show follow/unfollow button
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                flex: 1,
                padding: "8px 16px",
                backgroundColor: isFollowing ? "#6c757d" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: followLoading ? "not-allowed" : "pointer",
                opacity: followLoading ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {followLoading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid transparent",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  {isFollowing ? "Unfollowing..." : "Following..."}
                </span>
              ) : (
                isFollowing ? "Following" : "Follow"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e9ecef",
          display: "flex",
        }}
      >
        {[
          { id: "photos", label: "Photos", IconComponent: PhotoIcon },
          { id: "map", label: "Map", IconComponent: MapIcon },
          { id: "achievements", label: "Badges", IconComponent: TrophyIcon },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const iconColor = isActive ? "#007bff" : "#6c757d";
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "16px",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid #007bff"
                  : "2px solid transparent",
                color: isActive ? "#007bff" : "#6c757d",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <tab.IconComponent color={iconColor} size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "16px" }}>
        {activeTab === "photos" && (
          <div>
            {/* ✅ UPDATED: Only show edit button for own profile */}
            {userPhotos.length > 0 && isOwnProfile && (
              <div style={{ marginBottom: "16px", textAlign: "right" }}>
                <button
                  onClick={toggleEditMode}
                  disabled={deleting}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: editMode ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {editMode ? "Done" : "Edit Photos"}
                </button>
              </div>
            )}

            {userPhotos.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "2px",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {userPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      aspectRatio: "1",
                      overflow: "hidden",
                      cursor: editMode ? "default" : "pointer",
                      position: "relative",
                    }}
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!editMode) {
                          e.target.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!editMode) {
                          e.target.style.transform = "scale(1)";
                        }
                      }}
                    />

                    {/* ✅ UPDATED: Only show delete button for own profile in edit mode */}
                    {editMode && isOwnProfile && (
                      <button
                        onClick={() => handleDeleteClick(photo)}
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
                          cursor: deleting ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: deleting ? 0.6 : 1,
                        }}
                      >
                        <CloseIcon color="white" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#6c757d",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <PhotoEmptyIcon color="#6c757d" size={48} />
                </div>
                <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
                  {isOwnProfile ? "No photos yet" : "No photos"}
                </h3>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {isOwnProfile 
                    ? "Start capturing memories to see them here!"
                    : `${getDisplayName(userData, currentUser?.uid) || "This user"} hasn't shared any photos yet.`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "map" && (
          <div>
            {getPhotoLocations().length > 0 ? (
              <div>
                {mapsLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={getMapCenter()}
                    zoom={getMapZoom()}
                    options={{
                      zoomControl: true,
                      gestureHandling: "greedy",
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {/* ✅ UPDATED: Only show current location for own profile */}
                    {userCurrentLocation && isOwnProfile && (
                      <Marker
                        position={userCurrentLocation}
                        icon={{
                          url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" fill="#007bff" stroke="white" stroke-width="3"/>
                              <circle cx="12" cy="12" r="3" fill="white"/>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(24, 24),
                          anchor: new window.google.maps.Point(12, 12),
                        }}
                        title="Your current location"
                      />
                    )}

                    {/* Photo location markers */}
                    {getPhotoLocations().map((photo, index) => (
                      <Marker
                        key={photo.id || index}
                        position={{ lat: photo.latitude, lng: photo.longitude }}
                        icon={{
                          url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24c0-8.837-7.163-16-16-16z" fill="#dc3545"/>
                              <circle cx="16" cy="16" r="8" fill="white"/>
                              <circle cx="16" cy="16" r="5" fill="#dc3545"/>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(32, 40),
                          anchor: new window.google.maps.Point(16, 40),
                        }}
                        title={photo.caption || "Photo location"}
                      />
                    ))}
                  </GoogleMap>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "300px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        color: "#6c757d",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <MapIcon color="#6c757d" size={24} />
                      </div>
                      <p style={{ margin: 0, fontSize: "14px" }}>
                        Loading map...
                      </p>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "16px",
                    textAlign: "center",
                    color: "#6c757d",
                    fontSize: "14px",
                  }}
                >
                  📍 {getPhotoLocations().length} photos with location data
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#6c757d",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <MapEmptyIcon color="#6c757d" size={48} />
                </div>
                <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
                  {isOwnProfile ? "No locations yet" : "No locations"}
                </h3>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {isOwnProfile 
                    ? "Take photos with location to see them on your map!"
                    : `${getDisplayName(userData, currentUser?.uid) || "This user"} hasn't shared any photos with location data yet.`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #e9ecef",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    opacity: achievement.unlocked ? 1 : 0.5,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: achievement.unlocked
                        ? "#28a745"
                        : "#e9ecef",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    {getAchievementIcon(achievement.id, achievement.unlocked)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: achievement.unlocked ? "#343a40" : "#6c757d",
                      }}
                    >
                      {achievement.title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#6c757d",
                      }}
                    >
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        fontSize: "12px",
                      }}
                    >
                      ✅
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ✅ UPDATED: Delete Confirmation Modal (only for own profile) */}
      {deleteConfirm && isOwnProfile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "300px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <TrashIcon color="#dc3545" size={48} />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#343a40",
              }}
            >
              Delete Photo?
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#6c757d",
                lineHeight: "1.4",
              }}
            >
              This action cannot be undone. The photo will be permanently
              deleted from your profile.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={cancelDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid transparent",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ProfilePage;
