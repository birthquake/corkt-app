import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ✅ NEW: Import useNavigate
import { useOptimizedUsersData } from "./performanceHooks";
import { PhotoInteractionSummary } from "./ActionBar";
import { useFollowing, filterPhotosByFollowing } from "./useFollows";
import { getDisplayName, getScreenName } from "./useUserData";
import MobilePhotoCard from "./MobilePhotoCard";
import LocationDisplay from "./LocationDisplay"; // ✅ NEW: Import LocationDisplay component
import PullToRefresh from "./PullToRefresh"; // ✅ NEW: Import PullToRefresh
import analytics from "./analyticsService";

// Minimal SVG icon components
const PublicIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const FriendsIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TaggedIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const MyPostsIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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
  const navigate = useNavigate(); // ✅ NEW: Initialize navigation hook
  const [activeFilter, setActiveFilter] = useState("public");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // 🆕 LOCATION STATE
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // 🌍 Global/Local toggle state
  const [isGlobalMode, setIsGlobalMode] = useState(true); // Default to global mode

  // 📊 Analytics tracking state
  const [modeSessionStart, setModeSessionStart] = useState(Date.now());
  const [photosViewedInSession, setPhotosViewedInSession] = useState(0);
  const [photosPostedInSession, setPhotosPostedInSession] = useState(0);

  // ✅ NEW: Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Get following list for friends filter and privacy checking
  const { followingList, loading: followingLoading } = useFollowing(
    currentUser?.uid
  );

  // 🚀 Get unique user IDs and use optimized user data fetching
  const uniqueUserIds = useMemo(() => {
    return [...new Set(photos.map((photo) => photo.uid).filter(Boolean))];
  }, [photos.map((p) => p.uid).join(",")]);

  const { usersData, loading: usersLoading } =
    useOptimizedUsersData(uniqueUserIds);

  // ✅ NEW: Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    console.log("🔄 Pull-to-refresh triggered");
    setRefreshing(true);
    
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // You can add actual refresh logic here, such as:
      // - Refetch photos
      // - Update location  
      // - Reload user data
      
      console.log("✅ Refresh completed");
    } catch (error) {
      console.error("❌ Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ✅ NEW: Handle user click to navigate to profile
  const handleUserClick = useCallback((userId) => {
    if (userId === currentUser?.uid) {
      // Navigate to own profile without userId parameter
      navigate('/profile');
    } else {
      // Navigate to other user's profile with userId parameter
      navigate(`/profile/${userId}`);
    }
  }, [navigate, currentUser?.uid]);

  // 📊 Simple venue detection function
  const detectVenue = useCallback((location) => {
    if (!location) return null;
    
    const KNOWN_VENUES = [
      { lat: 39.9685, lng: -82.9923, radius: 100, name: 'Fox in the Snow - Italian Village' },
      { lat: 39.9612, lng: -82.9988, radius: 150, name: 'North Market' },
      { lat: 39.9691, lng: -82.9977, radius: 200, name: 'Huntington Park' },
      { lat: 39.9634, lng: -82.9959, radius: 100, name: 'Natalie\'s Music Hall' },
      { lat: 39.9712, lng: -82.9943, radius: 150, name: 'Land-Grant Brewing' },
      // Add more venues as needed
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

  // 📊 Track app open on component mount
  useEffect(() => {
    if (currentLocation) {
      analytics.trackAppOpen(currentLocation, detectVenue(currentLocation));
    }
  }, [currentLocation, detectVenue]);

  // 🆕 GET CURRENT LOCATION ON COMPONENT MOUNT
  useEffect(() => {
    console.log("📍 HomeFeed: Getting current location for filtering...");
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLocationLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // Use cached location if less than 30 seconds old
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

    // 🔄 Update location every 30 seconds for real-time filtering
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

  // 🆕 HAVERSINE DISTANCE CALCULATION
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }, []);

  // ✅ NEW: Helper function to format distance in miles
  const formatDistance = useCallback((distanceInMeters) => {
    const distanceInMiles = distanceInMeters * 0.000621371; // Convert meters to miles
    
    if (distanceInMiles < 0.1) {
      return `${Math.round(distanceInMeters)}m`; // Show meters for very short distances
    } else if (distanceInMiles < 1) {
      return `${(distanceInMiles * 5280).toFixed(0)}ft`; // Show feet for distances under 1 mile
    } else if (distanceInMiles < 10) {
      return `${distanceInMiles.toFixed(1)}mi`; // Show 1 decimal for distances under 10 miles
    } else {
      return `${Math.round(distanceInMiles)}mi`; // Show whole miles for longer distances
    }
  }, []);

  // 🌍 UPDATED: DYNAMIC LOCATION-BASED FILTERING FUNCTION
  const filterPhotosByLocation = useCallback((photosToFilter) => {
    if (!currentLocation) {
      console.log("📍 HomeFeed: No current location - showing all photos");
      return photosToFilter;
    }

    // 🌍 DYNAMIC RADIUS based on toggle state
    const PROXIMITY_RADIUS = isGlobalMode ? 50000000 : 25; // Global: 50,000km, Local: 25m
    const modeText = isGlobalMode ? "globally" : "locally";
    
    console.log(`📍 HomeFeed: Filtering ${photosToFilter.length} photos ${modeText} (${PROXIMITY_RADIUS}m radius)...`);
    console.log(`📍 Current location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`);

    const nearbyPhotos = photosToFilter.filter((photo) => {
      // Skip photos without location data
      if (!photo.latitude || !photo.longitude) {
        console.log(`📍 Photo ${photo.id}: No location data - EXCLUDING`);
        return false;
      }

      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        photo.latitude,
        photo.longitude
      );

      const isNearby = distance <= PROXIMITY_RADIUS;
      
      console.log(
        `📍 Photo ${photo.id}: ${Math.round(distance)}m away - ${
          isNearby ? "INCLUDING" : "EXCLUDING"
        }`
      );

      return isNearby;
    });

    console.log(`📍 Location filtering (${modeText}): ${photosToFilter.length} total → ${nearbyPhotos.length} nearby`);
    return nearbyPhotos;
  }, [currentLocation, calculateDistance, isGlobalMode]);

  // 📊 Enhanced toggle handler with analytics
  const handleModeToggle = useCallback(() => {
    const previousMode = isGlobalMode;
    const newMode = !isGlobalMode;
    const venueDetected = detectVenue(currentLocation);

    // Track the mode toggle
    analytics.trackModeToggle(
      previousMode ? 'global' : 'local',
      newMode ? 'global' : 'local',
      currentLocation,
      venueDetected
    );

    // Track session data for previous mode
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

    // Update state
    setIsGlobalMode(newMode);
    setModeSessionStart(Date.now());
    setPhotosViewedInSession(0);
    setPhotosPostedInSession(0);
  }, [isGlobalMode, currentLocation, modeSessionStart, photosViewedInSession, photosPostedInSession, detectVenue]);

  // Updated filter options with icon components
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
  ];

  // 🚀 ENHANCED PHOTO FILTERING WITH LOCATION-BASED FILTERING FIRST
  const filteredPhotos = useMemo(() => {
    console.log(
      `🔄 HomeFeed: Starting filter process - ${photos.length} total photos, filter: ${activeFilter}, mode: ${isGlobalMode ? 'global' : 'local'}`
    );

    // 🎯 STEP 1: LOCATION-BASED FILTERING
    const locationFilteredPhotos = filterPhotosByLocation(photos);

    // Function to check if user can see a photo based on privacy
    const canUserSeePhoto = (photo) => {
      // User can always see their own photos
      if (photo.uid === currentUser?.uid) {
        return true;
      }

      // Handle privacy settings
      switch (photo.privacy) {
        case "public":
          return true;

        case "friends":
          // Only followers of the photo owner can see
          return followingList.includes(photo.uid);

        case "tagged":
          // Only tagged users can see
          return (
            photo.taggedUsers?.some(
              (taggedUser) => taggedUser.uid === currentUser?.uid
            ) || false
          );

        default:
          // For photos without privacy setting (legacy), treat as public
          return true;
      }
    };

    // 🎯 STEP 2: PRIVACY FILTERING (after location filtering)
    const privacyFilteredPhotos = locationFilteredPhotos.filter(canUserSeePhoto);

    // 🎯 STEP 3: USER FILTER (public/friends/tagged/mine)
    let filtered = [];
    switch (activeFilter) {
      case "public":
        // Show public photos that user can see (based on privacy AND location)
        filtered = privacyFilteredPhotos.filter((photo) => photo.imageUrl);
        break;

      case "friends":
        // Show photos from users that current user follows (and can see based on privacy AND location)
        filtered = filterPhotosByFollowing(
          privacyFilteredPhotos,
          followingList
        );
        break;

      case "tagged":
        // Show photos where user is tagged (and can see based on privacy AND location)
        filtered = privacyFilteredPhotos.filter((photo) =>
          photo.taggedUsers?.some(
            (taggedUser) => taggedUser.uid === currentUser?.uid
          )
        );
        break;

      case "mine":
        // Show user's own photos (apply location filtering but not privacy)
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

  // 📊 Enhanced photo modal with analytics
  const openPhotoModal = useCallback((photo) => {
    const photoIndex = filteredPhotos.findIndex((p) => p.id === photo.id);
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(photoIndex);

    // Track photo interaction
    analytics.trackPhotoInteraction(
      'view',
      photo.latitude && photo.longitude ? { latitude: photo.latitude, longitude: photo.longitude } : null,
      currentLocation,
      isGlobalMode ? 'global' : 'local'
    );

    // Increment photos viewed in current session
    setPhotosViewedInSession(prev => prev + 1);
  }, [filteredPhotos, currentLocation, isGlobalMode]);

  // 📊 Track photo posting (call this when users post photos)
  const trackPhotoPost = useCallback((photoLocation) => {
    const venueDetected = detectVenue(currentLocation);
    
    analytics.trackPhotoInteraction(
      'post',
      photoLocation,
      currentLocation,
      isGlobalMode ? 'global' : 'local'
    );

    // Increment photos posted in current session
    setPhotosPostedInSession(prev => prev + 1);
  }, [currentLocation, isGlobalMode, detectVenue]);

  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
  }, []);

  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return "Unknown time";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return "Today";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  // 🚀 Memoized helper function to get user info for a photo
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

  // Helper function to get privacy icon
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

  // 📊 Analytics summary for development (remove in production)
  const showAnalyticsSummary = () => {
    const venueDetected = detectVenue(currentLocation);
    if (venueDetected) {
      const venueAnalytics = analytics.getVenueAnalytics(venueDetected);
      console.log('📊 Venue Analytics for', venueDetected, ':', venueAnalytics);
    }
    // Show general analytics
    console.log('📊 Total Events:', analytics.events.length);
    console.log('📊 Recent Events:', analytics.events.slice(-10));
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
      {/* 🆕 SIMPLIFIED LOCATION STATUS INDICATORS */}
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

      {/* 🌍 Filter Tabs with Global/Local Toggle and Minimal Icons */}
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
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            padding: "0 16px",
          }}
        >
          {/* 🌍 GLOBAL/LOCAL TOGGLE with analytics */}
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

          {/* Updated Filter Tabs with minimal icons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
            }}
          >
            {filters.map((filter) => {
              const IconComponent = filter.icon;
              const isActive = activeFilter === filter.id;
              const iconColor = isActive ? "#007bff" : "#6b7280";
              
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  title={filter.tooltip}
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: isActive ? "rgba(0, 123, 255, 0.08)" : "transparent",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
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
                  
                  {/* Minimal active indicator */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "4px",
                        height: "4px",
                        backgroundColor: "#007bff",
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

      {/* ✅ NEW: Pull-to-Refresh Wrapper around Feed Content */}
      <PullToRefresh
        onRefresh={handleRefresh}
        disabled={refreshing}
        refreshThreshold={80}
        maxPullDistance={120}
      >
        {/* Feed Content */}
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
              <p style={{ margin: "16px 0 0 0", fontSize: "12px", color: "#007bff" }}>
                Pull down to refresh
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
                    onUserClick={handleUserClick} // ✅ NEW: Pass the user click handler
                    showUserInfo={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* ✅ ENHANCED: Photo Modal with Improved Location Display and Clickable User */}
      {selectedPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px 20px 110px 20px",
          }}
          onClick={closePhotoModal}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              maxWidth: "90vw",
              maxHeight: "calc(100vh - 130px)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - ✅ UPDATED: Make user info clickable */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  cursor: "pointer" // ✅ NEW: Show clickable cursor
                }}
                onClick={() => handleUserClick(selectedPhoto.uid)} // ✅ NEW: Make user info clickable
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
                    {getUserInfo(selectedPhoto).initials}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#343a40",
                    }}
                  >
                    {getUserInfo(selectedPhoto).displayName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    @{getUserInfo(selectedPhoto).screenName}
                  </div>
                </div>
              </div>
              <button
                onClick={closePhotoModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "4px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Photo */}
            <div
              style={{
                flex: "0 0 auto",
                maxHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa",
              }}
            >
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || "Photo"}
                style={{
                  width: "100%",
                  height: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Modal Content - Scrollable */}
            <div
              style={{
                padding: "20px",
                flex: "1 1 auto",
                overflow: "auto",
                maxHeight: "30vh",
              }}
            >
              {/* Privacy indicator in modal */}
              {selectedPhoto.privacy && selectedPhoto.privacy !== "public" && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "#f8f9fa",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#6c757d",
                    marginBottom: "12px",
                  }}
                >
                  {getPrivacyIcon(selectedPhoto.privacy)}
                  <span style={{ textTransform: "capitalize" }}>
                    {selectedPhoto.privacy} photo
                  </span>
                </div>
              )}

              {/* Caption - ✅ UPDATED: Make username clickable in caption */}
              {selectedPhoto.caption && (
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "16px",
                    lineHeight: "1.4",
                    color: "#343a40",
                  }}
                >
                  <span 
                    style={{ 
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "#007bff"
                    }}
                    onClick={() => handleUserClick(selectedPhoto.uid)} // ✅ NEW: Make username in caption clickable
                  >
                    {getUserInfo(selectedPhoto).displayName}
                  </span>{" "}
                  {selectedPhoto.caption}
                </p>
              )}

              {/* Show tagged users in modal */}
              {selectedPhoto.taggedUsers &&
                selectedPhoto.taggedUsers.length > 0 && (
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#007bff",
                    }}
                  >
                    with{" "}
                    {selectedPhoto.taggedUsers.map((taggedUser, index) => (
                      <span 
                        key={taggedUser.uid}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleUserClick(taggedUser.uid)} // ✅ NEW: Make tagged usernames clickable
                      >
                        @{taggedUser.displayScreenName}
                        {index < selectedPhoto.taggedUsers.length - 1
                          ? ", "
                          : ""}
                      </span>
                    ))}
                  </p>
                )}

              {/* ✅ ENHANCED: Time and location with clean icons and miles */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  fontSize: "12px",
                  color: "#6c757d",
                  marginBottom: "16px",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ClockIcon color="#6c757d" size={14} />
                  <span>{formatTimeAgo(selectedPhoto.timestamp)}</span>
                </div>

                {/* ✅ NEW: Enhanced location display matching MobilePhotoCard logic */}
                {selectedPhoto.placeName ? (
                  // Show specific place name if available
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍</span>
                    <span>{selectedPhoto.placeName}</span>
                    {/* Show distance if current location available */}
                    {currentLocation && selectedPhoto.latitude && selectedPhoto.longitude && (
                      <span style={{ marginLeft: "8px", fontWeight: "500" }}>
                        ({formatDistance(calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          selectedPhoto.latitude,
                          selectedPhoto.longitude
                        ))} away)
                      </span>
                    )}
                  </div>
                ) : selectedPhoto.latitude && selectedPhoto.longitude ? (
                  // Fallback to LocationDisplay component for neighborhood/city/state
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍</span>
                    <LocationDisplay
                      latitude={selectedPhoto.latitude}
                      longitude={selectedPhoto.longitude}
                    />
                    {/* Show distance if current location available */}
                    {currentLocation && (
                      <span style={{ marginLeft: "8px", fontWeight: "500" }}>
                        ({formatDistance(calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          selectedPhoto.latitude,
                          selectedPhoto.longitude
                        ))} away)
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Photo interaction summary */}
              <PhotoInteractionSummary
                photo={selectedPhoto}
                currentUserId={currentUser?.uid}
              />
            </div>

            {/* Fixed Bottom Button */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #f0f0f0",
                backgroundColor: "#ffffff",
                flexShrink: 0,
              }}
            >
              <button
                onClick={closePhotoModal}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#007bff",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 Analytics test button (remove in production) */}
      <button
        onClick={showAnalyticsSummary}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "8px 12px",
          backgroundColor: "#17a2b8",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "12px",
          cursor: "pointer",
          zIndex: 1000
        }}
      >
        📊 Analytics
      </button>

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
