import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useOptimizedUsersData,
  useOptimizedUserSearch,
  useDebounce,
} from "./performanceHooks";
import { useFollow, useFollowing } from "./useFollows";
import { getDisplayName, getScreenName } from "./useUserData";
import { getTrendingHashtags, formatTextWithHashtags } from "./hashtagService";
import LocationDisplay from "./LocationDisplay";

// Minimal SVG icon components
const SearchIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

const PhotoIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const UsersIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TrendingIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const CloseIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SearchNotFoundIcon = ({ color = "var(--color-text-muted)", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const UsersNotFoundIcon = ({ color = "var(--color-text-muted)", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>
);

const GalleryIcon = ({ color = "var(--color-text-muted)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ClockIcon = ({ color = "var(--color-text-muted)", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

// Memoized User Card component
const UserCard = React.memo(({ user, currentUser, getUserPhotoCount }) => {
  const {
    isFollowing,
    loading: followLoading,
    toggleFollow,
  } = useFollow(user.id, currentUser?.uid);

  const handleFollowClick = useCallback(
    (e) => {
      e.stopPropagation();
      toggleFollow();
    },
    [toggleFollow]
  );

  const showFollowButton = currentUser?.uid !== user.id;

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-tertiary)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)")}
    >
      {user.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.realName}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid var(--color-primary)",
          }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-bg-primary)",
            fontSize: "18px",
            fontWeight: "600",
          }}
        >
          {user.realName?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}

      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: "0 0 4px 0",
            fontWeight: "600",
            color: "var(--color-text-primary)",
            fontSize: "16px",
          }}
        >
          {user.realName || "Unknown User"}
        </p>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: "14px",
            color: "var(--color-primary)",
          }}
        >
          @{user.displayScreenName || user.screenName || "unknown"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "var(--color-text-muted)",
          }}
        >
          {getUserPhotoCount(user.id)} photo
          {getUserPhotoCount(user.id) !== 1 ? "s" : ""}
          {user.bio &&
            ` • ${
              user.bio.length > 50
                ? user.bio.substring(0, 50) + "..."
                : user.bio
            }`}
        </p>
      </div>

      {showFollowButton && (
        <button
          onClick={handleFollowClick}
          disabled={followLoading}
          style={{
            padding: "6px 16px",
            backgroundColor: isFollowing ? "var(--color-text-muted)" : "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: followLoading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            opacity: followLoading ? 0.7 : 1,
            minWidth: "80px",
          }}
          onMouseEnter={(e) => {
            if (!followLoading) {
              e.target.style.backgroundColor = isFollowing
                ? "var(--color-text-secondary)"
                : "var(--color-primary-dark)";
            }
          }}
          onMouseLeave={(e) => {
            if (!followLoading) {
              e.target.style.backgroundColor = isFollowing
                ? "var(--color-text-muted)"
                : "var(--color-primary)";
            }
          }}
        >
          {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
});

UserCard.displayName = "UserCard";

// Memoized Photo Grid Item
const PhotoGridItem = React.memo(({ photo, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoaded(false);
    setImageError(true);
  }, []);

  const handleClick = useCallback(() => {
    if (!imageError) {
      onClick(photo);
    }
  }, [photo, onClick, imageError]);

  return (
    <div
      onClick={handleClick}
      style={{
        aspectRatio: "1",
        cursor: imageError ? "default" : "pointer",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "var(--color-bg-secondary)",
      }}
    >
      {!imageLoaded && !imageError && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid var(--color-border)",
              borderTop: "2px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}

      {imageError && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--color-bg-secondary)",
            color: "var(--color-text-muted)",
            fontSize: "24px",
          }}
        >
          ⚠️
        </div>
      )}

      <img
        src={photo.imageUrl}
        alt={photo.caption || "Photo"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: imageLoaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />

      {photo.caption && imageLoaded && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            color: "white",
            padding: "8px 4px 4px",
            fontSize: "10px",
            lineHeight: "1.2",
          }}
        >
          {photo.caption.length > 30
            ? photo.caption.substring(0, 30) + "..."
            : photo.caption}
        </div>
      )}
    </div>
  );
});

PhotoGridItem.displayName = "PhotoGridItem";

const SearchPage = ({ photos, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("photos");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Get current location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        });
      },
      (error) => {
        console.warn("📍 SearchPage: Location error:", error);
      },
      options
    );
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

  // Format distance
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

  // Handle hashtag search from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hashtagParam = urlParams.get("hashtag");

    if (hashtagParam) {
      setSearchQuery(`#${hashtagParam}`);
      setActiveTab("photos");
      console.log(`🔍 SearchPage: Auto-searching for hashtag #${hashtagParam}`);
    }
  }, [location.search]);

  // Load trending hashtags
  useEffect(() => {
    const loadTrendingHashtags = async () => {
      try {
        const trending = await getTrendingHashtags(7, 15);
        setTrendingHashtags(trending);
        console.log(
          `✅ SearchPage: Loaded ${trending.length} trending hashtags`
        );
      } catch (error) {
        console.error("❌ Error loading trending hashtags:", error);
        setTrendingHashtags([]);
      }
    };

    loadTrendingHashtags();
  }, [photos]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { followingList } = useFollowing(currentUser?.uid);
  const { searchResults: userSearchResults, loading: userSearchLoading } =
    useOptimizedUserSearch(activeTab === "users" ? debouncedSearchQuery : "");

  const uniqueUserIds = useMemo(() => {
    return [...new Set(photos.map((photo) => photo.uid).filter(Boolean))];
  }, [photos.map((p) => p.uid).join(",")]);

  const { usersData } = useOptimizedUsersData(uniqueUserIds);

  const canUserSeePhoto = useCallback(
    (photo) => {
      if (photo.uid === currentUser?.uid) {
        return true;
      }

      switch (photo.privacy) {
        case "public":
          return true;
        case "friends":
          return followingList.includes(photo.uid);
        case "tagged":
          return (
            photo.taggedUsers?.some(
              (taggedUser) => taggedUser.uid === currentUser?.uid
            ) || false
          );
        default:
          return true;
      }
    },
    [currentUser?.uid, followingList]
  );

  const photoSearchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim() || activeTab !== "photos") {
      return [];
    }

    console.log(
      `🔍 SearchPage: Searching photos for "${debouncedSearchQuery}"`
    );

    const query = debouncedSearchQuery.toLowerCase().trim();
    const privacyFilteredPhotos = photos.filter(canUserSeePhoto);

    const filteredPhotos = privacyFilteredPhotos.filter((photo) => {
      const caption = (photo.caption || "").toLowerCase();
      const userData = usersData[photo.uid];
      const userName = (userData?.realName || "").toLowerCase();
      const screenName = (userData?.displayScreenName || "").toLowerCase();

      if (query.startsWith("#")) {
        const searchHashtag = query.substring(1);

        if (photo.hashtags && Array.isArray(photo.hashtags)) {
          const hashtagMatch = photo.hashtags.some((hashtag) =>
            hashtag.toLowerCase().includes(searchHashtag)
          );
          if (hashtagMatch) return true;
        }

        return caption.includes(`#${searchHashtag}`);
      }

      return (
        caption.includes(query) ||
        userName.includes(query) ||
        screenName.includes(query)
      );
    });

    console.log(`✅ SearchPage: Found ${filteredPhotos.length} photo results`);
    return filteredPhotos;
  }, [debouncedSearchQuery, activeTab, photos, canUserSeePhoto, usersData]);

  const recentPhotos = useMemo(() => {
    return photos.filter(canUserSeePhoto).slice(0, 9);
  }, [photos, canUserSeePhoto]);

  const handleHashtagClick = useCallback((hashtag) => {
    const cleanHashtag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;
    setSearchQuery(cleanHashtag);
    setActiveTab("photos");
    console.log(`🏷️ SearchPage: Searching for hashtag ${cleanHashtag}`);
  }, []);

  const handleCaptionHashtagClick = useCallback(
    (hashtag) => {
      handleHashtagClick(`#${hashtag}`);
    },
    [handleHashtagClick]
  );

  const openPhotoModal = useCallback((photo) => {
    setSelectedPhoto(photo);
  }, []);

  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
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

  const getUserPhotoCount = useCallback(
    (userId) => {
      return photos.filter(
        (photo) => photo.uid === userId && canUserSeePhoto(photo)
      ).length;
    },
    [photos, canUserSeePhoto]
  );

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        backgroundColor: "var(--color-bg-primary)",
        minHeight: "100vh",
        paddingTop: "16px",
      }}
    >
      {/* Search Header */}
      <div
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          padding: "16px",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: "0",
          zIndex: 100,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: "relative",
            marginBottom: "16px",
          }}
        >
          <SearchIcon
            color="var(--color-text-muted)"
            size={20}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={
              activeTab === "photos"
                ? "Search photos, hashtags, or users..."
                : "Search users by name or @username..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 12px 12px 44px",
              backgroundColor: "var(--color-bg-tertiary)",
              border: "1px solid var(--color-border)",
              borderRadius: "24px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {/* Search Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={() => setActiveTab("photos")}
            style={{
              flex: 1,
              padding: "8px 16px",
              backgroundColor:
                activeTab === "photos" ? "var(--color-primary)" : "transparent",
              color: activeTab === "photos" ? "white" : "var(--color-text-muted)",
              border: activeTab === "photos" ? "none" : "1px solid var(--color-border)",
              borderRadius: "20px",
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
            <PhotoIcon 
              color={activeTab === "photos" ? "white" : "var(--color-text-muted)"} 
              size={16} 
            />
            Photos
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              flex: 1,
              padding: "8px 16px",
              backgroundColor:
                activeTab === "users" ? "var(--color-primary)" : "transparent",
              color: activeTab === "users" ? "white" : "var(--color-text-muted)",
              border: activeTab === "users" ? "none" : "1px solid var(--color-border)",
              borderRadius: "20px",
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
            <UsersIcon 
              color={activeTab === "users" ? "white" : "var(--color-text-muted)"} 
              size={16} 
            />
            Users
          </button>
        </div>
      </div>

      {/* Search Content */}
      <div style={{ padding: "16px", paddingBottom: "120px" }}>
        {!debouncedSearchQuery.trim() ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <TrendingIcon color="var(--color-primary)" size={20} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                }}
              >
                Trending Hashtags
              </h3>
            </div>

            {trendingHashtags.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "32px",
                }}
              >
                {trendingHashtags.map(({ hashtag, count }) => (
                  <button
                    key={hashtag}
                    onClick={() => handleHashtagClick(`#${hashtag}`)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "20px",
                      fontSize: "14px",
                      color: "var(--color-primary)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "var(--shadow-sm)",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "var(--color-bg-tertiary)";
                      e.target.style.borderColor = "var(--color-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "var(--color-bg-secondary)";
                      e.target.style.borderColor = "var(--color-border)";
                    }}
                  >
                    #{hashtag} ({count})
                  </button>
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "14px",
                  marginBottom: "32px",
                }}
              >
                No hashtags found yet. Try adding #hashtags to your photo
                captions!
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <GalleryIcon color="var(--color-primary)" size={20} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                }}
              >
                Recent Photos
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "2px",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {recentPhotos.map((photo) => (
                <PhotoGridItem
                  key={photo.id}
                  photo={photo}
                  onClick={openPhotoModal}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            {activeTab === "photos" ? (
              photoSearchResults.length > 0 ? (
                <div>
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    {photoSearchResults.length} photo
                    {photoSearchResults.length !== 1 ? "s" : ""} found
                    {debouncedSearchQuery.startsWith("#") &&
                      ` for ${debouncedSearchQuery}`}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "2px",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {photoSearchResults.map((photo) => (
                      <PhotoGridItem
                        key={photo.id}
                        photo={photo}
                        onClick={openPhotoModal}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <SearchNotFoundIcon color="var(--color-text-muted)" size={48} />
                  </div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--color-text-primary)" }}>
                    No photos found
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    {debouncedSearchQuery.startsWith("#")
                      ? `No photos found with hashtag ${debouncedSearchQuery}`
                      : "Try searching for different keywords or hashtags"}
                  </p>
                </div>
              )
            ) : userSearchLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--color-text-muted)",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid var(--color-border)",
                    borderTop: "3px solid var(--color-primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <p>Searching users...</p>
              </div>
            ) : userSearchResults.length > 0 ? (
              <div>
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "14px",
                    marginBottom: "16px",
                  }}
                >
                  {userSearchResults.length} user
                  {userSearchResults.length !== 1 ? "s" : ""} found
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {userSearchResults.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      getUserPhotoCount={getUserPhotoCount}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--color-text-muted)",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <UsersNotFoundIcon color="var(--color-text-muted)" size={48} />
                </div>
                <h3 style={{ margin: "0 0 8px 0", color: "var(--color-text-primary)" }}>
                  No users found
                </h3>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Try searching for names or @usernames
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
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
              backgroundColor: "var(--color-bg-secondary)",
              borderRadius: "16px",
              overflow: "hidden",
              maxWidth: "90vw",
              maxHeight: "calc(100vh - 130px)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
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
                      backgroundColor: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-bg-primary)",
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
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {getUserInfo(selectedPhoto).displayName}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    @{getUserInfo(selectedPhoto).screenName}
                  </div>
                </div>
              </div>
              <button
                onClick={closePhotoModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  padding: "4px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--color-bg-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <CloseIcon color="var(--color-text-muted)" size={20} />
              </button>
            </div>

            {/* Photo */}
            <div
              style={{
                flex: "0 0 auto",
                maxHeight: "50vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--color-bg-tertiary)",
              }}
            >
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || "Photo"}
                style={{
                  width: "100%",
                  maxHeight: "50vh",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Modal Content */}
            <div
              style={{
                padding: "20px",
                flex: "1 1 auto",
                overflow: "auto",
                maxHeight: "25vh",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "var(--color-text-primary)" }}>
                {selectedPhoto.caption
                  ? formatTextWithHashtags(
                      selectedPhoto.caption,
                      handleCaptionHashtagClick
                    )
                  : "No caption"}
              </h3>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                }}
              >
                By {getUserInfo(selectedPhoto).displayName} (@
                {getUserInfo(selectedPhoto).screenName})
              </p>

              {selectedPhoto.taggedUsers &&
                selectedPhoto.taggedUsers.length > 0 && (
                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "var(--color-primary)",
                    }}
                  >
                    with{" "}
                    {selectedPhoto.taggedUsers.map((taggedUser, index) => (
                      <span key={taggedUser.uid}>
                        @{taggedUser.displayScreenName}
                        {index < selectedPhoto.taggedUsers.length - 1
                          ? ", "
                          : ""}
                      </span>
                    ))}
                  </p>
                )}

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  marginBottom: "16px",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ClockIcon color="var(--color-text-muted)" size={14} />
                  <span>{formatTimeAgo(selectedPhoto.timestamp)}</span>
                </div>

                {selectedPhoto.placeName ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍</span>
                    <span>{selectedPhoto.placeName}</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍</span>
                    <LocationDisplay
                      latitude={selectedPhoto.latitude}
                      longitude={selectedPhoto.longitude}
                    />
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
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={closePhotoModal}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "var(--color-primary)",
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

export default SearchPage;
