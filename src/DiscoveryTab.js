// DiscoveryTab.js - Discovery and trending photos interface
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedUsersData } from "./performanceHooks";
import { getDisplayName, getScreenName } from "./useUserData";
import { useFollowing } from "./useFollows";
import MobilePhotoCard from "./MobilePhotoCard";
import discoveryService from './discoveryService';

// Discovery-specific icons
const TrendingIcon = ({ color = "#ff6b35", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const FireIcon = ({ color = "#ff4757", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const NearbyIcon = ({ color = "#2ed573", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const ActivityIcon = ({ color = "#5352ed", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ClockIcon = ({ color = "#6c757d", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const DiscoveryTab = ({ currentUser, currentLocation, onPhotoClick, onUserClick }) => {
  const [activeDiscoveryFilter, setActiveDiscoveryFilter] = useState('trending');
  const [timeframe, setTimeframe] = useState('24h');
  const [discoveryPhotos, setDiscoveryPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get following list for activity feed
  const { followingList, loading: followingLoading } = useFollowing(currentUser?.uid);

  // Get user data for photos
  const uniqueUserIds = useMemo(() => {
    return [...new Set(discoveryPhotos.map(photo => photo.uid).filter(Boolean))];
  }, [discoveryPhotos.map(p => p.uid).join(",")]);

  const { usersData, loading: usersLoading } = useOptimizedUsersData(uniqueUserIds);

  // Discovery filter options
  const discoveryFilters = [
    {
      id: 'trending',
      icon: TrendingIcon,
      label: 'Trending',
      tooltip: 'Photos gaining momentum',
      color: '#ff6b35'
    },
    {
      id: 'nearby',
      icon: NearbyIcon,
      label: 'Nearby',
      tooltip: 'Popular photos near you',
      color: '#2ed573',
      requiresLocation: true
    },
    {
      id: 'activity',
      icon: ActivityIcon,
      label: 'Following',
      tooltip: 'Recent activity from people you follow',
      color: '#5352ed',
      requiresFollowing: true
    }
  ];

  // Timeframe options
  const timeframeOptions = [
    { value: '1h', label: '1H', tooltip: 'Last hour' },
    { value: '24h', label: '24H', tooltip: 'Last 24 hours' },
    { value: '7d', label: '7D', tooltip: 'Last week' },
    { value: '30d', label: '30D', tooltip: 'Last month' }
  ];

  // Load discovery content
  const loadDiscoveryPhotos = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);

    try {
      let photos = [];

      switch (activeDiscoveryFilter) {
        case 'trending':
          photos = await discoveryService.getTrendingPhotos({
            limit: 20,
            timeframe: timeframe,
            location: currentLocation
          });
          break;

        case 'nearby':
          if (!currentLocation) {
            setError('Location access required for nearby photos');
            setLoading(false);
            return;
          }
          photos = await discoveryService.getPopularNearby(currentLocation, {
            radius: 5000, // 5km
            limit: 15,
            timeframe: timeframe
          });
          break;

        case 'activity':
          if (followingLoading) {
            // Wait for following list to load
            setLoading(false);
            return;
          }
          if (!followingList || followingList.length === 0) {
            setError('Follow some users to see their activity');
            setLoading(false);
            return;
          }
          photos = await discoveryService.getFollowingActivity(
            currentUser.uid,
            followingList,
            { limit: 15, timeframe: timeframe }
          );
          break;

        default:
          photos = [];
      }

      setDiscoveryPhotos(photos);
      console.log(`📊 Loaded ${photos.length} ${activeDiscoveryFilter} photos`);

    } catch (err) {
      console.error('Error loading discovery photos:', err);
      setError('Failed to load discovery content');
    } finally {
      setLoading(false);
    }
  }, [activeDiscoveryFilter, timeframe, currentLocation, currentUser, followingList, followingLoading]);

  // Load photos when filter or timeframe changes
  useEffect(() => {
    loadDiscoveryPhotos();
  }, [loadDiscoveryPhotos]);

  // Get user info for a photo
  const getUserInfo = useCallback((photo) => {
    const userData = usersData[photo.uid];
    return {
      displayName: getDisplayName(userData, currentUser?.uid),
      screenName: getScreenName(userData),
      profilePicture: userData?.profilePicture || "",
      initials: userData?.realName?.charAt(0)?.toUpperCase() || 
                photo.uid?.charAt(0)?.toUpperCase() || "?",
    };
  }, [usersData, currentUser?.uid]);

  // Format trending score for display
  const formatTrendingScore = (trending) => {
    if (!trending) return null;
    
    const score = trending.score;
    if (score > 100) return `${Math.round(score)}🔥`;
    if (score > 10) return `${Math.round(score)}📈`;
    if (score > 1) return `${score.toFixed(1)}⭐`;
    return `${score.toFixed(2)}✨`;
  };

  // Get available filters (based on location and following status)
  const availableFilters = discoveryFilters.filter(filter => {
    if (filter.requiresLocation && !currentLocation) return false;
    if (filter.requiresFollowing && (!followingList || followingList.length === 0)) return false;
    return true;
  });

  // Auto-select first available filter if current one becomes unavailable
  useEffect(() => {
    if (!availableFilters.some(f => f.id === activeDiscoveryFilter)) {
      if (availableFilters.length > 0) {
        setActiveDiscoveryFilter(availableFilters[0].id);
      }
    }
  }, [availableFilters, activeDiscoveryFilter]);

  return (
    <div style={{ padding: '0' }}>
      {/* Discovery Filter Tabs */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 16px 12px 16px',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: '0',
        zIndex: 50
      }}>
        {/* Filter Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {availableFilters.map(filter => {
            const IconComponent = filter.icon;
            const isActive = activeDiscoveryFilter === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => setActiveDiscoveryFilter(filter.id)}
                title={filter.tooltip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: isActive ? filter.color + '15' : 'transparent',
                  border: `2px solid ${isActive ? filter.color : '#e5e7eb'}`,
                  borderRadius: '20px',
                  color: isActive ? filter.color : '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '80px',
                  justifyContent: 'center'
                }}
              >
                <IconComponent color={isActive ? filter.color : '#6b7280'} size={16} />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          backgroundColor: '#f8f9fa',
          padding: '4px',
          borderRadius: '12px',
          maxWidth: '200px',
          margin: '0 auto'
        }}>
          {timeframeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              title={option.tooltip}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: timeframe === option.value ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                color: timeframe === option.value ? '#1f2937' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: timeframe === option.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p>Discovering amazing photos...</p>
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#ef4444',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            border: '1px solid #fecaca'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Discovery Error</p>
            <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
          </div>
        ) : discoveryPhotos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {activeDiscoveryFilter === 'trending' && '📈'}
              {activeDiscoveryFilter === 'nearby' && '📍'}
              {activeDiscoveryFilter === 'activity' && '👥'}
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
              {activeDiscoveryFilter === 'trending' && 'No trending photos'}
              {activeDiscoveryFilter === 'nearby' && 'No popular photos nearby'}
              {activeDiscoveryFilter === 'activity' && 'No recent activity'}
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {activeDiscoveryFilter === 'trending' && `No photos are trending in the ${timeframe} timeframe`}
              {activeDiscoveryFilter === 'nearby' && 'No popular photos found within 5km'}
              {activeDiscoveryFilter === 'activity' && 'People you follow haven\'t posted recently'}
            </p>
          </div>
        ) : (
          <div>
            {/* Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              padding: '0 4px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {activeDiscoveryFilter === 'trending' && (
                  <>
                    <FireIcon color="#ff4757" size={20} />
                    Trending Now
                  </>
                )}
                {activeDiscoveryFilter === 'nearby' && (
                  <>
                    <NearbyIcon color="#2ed573" size={20} />
                    Popular Nearby
                  </>
                )}
                {activeDiscoveryFilter === 'activity' && (
                  <>
                    <ActivityIcon color="#5352ed" size={20} />
                    Following Activity
                  </>
                )}
              </h3>
              <span style={{
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '12px'
              }}>
                {discoveryPhotos.length} photos
              </span>
            </div>

            {/* Photos Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {discoveryPhotos.map((photo, index) => {
                const userInfo = getUserInfo(photo);
                
                return (
                  <div key={photo.id} style={{ position: 'relative' }}>
                    {/* Trending Badge */}
                    {activeDiscoveryFilter === 'trending' && photo.trending && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(255, 71, 87, 0.9)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        zIndex: 10,
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <TrendingIcon color="white" size={12} />
                        {formatTrendingScore(photo.trending)}
                      </div>
                    )}

                    {/* Ranking Badge for top photos */}
                    {index < 3 && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32',
                        color: index === 0 ? '#b8860b' : 'white',
                        padding: '4px 8px',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: '700',
                        zIndex: 10,
                        minWidth: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        #{index + 1}
                      </div>
                    )}

                    <MobilePhotoCard
                      photo={photo}
                      userInfo={userInfo}
                      currentUser={currentUser}
                      onPhotoClick={onPhotoClick}
                      onUserClick={onUserClick}
                      showUserInfo={true}
                      enhancedInfo={
                        // Show additional trending info
                        activeDiscoveryFilter === 'trending' && photo.trending ? (
                          <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>🔥 {photo.recentActivity} recent interactions</span>
                            <span>⚡ {photo.trending.velocity.toFixed(1)}/hr</span>
                          </div>
                        ) : null
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
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

export default DiscoveryTab;
