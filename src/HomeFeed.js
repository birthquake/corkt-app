// HomeFeed.js - Enhanced with Discovery Features and Immersive Photo Modal
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOptimizedUsersData } from "./performanceHooks";
import { PhotoInteractionSummary } from "./ActionBar";
import { useFollowing, filterPhotosByFollowing } from "./useFollows";
import { getDisplayName, getScreenName } from "./useUserData";
import MobilePhotoCard from "./MobilePhotoCard";
import LocationDisplay from "./LocationDisplay";
import DiscoveryTab from "./DiscoveryTab"; // ✅ NEW: Import Discovery component
import analytics from "./analyticsService";

// Existing icon components + new Discovery icon
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

// ✅ NEW: Discovery icon
const DiscoveryIcon = ({ color = "#ff6b35", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
  </svg>
);

const GlobalIcon = ({ color = "#007bff", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const LocalIcon = ({ color = "#28a745", size = 16 }) => (
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

  // ✅ NEW: Gesture state for modal
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

  // ✅ NEW: Reset zoom and position when photo changes
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

    // Update location every 30 seconds
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

  // ✅ NEW: Gesture helper functions
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

  // ✅ NEW: Touch gesture handlers
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

  // ✅ UPDATED: Filter options with Discovery
  const filters = [
  { 
    id: "public", 
    icon: PublicIcon, 
    tooltip: "Public",
    label: "Public"
  },
  { 
    id: "friends", 
    icon: FriendsIcon, 
    tooltip: "Friends",
    label: "Friends"
  },
  { 
    id: "tagged", 
    icon: TaggedIcon, 
    tooltip: "Tagged",
    label: "Tagged"
  },
  { 
    id: "mine", 
    icon: MyPostsIcon, 
    tooltip: "My Posts",
    label: "Mine"
  },
  { 
    id: "discovery", 
    icon: DiscoveryIcon, 
    tooltip: "Trending & Discovery",
    label: "Discovery"
  },
];
  
  // Photo filtering (only for non-discovery filters)
  const filteredPhotos = useMemo(() => {
    if (activeFilter === "discovery") {
      return []; // Discovery tab handles its own photos
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
      ? 0 // Discovery photos don't have a consistent index
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

  // ✅ UPDATED: Close modal with gesture reset
  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
    setModalTranslateY(0);
    setImageScale(1);
    setImageTranslateX(0);
    setImageTranslateY(0);
    setIsDragging(false);
    setIsZooming(false);
  }, []);

  const formatTimeAgo = useCallback((timestamp) => {
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
    <div
      style={{
        maxWidth: "500px", 
        margin: "0 auto", 
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",  
        paddingTop: "16px",
      }}
    >
      {/* Location Status Indicators */}
      {locationError && (
        <div style={{
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "8px",
          padding: "8px 16px",
          margin: "0 16px 16px 16px",
          fontSize: "12px",
          color: "#721c24"
        }}>
          📍 Location unavailable - showing all photos
        </div>
      )}

      {locationLoading && (
        <div style={{
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "8px",
          padding: "8px 16px",
          margin: "0 16px 16px 16px",
          fontSize: "12px",
          color: "#856404",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ animation: "spin 1s linear infinite" }}>📍</div>
          Getting location...
        </div>
      )}

      {/* Filter Tabs with Global/Local Toggle */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e9ecef",
          padding: "12px 0",
          position: "sticky",  
          top: "0",           
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "2px",
            padding: "0 8px",
          }}
        >
          {/* Global/Local Toggle - Hide for Discovery tab */}
          {activeFilter !== "discovery" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginRight: "8px",
                }}
              >
                <button
                  onClick={handleModeToggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    backgroundColor: isGlobalMode ? "#007bff" : "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  title={`Switch to ${isGlobalMode ? 'local' : 'global'} mode`}
                >
                  {isGlobalMode ? (
                    <GlobalIcon color="white" size={14} />
                  ) : (
                    <LocalIcon color="white" size={14} />
                  )}
                  <span>
                    {isGlobalMode ? "Global" : "Local"}
                  </span>
                </button>
              </div>

              {/* Separator */}
              <div
                style={{
                  width: "1px",
                  height: "24px",
                  backgroundColor: "#e9ecef",
                }}
              />
            </>
          )}

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {filters.map((filter) => {
              const IconComponent = filter.icon;
              const isActive = activeFilter === filter.id;
              const iconColor = isActive ? (filter.id === "discovery" ? "#ff6b35" : "#007bff") : "#6b7280";
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  title={filter.tooltip}
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: isActive ? (filter.id === "discovery" ? "rgba(255, 107, 53, 0.08)" : "rgba(0, 123, 255, 0.08)") : "transparent",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <IconComponent color={iconColor} size={20} />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "4px",
                        height: "4px",
                        backgroundColor: filter.id === "discovery" ? "#ff6b35" : "#007bff",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeFilter === "discovery" ? (
        // ✅ NEW: Discovery Tab Content
        <DiscoveryTab
          currentUser={currentUser}
          currentLocation={currentLocation}
          onPhotoClick={openPhotoModal}
          onUserClick={handleUserClick}
        />
      ) : (
        // Existing feed content
        <div style={{ padding: "16px" }}>
          {filteredPhotos.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#6c757d",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                {activeFilter === "public" && <PublicIcon color="#6c757d" size={48} />}
                {activeFilter === "friends" && <FriendsIcon color="#6c757d" size={48} />}
                {activeFilter === "tagged" && <TaggedIcon color="#6c757d" size={48} />}
                {activeFilter === "mine" && <MyPostsIcon color="#6c757d" size={48} />}
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
                {currentLocation 
                  ? (isGlobalMode ? "No photos found" : "No nearby photos")
                  : (activeFilter === "public" && "No photos yet")}
                {!currentLocation && activeFilter === "friends" && followingList.length === 0
                  ? "No followed users"
                  : !currentLocation && activeFilter === "friends" && "No photos from friends"}
                {!currentLocation && activeFilter === "tagged" && "No tagged photos"}
                {!currentLocation && activeFilter === "mine" && "No photos posted"}
              </h3>
              <p style={{ margin: 0, fontSize: "14px" }}>
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

      {/* ✅ IMMERSIVE: Full-Screen Photo Modal */}
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
            {/* ✅ FLOATING: Header Overlay */}
            <div
              style={{
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
              }}
            >
              <div
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  cursor: "pointer",
                  flex: 1,
                }}
                onClick={() => handleUserClick(selectedPhoto.uid)}
              >
                {getUserInfo(selectedPhoto).profilePicture ? (
                  <img
                    src={getUserInfo(selectedPhoto).profilePicture}
                    alt={getUserInfo(selectedPhoto).displayName}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid rgba(255,255,255,0.3)",
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
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {getUserInfo(selectedPhoto).initials}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "15px",
                      color: "white",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    {getUserInfo(selectedPhoto).displayName}
                  </div>
                  <div 
                    style={{ 
                      fontSize: "12px", 
                      color: "rgba(255,255,255,0.8)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    @{getUserInfo(selectedPhoto).screenName}
                  </div>
                </div>
              </div>
              
              <button
                onClick={closePhotoModal}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "white",
                  padding: "8px",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  transition: "all 0.2s ease",
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

            {/* ✅ FULL-SCREEN: Photo Container */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "black",
                overflow: "hidden",
                position: "relative",
                touchAction: "none",
              }}
            >
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
              
              {/* Zoom indicator */}
              {imageScale > 1.1 && (
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "500",
                    pointerEvents: "none",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {Math.round(imageScale * 100)}%
                </div>
              )}
            </div>

            {/* ✅ BOTTOM: Details Overlay */}
            {(selectedPhoto.caption || selectedPhoto.placeName) && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
                  padding: "30px 20px 50px 20px",
                  color: "white",
                }}
              >
                {selectedPhoto.caption && (
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "15px",
                      lineHeight: "1.4",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span 
                      style={{ 
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      onClick={() => handleUserClick(selectedPhoto.uid)}
                    >
                      {getUserInfo(selectedPhoto).displayName}
                    </span>{" "}
                    {selectedPhoto.caption}
                  </p>
                )}

                {selectedPhoto.placeName && (
                  <div 
                    style={{ 
                      fontSize: "12px", 
                      color: "rgba(255,255,255,0.8)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
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
        `}
      </style>
    </div>
  );
};

export default HomeFeed;
