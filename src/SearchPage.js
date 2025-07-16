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

// Minimal SVG icon components - matching MobileBottomNavigation style
const SearchIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

const PhotoIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const UsersIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TrendingIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const CloseIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SearchNotFoundIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

const UsersNotFoundIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>
);

const GalleryIcon = ({ color = "#6c757d", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

// 🚀 NEW: Memoized User Card component for better performance
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

  // Don't show follow button for current user
  const showFollowButton = currentUser?.uid !== user.id;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #e9ecef",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
    >
      {/* Profile Picture */}
      {user.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.realName}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #007bff",
          }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#007bff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
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
            color: "#343a40",
            fontSize: "16px",
          }}
        >
          {user.realName || "Unknown User"}
        </p>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: "14px",
            color: "#007bff",
          }}
        >
          @{user.displayScreenName || user.screenName || "unknown"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "#6c757d",
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
            backgroundColor: isFollowing ? "#6c757d" : "#007bff",
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
                ? "#5a6268"
                : "#0056b3";
            }
          }}
          onMouseLeave={(e) => {
            if (!followLoading) {
              e.target.style.backgroundColor = isFollowing
                ? "#6c757d"
                : "#007bff";
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

// 🚀 NEW: Memoized Photo Grid Item for better performance
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
        backgroundColor: "#f8f9fa",
      }}
    >
      {!imageLoaded && !imageError && (
        // Loading placeholder
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid #e9ecef",
              borderTop: "2px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      )}

      {imageError && (
        // Error state
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
            color: "#6c757d",
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

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ NEW: Handle hashtag search from URL parameters or MobilePhotoCard clicks
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hashtagParam = urlParams.get("hashtag");

    if (hashtagParam) {
      setSearchQuery(`#${hashtagParam}`);
      setActiveTab("photos");
      console.log(`🔍 SearchPage: Auto-searching for hashtag #${hashtagParam}`);
    }
  }, [location.search]);

  // ✅ NEW: Load trending hashtags using the service
  useEffect(() => {
    const loadTrendingHashtags = async () => {
      try {
        const trending = await getTrendingHashtags(7, 15); // Last 7 days, max 15 hashtags
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
  }, [photos]); // Reload when photos change

  // 🚀 NEW: Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get following list for privacy checking
  const { followingList } = useFollowing(currentUser?.uid);

  // 🚀 NEW: Optimized user search with caching
  const { searchResults: userSearchResults, loading: userSearchLoading } =
    useOptimizedUserSearch(activeTab === "users" ? debouncedSearchQuery : "");

  // 🚀 NEW: Get user data for photos with optimized fetching
  const uniqueUserIds = useMemo(() => {
    return [...new Set(photos.map((photo) => photo.uid).filter(Boolean))];
  }, [photos.map((p) => p.uid).join(",")]);

  const { usersData } = useOptimizedUsersData(uniqueUserIds);

  // 🚀 NEW: Memoized privacy checking function
  const canUserSeePhoto = useCallback(
    (photo) => {
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
          // Check if current user is in the taggedUsers array
          return (
            photo.taggedUsers?.some(
              (taggedUser) => taggedUser.uid === currentUser?.uid
            ) || false
          );

        default:
          // For photos without privacy setting (legacy), treat as public
          return true;
      }
    },
    [currentUser?.uid, followingList]
  );

  // ✅ ENHANCED: Memoized photo search results with improved hashtag search
  const photoSearchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim() || activeTab !== "photos") {
      return [];
    }

    console.log(
      `🔍 SearchPage: Searching photos for "${debouncedSearchQuery}"`
    );

    const query = debouncedSearchQuery.toLowerCase().trim();

    // First filter by privacy, then by search criteria
    const privacyFilteredPhotos = photos.filter(canUserSeePhoto);

    const filteredPhotos = privacyFilteredPhotos.filter((photo) => {
      const caption = (photo.caption || "").toLowerCase();
      const userData = usersData[photo.uid];
      const userName = (userData?.realName || "").toLowerCase();
      const screenName = (userData?.displayScreenName || "").toLowerCase();

      // ✅ ENHANCED: Improved hashtag search using hashtags array
      if (query.startsWith("#")) {
        const searchHashtag = query.substring(1); // Remove # symbol

        // First check the hashtags array (new method)
        if (photo.hashtags && Array.isArray(photo.hashtags)) {
          const hashtagMatch = photo.hashtags.some((hashtag) =>
            hashtag.toLowerCase().includes(searchHashtag)
          );
          if (hashtagMatch) return true;
        }

        // Fallback: check caption for hashtags (for older photos)
        return caption.includes(`#${searchHashtag}`);
      }

      // Regular search in caption, username, or screen name
      return (
        caption.includes(query) ||
        userName.includes(query) ||
        screenName.includes(query)
      );
    });

    console.log(`✅ SearchPage: Found ${filteredPhotos.length} photo results`);
    return filteredPhotos;
  }, [debouncedSearchQuery, activeTab, photos, canUserSeePhoto, usersData]);

  // 🚀 NEW: Memoized recent photos
  const recentPhotos = useMemo(() => {
    return photos.filter(canUserSeePhoto).slice(0, 9);
  }, [photos, canUserSeePhoto]);

  // ✅ NEW: Handle hashtag clicks from trending hashtags
  const handleHashtagClick = useCallback((hashtag) => {
    const cleanHashtag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;
    setSearchQuery(cleanHashtag);
    setActiveTab("photos");
    console.log(`🏷️ SearchPage: Searching for hashtag ${cleanHashtag}`);
  }, []);

  // ✅ NEW: Handle hashtag clicks in photo captions
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

  // Helper function to get user info for a photo
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

  // Helper function to get user photo count (only photos current user can see)
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
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        paddingTop: "16px",
      }}
    >
      {/* Search Header */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "16px",
          borderBottom: "1px solid #e9ecef",
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
            color="#6c757d"
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
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: "24px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box",
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
                activeTab === "photos" ? "#007bff" : "transparent",
              color: activeTab === "photos" ? "white" : "#6c757d",
              border: activeTab === "photos" ? "none" : "1px solid #e9ecef",
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
              color={activeTab === "photos" ? "white" : "#6c757d"} 
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
                activeTab === "users" ? "#007bff" : "transparent",
              color: activeTab === "users" ? "white" : "#6c757d",
              border: activeTab === "users" ? "none" : "1px solid #e9ecef",
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
              color={activeTab === "users" ? "white" : "#6c757d"} 
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
              <TrendingIcon color="#007bff" size={20} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#343a40",
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
                      backgroundColor: "#ffffff",
                      border: "1px solid #e9ecef",
                      borderRadius: "20px",
                      fontSize: "14px",
                      color: "#007bff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.borderColor = "#007bff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#ffffff";
                      e.target.style.borderColor = "#e9ecef";
                    }}
                  >
                    #{hashtag} ({count})
                  </button>
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: "#6c757d",
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
              <GalleryIcon color="#007bff" size={20} />
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#343a40",
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
                      color: "#6c757d",
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
                    color: "#6c757d",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <SearchNotFoundIcon color="#6c757d" size={48} />
                  </div>
                  <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
                    No photos found
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    {debouncedSearchQuery.startsWith("#")
                      ? `No photos found with hashtag ${debouncedSearchQuery}`
                      : "Try searching for different keywords or hashtags"}
                  </p>
                </div>
              )
            ) : // Users tab
            userSearchLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#6c757d",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid #e9ecef",
                    borderTop: "3px solid #007bff",
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
                    color: "#6c757d",
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
                  color: "#6c757d",
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <UsersNotFoundIcon color="#6c757d" size={48} />
                </div>
                <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
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

      {/* ✅ ENHANCED: Photo Modal with clickable hashtags in captions */}
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
              backgroundColor: "#ffffff",
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
                borderBottom: "1px solid #f0f0f0",
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
                  cursor: "pointer",
                  color: "#6c757d",
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
                  e.target.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <CloseIcon color="#6c757d" size={20} />
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
                backgroundColor: "#f8f9fa",
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
              <h3 style={{ margin: "0 0 8px 0", color: "#343a40" }}>
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
                  color: "#6c757d",
                }}
              >
                By {getUserInfo(selectedPhoto).displayName} (@
                {getUserInfo(selectedPhoto).screenName})
              </p>

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
                      <span key={taggedUser.uid}>
                        @{taggedUser.displayScreenName}
                        {index < selectedPhoto.taggedUsers.length - 1
                          ? ", "
                          : ""}
                      </span>
                    ))}
                  </p>
                )}

              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "12px",
                  color: "#6c757d",
                }}
              >
                📅 {formatTimeAgo(selectedPhoto.timestamp)}
                {selectedPhoto.latitude && selectedPhoto.longitude && (
                  <>
                    {" "}
                    • 📍 {selectedPhoto.latitude.toFixed(4)},{" "}
                    {selectedPhoto.longitude.toFixed(4)}
                  </>
                )}
              </p>
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

      {/* Add CSS animations */}
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
