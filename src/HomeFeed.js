// HomeFeed.js - Enhanced with Discovery Features, Immersive Photo Modal, and Photo Flagging
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useOptimizedUsersData } from "./performanceHooks";
import { PhotoInteractionSummary } from "./ActionBar";
import { useFollowing, filterPhotosByFollowing } from "./useFollows";
import { getDisplayName, getScreenName } from "./useUserData";
import MobilePhotoCard from "./MobilePhotoCard";
import LocationDisplay from "./LocationDisplay";
import DiscoveryTab from "./DiscoveryTab";
import analytics from "./analyticsService";

// Existing icon components + new Discovery icon + Flag icon
const PublicIcon = ({ color = "#6c757d", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const FriendsIcon = ({ color = "#6c757d", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TaggedIcon = ({ color = "#6c757d", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const MyPostsIcon = ({ color = "#6c757d", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const DiscoveryIcon = ({ color = "#ff6b35", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
  </svg>
);

const FlagIcon = ({ color = "#ff6b35", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

const GlobalIcon = ({ color = "#06b6d4", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const LocalIcon = ({ color = "#22c55e", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const ClockIcon = ({ color = "#6c757d", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const HomeFeed = ({ photos, currentUser }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("public");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Location state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Global/Local toggle state
  const [isGlobalMode, setIsGlobalMode] = useState(true);

  // Analytics tracking state
  const [modeSessionStart, setModeSessionStart] = useState(Date.now());
  const [photosViewedInSession, setPhotosViewedInSession] = useState(0);
  const [photosPostedInSession, setPhotosPostedInSession] = useState(0);

  // Photo flagging state
  const [flaggingPhoto, setFlaggingPhoto] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);

  // Gesture state for modal
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

  // Get following list for friends filter
  const { followingList, loading: followingLoading } = useFollowing(currentUser?.uid);

  // Get unique user IDs for optimized user data fetching
  const uniqueUserIds = useMemo(() => {
    return [...new Set(photos.map((photo) => photo.uid).filter(Boolean))];
  }, [photos.map((p) => p.uid).join(",")]);

  const { usersData, loading: usersLoading } = useOptimizedUsersData(uniqueUserIds);

  // Handle user click to navigate to profile
  const handleUserClick = useCallback((userId) => {
    if (userId === currentUser?.uid) {
      navigate('/profile');
    } else {
      navigate(`/profile/${userId}`);
    }
  }, [navigate, currentUser?.uid]);

  // Venue detection function
  const detectVenue = useCallback((location) => {
    if (!location) return null;
    
    const KNOWN_VENUES = [
      { lat: 39.9685, lng: -82.9923, radius: 100, name: 'Fox in the Snow - Italian Village' },
      { lat: 39.9612, lng: -82.9988, radius: 150, name: 'North Market' },
      { lat: 39.9691, lng: -82.9977, radius: 200, name: 'Huntington Park' },
      { lat: 39.9634, lng: -82.9959, radius: 100, name: 'Natalie\'s Music Hall' },
      { lat: 39.9712, lng: -82.9943, radius: 150, name: 'Land-Grant Brewing' },
    ];

    for (const venue of KNOWN_VENUES) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        venue.lat,
        venue.lng
      );
      if (distance <= venue.radius) {
        return venue.name;
      }
    }
    return null;
  }, []);

  // Photo flagging functions
  const handleFlagPhoto = useCallback(async (reason) => {
    if (!selectedPhoto || !currentUser || flaggingPhoto) return;
    
    setFlaggingPhoto(true);
    setShowFlagMenu(false);
    
    try {
      const flagData = {
        photoId: selectedPhoto.id,
        photoOwnerId: selectedPhoto.uid,
        photoUrl: selectedPhoto.imageUrl,
        photoCaption: selectedPhoto.caption || '',
        flaggedBy: currentUser.uid,
        flaggedByEmail: currentUser.email,
        reason: reason,
        timestamp: serverTimestamp(),
        location: selectedPhoto.placeName || 'Unknown location',
        flagStatus: 'pending',
        
        userLocation: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : null,
        flaggedFromMode: isGlobalMode ? 'global' : 'local',
        flaggedFromFilter: activeFilter,
        
        photoLocation: selectedPhoto.latitude && selectedPhoto.longitude ? {
          latitude: selectedPhoto.latitude,
          longitude: selectedPhoto.longitude
        } : null
      };

      await addDoc(collection(db, "flags"), flagData);
      
      analytics.trackPhotoInteraction(
        'flag',
        selectedPhoto.latitude && selectedPhoto.longitude ? 
          { latitude: selectedPhoto.latitude, longitude: selectedPhoto.longitude } : null,
        currentLocation,
        isGlobalMode ? 'global' : 'local',
        { reason, flaggedPhotoId: selectedPhoto.id }
      );

      setFlagSuccess(true);
      setTimeout(() => setFlagSuccess(false), 2000);
      
      console.log('✅ Photo flagged successfully:', reason);
      
    } catch (error) {
      console.error('❌ Error flagging photo:', error);
    } finally {
      setFlaggingPhoto(false);
    }
  }, [selectedPhoto, currentUser, currentLocation, isGlobalMode, activeFilter, flaggingPhoto]);

  const toggleFlagMenu = useCallback(() => {
    setShowFlagMenu(prev => !prev);
  }, []);

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

  // Track app open on component mount
  useEffect(() => {
    if (currentLocation) {
      analytics.trackAppOpen(currentLocation, detectVenue(currentLocation));
    }
  }, [currentLocation, detectVenue]);

  // Get current location on component mount
  useEffect(() => {
    console.log("📍 HomeFeed: Getting current location...");
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLocationLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        console.log("📍 HomeFeed: Current location obtained:", location);
        setCurrentLocation(location);
        setLocationError(null);
        setLocationLoading(false);
      },
      (error) => {
        console.error("📍 HomeFeed: Location error:", error);
        setLocationError(error.message);
        setLocationLoading(false);
      },
      options
    );

    const locationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setCurrentLocation(location);
        },
        (error) => {
          console.warn("📍 HomeFeed: Location update failed:", error);
        },
        options
      );
    }, 30000);

    return () => clearInterval(locationInterval);
  }, []);

  // Distance calculation
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Format distance in miles
  const formatDistance = useCallback((distanceInMeters) => {
    const distanceInMiles = distanceInMeters * 0.000621371;
    
    if (distanceInMiles < 0.1) {
      return `${Math.round(distanceInMeters)}m`;
    } else if (distanceInMiles < 1) {
      return `${(distanceInMiles * 5280).toFixed(0)}ft`;
    } else if (distanceInMiles < 10) {
      return `${distanceInMiles.toFixed(1)}mi`;
    } else {
      return `${Math.round(distanceInMiles)}mi`;
    }
  }, []);

  // Location-based filtering
  const filterPhotosByLocation = useCallback((photosToFilter) => {
    if (!currentLocation) {
      return photosToFilter;
    }

    const PROXIMITY_RADIUS = isGlobalMode ? 50000000 : 25;
    
    const nearbyPhotos = photosToFilter.filter((photo) => {
      if (!photo.latitude || !photo.longitude) {
        return false;
      }

      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        photo.latitude,
        photo.longitude
      );

      return distance <= PROXIMITY_RADIUS;
    });

    return nearbyPhotos;
  }, [currentLocation, calculateDistance, isGlobalMode]);

  // Gesture helper functions
  const getTouchDistance = useCallback((touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const getTouchCenter = useCallback((touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;
    
    if (touches.length === 1) {
      const touch = touches[0];
      dragStartRef.current = {
        y: touch.clientY,
        time: Date.now()
      };
      setIsDragging(false);
    } else if (touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
      setIsZooming(true);
      setIsDragging(false);
    }
  }, [selectedPhoto, getTouchDistance, getTouchCenter]);

  const handleTouchMove = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;

    if (touches.length === 1 && !isZooming) {
      if (imageScale <= 1.1) {
        const touch = touches[0];
        const deltaY = touch.clientY - dragStartRef.current.y;
        
        if (Math.abs(deltaY) > 10) {
          setIsDragging(true);
          
          const resistance = 0.5;
          const translatedY = deltaY * resistance;
          
          if (translatedY > 0) {
            setModalTranslateY(translatedY);
          }
        }
      } else {
        e.preventDefault();
        const touch = touches[0];
        const deltaX = (touch.clientX - lastTouchCenter.x) * 0.5;
        const deltaY = (touch.clientY - lastTouchCenter.y) * 0.5;
        
        setImageTranslateX(prev => prev + deltaX);
        setImageTranslateY(prev => prev + deltaY);
        setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
      }
    } else if (touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.min(Math.max(imageScale * scaleChange, 0.5), 4);
        
        setImageScale(newScale);
        
        const deltaX = (center.x - lastTouchCenter.x) * 0.5;
        const deltaY = (center.y - lastTouchCenter.y) * 0.5;
        
        setImageTranslateX(prev => prev + deltaX);
        setImageTranslateY(prev => prev + deltaY);
      }
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  }, [selectedPhoto, isZooming, imageScale, lastTouchDistance, lastTouchCenter, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback((e) => {
    if (!selectedPhoto) return;

    const touches = e.touches;

    if (touches.length === 0) {
      if (isDragging) {
        const dismissThreshold = 80;
        if (modalTranslateY > dismissThreshold) {
          closePhotoModal();
        } else {
          setModalTranslateY(0);
        }
        setIsDragging(false);
      }
      
      setIsZooming(false);
      setLastTouchDistance(0);
      
      if (imageScale < 1) {
        setImageScale(1);
        setImageTranslateX(0);
        setImageTranslateY(0);
      }
    } else if (touches.length === 1 && isZooming) {
      setIsZooming(false);
      const touch = touches[0];
      setLastTouchCenter({ x: touch.clientX, y: touch.clientY });
    }
  }, [selectedPhoto, isDragging, modalTranslateY, imageScale, isZooming]);

  const handleDoubleTab = useCallback((e) => {
    if (!selectedPhoto) return;
    
    e.preventDefault();
    
    if (imageScale > 1) {
      setImageScale(1);
      setImageTranslateX(0);
      setImageTranslateY(0);
    } else {
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

  // Enhanced toggle handler with analytics
  const handleModeToggle = useCallback(() => {
    const previousMode = isGlobalMode;
    const newMode = !isGlobalMode;
    const venueDetected = detectVenue(currentLocation);

    analytics.trackModeToggle(
      previousMode ? 'global' : 'local',
      newMode ? 'global' : 'local',
      currentLocation,
      venueDetected
    );

    if (venueDetected) {
      const sessionDuration = Math.round((Date.now() - modeSessionStart) / 1000);
      analytics.trackVenueSession(
        { name: venueDetected, type: 'venue' },
        currentLocation,
        previousMode ? 'global' : 'local',
        sessionDuration,
        photosViewedInSession,
        photosPostedInSession
      );
    }

    setIsGlobalMode(newMode);
    setModeSessionStart(Date.now());
    setPhotosViewedInSession(0);
    setPhotosPostedInSession(0);
  }, [isGlobalMode, currentLocation, modeSessionStart, photosViewedInSession, photosPostedInSession, detectVenue]);

  // Filter options with Discovery
  const filters = [
    { id: "public", icon: PublicIcon, tooltip: "Public", label: "Public" },
    { id: "friends", icon: FriendsIcon, tooltip: "Friends", label: "Friends" },
    { id: "tagged", icon: TaggedIcon, tooltip: "Tagged", label: "Tagged" },
    { id: "mine", icon: MyPostsIcon, tooltip: "My Posts", label: "Mine" },
    { id: "discovery", icon: DiscoveryIcon, tooltip: "Trending & Discovery", label: "Discovery" },
  ];
  
  // Photo filtering
  const filteredPhotos = useMemo(() => {
    if (activeFilter === "discovery") {
      return [];
    }

    console.log(`🔄 HomeFeed: Starting filter process - ${photos.length} total photos, filter: ${activeFilter}`);

    const locationFilteredPhotos = filterPhotosByLocation(photos);

    const canUserSeePhoto = (photo) => {
      if (photo.uid === currentUser?.uid) {
        return true;
      }

      switch (photo.privacy) {
        case "public":
          return true;
        case "friends":
          return followingList.includes(photo.uid);
        case "tagged":
          return photo.taggedUsers?.some(
            (taggedUser) => taggedUser.uid === currentUser?.uid
          ) || false;
        default:
          return true;
      }
    };

    const privacyFilteredPhotos = locationFilteredPhotos.filter(canUserSeePhoto);

    let filtered = [];
    switch (activeFilter) {
      case "public":
        filtered = privacyFilteredPhotos.filter((photo) => photo.imageUrl);
        break;
      case "friends":
        filtered = filterPhotosByFollowing(privacyFilteredPhotos, followingList);
        break;
      case "tagged":
        filtered = privacyFilteredPhotos.filter((photo) =>
          photo.taggedUsers?.some(
            (taggedUser) => taggedUser.uid === currentUser?.uid
          )
        );
        break;
      case "mine":
        const myPhotos = photos.filter((photo) => photo.uid === currentUser?.uid);
        filtered = filterPhotosByLocation(myPhotos);
        break;
      default:
        filtered = privacyFilteredPhotos;
    }

    console.log(`✅ HomeFeed: Final result - ${filtered.length} photos after all filtering`);
    return filtered;
  }, [
    photos.map((p) => `${p.id}-${p.privacy}-${p.latitude}-${p.longitude}`).join(","),
    activeFilter,
    currentUser?.uid,
    followingList.join(","),
    currentLocation,
    filterPhotosByLocation,
    isGlobalMode
  ]);

  // Enhanced photo modal with analytics
  const openPhotoModal = useCallback((photo) => {
    const photoIndex = activeFilter === "discovery" 
      ? 0
      : filteredPhotos.findIndex((p) => p.id === photo.id);
    
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(photoIndex);

    analytics.trackPhotoInteraction(
      'view',
      photo.latitude && photo.longitude ? { latitude: photo.latitude, longitude: photo.longitude } : null,
      currentLocation,
      isGlobalMode ? 'global' : 'local'
    );

    setPhotosViewedInSession(prev => prev + 1);
  }, [filteredPhotos, currentLocation, isGlobalMode, activeFilter]);

  // Close modal with gesture reset
  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
    setModalTranslateY(0);
    setImageScale(1);
    setImageTranslateX(0);
    setImageTranslateY(0);
    setIsDragging(false);
    setIsZooming(false);
    setShowFlagMenu(false);
  }, []);

  const formatTimeAgo = useCallback((timestamp) => {
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

  const getUserInfo = useCallback(
    (photo) => {
      const userData = usersData[photo.uid];
      return {
        displayName: getDisplayName(userData, currentUser?.uid),
        screenName: getScreenName(userData),
        profilePicture: userData?.profilePicture || "",
        initials:
          userData?.realName?.charAt(0)?.toUpperCase() ||
          photo.uid?.charAt(0)?.toUpperCase() ||
          "?",
      };
    },
    [usersData, currentUser?.uid]
  );

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case "friends":
        return "👥";
      case "tagged":
        return "🏷️";
      case "public":
      default:
        return "🌍";
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", minHeight: "100vh", paddingTop: "16px" }}>
      {/* Location Status Indicators */}
      {locationError && (
        <div className="alert alert-danger" style={{ margin: "0 16px 16px 16px" }}>
          📍 Location unavailable - showing all photos
        </div>
      )}

      {locationLoading && (
        <div className="alert alert-info" style={{ margin: "0 16px 16px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ animation: "spin 1s linear infinite" }}>📍</div>
          Getting location...
        </div>
      )}

      {/* Filter Tabs with Global/Local Toggle */}
      <div style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border)",
        padding: "12px 0",
        position: "sticky",
        top: "0",
        zIndex: 100,
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "2px", padding: "0 8px" }}>
          {/* Global/Local Toggle */}
          {activeFilter !== "discovery" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
                <button
                  onClick={handleModeToggle}
                  className="mode-toggle active"
                  title={`Switch to ${isGlobalMode ? 'local' : 'global'} mode`}
                  style={{
                    backgroundColor: isGlobalMode ? "rgba(6, 182, 212, 0.1)" : "rgba(34, 197, 94, 0.1)",
                    borderColor: isGlobalMode ? "var(--color-primary)" : "var(--color-success)",
                  }}
                >
                  {isGlobalMode ? (
                    <GlobalIcon color="var(--color-primary)" size={14} />
                  ) : (
                    <LocalIcon color="var(--color-success)" size={14} />
                  )}
                  <span style={{ color: isGlobalMode ? "var(--color-primary)" : "var(--color-success)" }}>
                    {isGlobalMode ? "Global" : "Local"}
                  </span>
                </button>
              </div>

              <div style={{ width: "1px", height: "24px", backgroundColor: "var(--color-border)" }} />
            </>
          )}

          {/* Filter Tabs */}
          <div className="filter-tabs">
            {filters.map((filter) => {
              const IconComponent = filter.icon;
              const isActive = activeFilter === filter.id;
              const iconColor = isActive ? (filter.id === "discovery" ? "#ff6b35" : "var(--color-primary)") : "var(--color-text-muted)";
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  title={filter.tooltip}
                  className="btn-icon"
                  style={{
                    backgroundColor: isActive ? (filter.id === "discovery" ? "rgba(255, 107, 53, 0.08)" : "rgba(6, 182, 212, 0.08)") : "transparent",
                    position: "relative",
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = "var(--color-bg-tertiary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <IconComponent color={iconColor} size={20} />
                  
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      bottom: "6px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "4px",
                      height: "4px",
                      backgroundColor: filter.id === "discovery" ? "#ff6b35" : "var(--color-primary)",
                      borderRadius: "50%",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeFilter === "discovery" ? (
        <DiscoveryTab
          currentUser={currentUser}
          currentLocation={currentLocation}
          onPhotoClick={openPhotoModal}
          onUserClick={handleUserClick}
        />
      ) : (
        <div className="feed">
          {filteredPhotos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {activeFilter === "public" && <PublicIcon color="var(--color-text-muted)" size={48} />}
                {activeFilter === "friends" && <FriendsIcon color="var(--color-text-muted)" size={48} />}
                {activeFilter === "tagged" && <TaggedIcon color="var(--color-text-muted)" size={48} />}
                {activeFilter === "mine" && <MyPostsIcon color="var(--color-text-muted)" size={48} />}
              </div>
              <h3>{currentLocation 
                ? (isGlobalMode ? "No photos found" : "No nearby photos")
                : (activeFilter === "public" && "No photos yet")}
              </h3>
              <p>
                {currentLocation 
                  ? (isGlobalMode 
                      ? "No photos found matching your current filters"
                      : "Take a photo here or move to a location where photos were shared"
                    )
                  : "Enable location to see photos near you"}
              </p>
            </div>
          ) : (
            <div>
              {filteredPhotos.map((photo) => {
                const userInfo = getUserInfo(photo);

                return (
                  <MobilePhotoCard
                    key={photo.id}
                    photo={photo}
                    userInfo={userInfo}
                    currentUser={currentUser}
                    onPhotoClick={openPhotoModal}
                    onUserClick={handleUserClick}
                    showUserInfo={true}
                    showTimestamp={true}
                    formatTimeAgo={formatTimeAgo}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full-Screen Photo Modal with Flagging */}
      {selectedPhoto && (
        <div
          ref={modalRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(0, 0, 0, ${Math.max(0.98 - modalTranslateY * 0.002, 0.3)})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
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
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              transform: `translateY(${modalTranslateY}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: Math.max(1 - modalTranslateY * 0.01, 0.3),
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Overlay */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
              padding: "50px 20px 30px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div className="user-info" onClick={() => handleUserClick(selectedPhoto.uid)}>
                {getUserInfo(selectedPhoto).profilePicture ? (
                  <img
                    src={getUserInfo(selectedPhoto).profilePicture}
                    alt={getUserInfo(selectedPhoto).displayName}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-initials">
                    {getUserInfo(selectedPhoto).initials}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: "600", fontSize: "15px", color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                    {getUserInfo(selectedPhoto).displayName}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    @{getUserInfo(selectedPhoto).screenName}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedPhoto.uid !== currentUser?.uid && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={toggleFlagMenu}
                      disabled={flaggingPhoto}
                      className="btn-icon"
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        opacity: flaggingPhoto ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(255,107,53,0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(0,0,0,0.5)";
                      }}
                    >
                      {flaggingPhoto ? (
                        <div style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid white",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite"
                        }} />
                      ) : (
                        <FlagIcon color="white" size={20} />
                      )}
                    </button>

                    {showFlagMenu && (
                      <div style={{
                        position: "absolute",
                        top: "45px",
                        right: "0",
                        backgroundColor: "var(--color-bg-secondary)",
                        borderRadius: "var(--radius-xl)",
                        boxShadow: "var(--shadow-xl)",
                        padding: "8px",
                        minWidth: "200px",
                        zIndex: 1000,
                        animation: "slideInFromTop 0.2s ease-out"
                      }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", marginBottom: "8px" }}>
                          <h4 style={{ margin: "0 0 4px 0", color: "var(--color-text-primary)", fontSize: "14px", fontWeight: "600" }}>
                            Report this photo
                          </h4>
                          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "12px" }}>
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
                              borderRadius: "var(--radius-md)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              fontSize: "14px",
                              color: "var(--color-text-primary)",
                              transition: "background-color var(--transition-fast)",
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
                        
                        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--color-border)", marginTop: "8px" }}>
                          <button
                            onClick={() => setShowFlagMenu(false)}
                            className="btn-secondary"
                            style={{ width: "100%", padding: "8px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={closePhotoModal}
                  className="btn-icon"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    fontSize: "18px",
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(0,0,0,0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(0,0,0,0.5)";
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Success Toast */}
            {flagSuccess && (
              <div style={{
                position: "absolute",
                top: "100px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(34, 197, 94, 0.9)",
                color: "white",
                padding: "12px 20px",
                borderRadius: "var(--radius-full)",
                fontSize: "14px",
                fontWeight: "500",
                zIndex: 1100,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                animation: "slideInFromTop 0.3s ease-out"
              }}>
                <span>✅</span>
                <span>Thank you for reporting this content</span>
              </div>
            )}

            {/* Photo Container */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "black",
              overflow: "hidden",
              position: "relative",
              touchAction: "none",
            }}>
              <img
                ref={imageRef}
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || "Photo"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `scale(${imageScale}) translate(${imageTranslateX}px, ${imageTranslateY}px)`,
                  transition: (isDragging || isZooming) ? 'none' : 'transform 0.3s ease-out',
                  cursor: imageScale > 1 ? 'grab' : 'default',
                }}
                onDoubleClick={handleDoubleTab}
                draggable={false}
              />
              
              {imageScale > 1.1 && (
                <div style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  fontWeight: "500",
                  pointerEvents: "none",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}>
                  {Math.round(imageScale * 100)}%
                </div>
              )}
            </div>

            {/* Details Overlay */}
            {(selectedPhoto.caption || selectedPhoto.placeName) && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
                padding: "30px 20px 50px 20px",
                color: "white",
              }}>
                {selectedPhoto.caption && (
                  <p style={{ margin: "0 0 8px 0", fontSize: "15px", lineHeight: "1.4", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                    <span 
                      style={{ fontWeight: "600", cursor: "pointer" }}
                      onClick={() => handleUserClick(selectedPhoto.uid)}
                    >
                      {getUserInfo(selectedPhoto).displayName}
                    </span>{" "}
                    {selectedPhoto.caption}
                  </p>
                )}

                {selectedPhoto.placeName && (
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "6px", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    <span>📍</span>
                    <span>{selectedPhoto.placeName}</span>
                    {currentLocation && selectedPhoto.latitude && selectedPhoto.longitude && (
                      <span style={{ marginLeft: "8px" }}>
                        ({formatDistance(calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          selectedPhoto.latitude,
                          selectedPhoto.longitude
                        ))} away)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes slideInFromTop {
            0% {
              opacity: 0;
              transform: translateY(-10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default HomeFeed;
