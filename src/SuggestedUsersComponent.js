// SuggestedUsersComponent.js - Smart follow suggestions interface
import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import followSuggestionsService from './FollowSuggestionsService';
import { getDisplayName, getScreenName } from './useUserData';

// Icons for different suggestion types
const LocationIcon = ({ color = "#2ed573", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const UsersIcon = ({ color = "#5352ed", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ActivityIcon = ({ color = "#ff6b35", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);

const StarIcon = ({ color = "#ffc107", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);

const RefreshIcon = ({ color = "#6b7280", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="23,4 23,10 17,10"/>
    <polyline points="1,20 1,14 7,14"/>
    <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4a9,9,0,0,1-14.85,4.36L23,14"/>
  </svg>
);

const XIcon = ({ color = "#6b7280", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

  // Add this function before the SuggestedUsersComponent definition
const checkIfFollowing = async (followerId, followingId) => {
  try {
    const followingRef = collection(db, "following");
    const followingQuery = query(
      followingRef, 
      where("followerId", "==", followerId),
      where("followingId", "==", followingId)
    );
    const snapshot = await getDocs(followingQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking follow status:', error);
  } // ← this closes the catch block
}; // ← this closes the entire function

const SuggestedUsersComponent = ({ 
  currentUser, 
  currentLocation, 
  onUserClick, 
  compact = false,
  maxSuggestions = 5 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followingStates, setFollowingStates] = useState({});
  const [dismissedUsers, setDismissedUsers] = useState(new Set());
  const [userProfiles, setUserProfiles] = useState({});

  // Load suggestions on mount and when dependencies change
  useEffect(() => {
    if (currentUser?.uid) {
      loadSuggestions();
    }
  }, [currentUser?.uid, currentLocation]);

  // Load follow suggestions
  const loadSuggestions = useCallback(async () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🤝 Loading follow suggestions...');
      
      const suggestions = await followSuggestionsService.getFollowSuggestions(
        currentUser.uid,
        {
          limit: maxSuggestions + 5, // Get extra in case some are dismissed
          userLocation: currentLocation,
          includeLocationBased: true,
          includeMutualFriends: true,
          includeActivityBased: true
        }
      );

      // Filter out dismissed users
      const filteredSuggestions = suggestions.filter(
        suggestion => !dismissedUsers.has(suggestion.userId)
      ).slice(0, maxSuggestions);

      setSuggestions(filteredSuggestions);

      // Load user profiles for suggestions
      if (filteredSuggestions.length > 0) {
        await loadUserProfiles(filteredSuggestions.map(s => s.userId));
      }

      // Track that suggestions were viewed
      filteredSuggestions.forEach(suggestion => {
        followSuggestionsService.trackSuggestionEvent(
          currentUser.uid,
          suggestion.userId,
          'viewed',
          suggestion.type
        );
      });

    } catch (err) {
      console.error('Error loading follow suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, currentLocation, maxSuggestions, dismissedUsers]);

  // Load user profiles for suggestions
  const loadUserProfiles = async (userIds) => {
    try {
      const profiles = {};
      
      // Load profiles in batches
      const batches = chunkArray(userIds, 10);
      
      for (const batch of batches) {
        const profilePromises = batch.map(async (userId) => {
          try {
            const userDoc = await getDocs(
              query(collection(db, "users"), where("__name__", "==", userId))
            );
            
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              profiles[userId] = {
                id: userId,
                ...userData
              };
            }
          } catch (error) {
            console.error(`Error loading profile for user ${userId}:`, error);
          }
        });
        
        await Promise.all(profilePromises);
      }
      
      setUserProfiles(prev => ({ ...prev, ...profiles }));
      
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  };

  // Handle follow action
  const handleFollow = async (suggestedUserId, suggestionType) => {
    if (!currentUser?.uid || followingStates[suggestedUserId]) return;

    setFollowingStates(prev => ({ ...prev, [suggestedUserId]: 'loading' }));

    try {
      // Create follow relationship
      const followDoc = doc(collection(db, "following"));
      await setDoc(followDoc, {
        followerId: currentUser.uid,
        followingId: suggestedUserId,
        timestamp: new Date()
      });

      setFollowingStates(prev => ({ ...prev, [suggestedUserId]: 'following' }));

      // Track follow action
      followSuggestionsService.trackSuggestionEvent(
        currentUser.uid,
        suggestedUserId,
        'followed',
        suggestionType
      );

      // Remove from suggestions after successful follow
      setTimeout(() => {
        setSuggestions(prev => prev.filter(s => s.userId !== suggestedUserId));
      }, 1000);

    } catch (error) {
      console.error('Error following user:', error);
      setFollowingStates(prev => ({ ...prev, [suggestedUserId]: 'error' }));
      
      // Reset state after error
      setTimeout(() => {
        setFollowingStates(prev => {
          const newState = { ...prev };
          delete newState[suggestedUserId];
          return newState;
        });
      }, 2000);
    }
  };

  // Handle dismiss suggestion
  const handleDismiss = (suggestedUserId, suggestionType) => {
    setDismissedUsers(prev => new Set([...prev, suggestedUserId]));
    setSuggestions(prev => prev.filter(s => s.userId !== suggestedUserId));

    // Track dismiss action
    followSuggestionsService.trackSuggestionEvent(
      currentUser.uid,
      suggestedUserId,
      'dismissed',
      suggestionType
    );
  };

  // Get suggestion icon and color based on type
  const getSuggestionTypeInfo = (suggestion) => {
    const type = suggestion.types ? suggestion.types[0] : suggestion.type;
    
    switch (type) {
      case 'location':
        return { 
          icon: LocationIcon, 
          color: '#2ed573', 
          label: 'Nearby',
          description: 'Posts near you'
        };
      case 'mutual':
        return { 
          icon: UsersIcon, 
          color: '#5352ed', 
          label: 'Mutual',
          description: 'Mutual connections'
        };
      case 'activity':
        return { 
          icon: ActivityIcon, 
          color: '#ff6b35', 
          label: 'Active',
          description: 'Interacts with your content'
        };
      case 'popular':
        return { 
          icon: StarIcon, 
          color: '#ffc107', 
          label: 'Popular',
          description: 'Trending creator'
        };
      default:
        return { 
          icon: UsersIcon, 
          color: '#6b7280', 
          label: 'Suggested',
          description: 'Recommended for you'
        };
    }
  };

  // Get user display info
  const getUserDisplayInfo = (userId) => {
    const profile = userProfiles[userId];
    if (!profile) return { displayName: 'Loading...', screenName: 'loading', initials: '?' };

    return {
      displayName: getDisplayName(profile, currentUser?.uid),
      screenName: getScreenName(profile),
      profilePicture: profile.profilePicture || '',
      initials: profile.realName?.charAt(0)?.toUpperCase() || 
                userId?.charAt(0)?.toUpperCase() || '?'
    };
  };

  // Utility function to chunk arrays
  const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Refresh suggestions
  const refreshSuggestions = () => {
    followSuggestionsService.clearCache();
    setDismissedUsers(new Set()); // Clear dismissed users
    loadSuggestions();
  };

  if (!currentUser?.uid) return null;

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: compact ? '12px' : '16px',
        margin: compact ? '8px 0' : '16px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f3f4f6',
            borderTop: '2px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            Finding people you might know...
          </span>
        </div>
      </div>
    );
  }

  if (error || suggestions.length === 0) {
    return null; // Don't show component if no suggestions
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: compact ? '12px' : '16px',
      margin: compact ? '8px 0' : '16px 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #f0f0f0'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: compact ? '16px' : '18px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <UsersIcon color="#007bff" size={20} />
          Suggested for you
        </h3>
        
        <button
          onClick={refreshSuggestions}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            color: '#6b7280',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          title="Refresh suggestions"
        >
          <RefreshIcon color="#6b7280" size={16} />
        </button>
      </div>

      {/* Suggestions List */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: compact ? '8px' : '12px' 
      }}>
        {suggestions.map((suggestion) => {
          const userInfo = getUserDisplayInfo(suggestion.userId);
          const typeInfo = getSuggestionTypeInfo(suggestion);
          const followState = followingStates[suggestion.userId];
          const IconComponent = typeInfo.icon;

          return (
            <div
              key={suggestion.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: compact ? '8px' : '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* User Avatar */}
              <div
                onClick={() => onUserClick?.(suggestion.userId)}
                style={{ cursor: 'pointer' }}
              >
                {userInfo.profilePicture ? (
                  <img
                    src={userInfo.profilePicture}
                    alt={userInfo.displayName}
                    style={{
                      width: compact ? '32px' : '40px',
                      height: compact ? '32px' : '40px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: compact ? '32px' : '40px',
                      height: compact ? '32px' : '40px',
                      borderRadius: '50%',
                      backgroundColor: '#007bff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: compact ? '14px' : '16px',
                      fontWeight: '600'
                    }}
                  >
                    {userInfo.initials}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  onClick={() => onUserClick?.(suggestion.userId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: compact ? '14px' : '15px',
                    color: '#1f2937',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {userInfo.displayName}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    @{userInfo.screenName}
                  </div>
                </div>

                {/* Suggestion Reason */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: typeInfo.color
                }}>
                  <IconComponent color={typeInfo.color} size={12} />
                  <span>{suggestion.reasons[0]}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Dismiss Button */}
                <button
                  onClick={() => handleDismiss(suggestion.userId, suggestion.type)}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#fef2f2';
                    e.target.style.borderColor = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                  title="Dismiss suggestion"
                >
                  <XIcon color="#ef4444" size={14} />
                </button>

                {/* Follow Button */}
                <button
                  onClick={() => handleFollow(suggestion.userId, suggestion.type)}
                  disabled={followState === 'loading' || followState === 'following'}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: followState === 'following' ? '#10b981' : 
                                   followState === 'error' ? '#ef4444' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: followState === 'loading' || followState === 'following' ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '60px',
                    opacity: followState === 'loading' ? 0.7 : 1
                  }}
                >
                  {followState === 'loading' && '...'}
                  {followState === 'following' && '✓ Following'}
                  {followState === 'error' && 'Error'}
                  {!followState && 'Follow'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

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

export default SuggestedUsersComponent;
