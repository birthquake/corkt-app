// AnalyticsDashboard.js - Enhanced with engagement metrics for investors
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import analytics from './analyticsService';

// Minimalist SVG icon components (matching HomeFeed.js style)
const HeartIcon = ({ color = "#ef4444", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const ClockIcon = ({ color = "#6b7280", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const LocationIcon = ({ color = "#6b7280", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const UserIcon = ({ color = "#6b7280", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const AnalyticsDashboard = () => {
  // Existing analytics state
  const [analyticsData, setAnalyticsData] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedVenue, setSelectedVenue] = useState('all');

  // New engagement metrics state
  const [engagementMetrics, setEngagementMetrics] = useState({
    totalUsers: 0,
    totalPhotos: 0,
    todayPhotos: 0,
    weeklyPhotos: 0,
    monthlyPhotos: 0,
    totalLikes: 0,
    totalComments: 0,
    activeUsersToday: 0,
    activeUsersWeek: 0,
    avgPhotosPerUser: 0,
    topLocations: [],
    topCities: [],
    topStates: [],
    topCountries: [],
    recentActivity: [],
    growthRate: 0,
    engagementRate: 0,
    userSignupsToday: 0,
    userSignupsWeek: 0,
    userSignupsMonth: 0
  });

  const [usersData, setUsersData] = useState({});
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('engagement');
  const [locationFilter, setLocationFilter] = useState('city'); // 'city', 'state', 'country'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Helper function to get date ranges
  const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { today, weekAgo, monthAgo, now };
  };

  // Load existing behavioral analytics
  useEffect(() => {
    loadBehavioralAnalytics();
    loadUsersData();
    loadEngagementMetrics();
  }, []);

  // Re-process metrics when users data changes
  useEffect(() => {
    const reprocessMetrics = async () => {
      if (allPhotos.length > 0 && Object.keys(usersData).length > 0) {
        console.log('Re-processing metrics with user data...');
        await processMetrics(allPhotos);
      }
    };
    
    reprocessMetrics();
  }, [usersData, allPhotos]);

  const loadBehavioralAnalytics = () => {
    const events = analytics.events;
    setAnalyticsData(events);
    
    const totalEvents = events.length;
    const modeToggles = events.filter(e => e.event === 'mode_toggle');
    const localToggles = modeToggles.filter(e => e.to_mode === 'local');
    const globalToggles = modeToggles.filter(e => e.to_mode === 'global');
    const photoInteractions = events.filter(e => e.event === 'photo_interaction');
    const userSignups = events.filter(e => e.event === 'user_signup');
    const appOpens = events.filter(e => e.event === 'app_open');
    
    const venues = [...new Set(events
      .filter(e => e.venue_detected)
      .map(e => e.venue_detected)
    )];

    setSummary({
      totalEvents,
      modeToggles: modeToggles.length,
      localToggles: localToggles.length,
      globalToggles: globalToggles.length,
      localTogglePercentage: modeToggles.length > 0 ? 
        Math.round((localToggles.length / modeToggles.length) * 100) : 0,
      photoInteractions: photoInteractions.length,
      userSignups: userSignups.length,
      appOpens: appOpens.length,
      venues: venues
    });
  };

  const loadUsersData = () => {
    try {
      const usersRef = collection(db, "users");
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const usersMap = {};
        snapshot.docs.forEach(doc => {
          usersMap[doc.id] = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt || Date.now())
          };
        });
        setUsersData(usersMap);
        console.log('Users loaded:', Object.keys(usersMap).length);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching users data:", error);
    }
  };

  const loadEngagementMetrics = () => {
    try {
      const photosRef = collection(db, "photos");
      const photosQuery = query(photosRef, orderBy("timestamp", "desc"));
      
      const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
        const photos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(doc.data().timestamp || Date.now())
        }));

        setAllPhotos(photos);
        processMetrics(photos);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching photos:", error);
      setLoading(false);
    }
  };

  const processMetrics = async (photos) => {
    console.log('Processing metrics with:', photos.length, 'photos and', Object.keys(usersData).length, 'users');
    
    const { today, weekAgo, monthAgo } = getDateRanges();

    // Query likes collection to get real like counts
    const likesData = {};
    try {
      const likesRef = collection(db, "likes");
      const likesSnapshot = await getDocs(likesRef);
      
      likesSnapshot.docs.forEach(doc => {
        const like = doc.data();
        const photoId = like.photoId; // Adjust field name if different in your likes collection
        likesData[photoId] = (likesData[photoId] || 0) + 1;
      });
      
      console.log('Likes data loaded:', Object.keys(likesData).length, 'photos have likes');
    } catch (error) {
      console.error('Error fetching likes data:', error);
    }
    
    // Basic photo metrics
    const todayPhotos = photos.filter(photo => photo.timestamp >= today).length;
    const weeklyPhotos = photos.filter(photo => photo.timestamp >= weekAgo).length;
    const monthlyPhotos = photos.filter(photo => photo.timestamp >= monthAgo).length;

    // User metrics
    const totalUsers = Object.keys(usersData).length;
    const uniquePhotoUsers = [...new Set(photos.map(photo => photo.uid))].filter(Boolean);
    const activeUsersToday = [...new Set(
      photos.filter(photo => photo.timestamp >= today).map(photo => photo.uid)
    )].filter(Boolean).length;
    
    const activeUsersWeek = [...new Set(
      photos.filter(photo => photo.timestamp >= weekAgo).map(photo => photo.uid)
    )].filter(Boolean).length;

    // Engagement metrics using real likes data
    const totalLikes = Object.values(likesData).reduce((sum, count) => sum + count, 0);
    const totalComments = photos.reduce((sum, photo) => sum + (photo.commentCount || 0), 0);
    const engagementRate = photos.length > 0 ? ((totalLikes + totalComments) / photos.length).toFixed(2) : 0;

    // Growth rate
    const twoWeeksAgo = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekPhotos = photos.filter(photo => 
      photo.timestamp >= twoWeeksAgo && photo.timestamp < weekAgo
    ).length;
    const growthRate = previousWeekPhotos > 0 ? 
      Math.round(((weeklyPhotos - previousWeekPhotos) / previousWeekPhotos) * 100) : 0;

    // Top locations with real place names using reverse geocoding
    const locationData = {
      city: {},
      state: {},
      country: {},
      cityPhotos: {},
      statePhotos: {},
      countryPhotos: {}
    };
    const locationPromises = [];

    photos.forEach(photo => {
      if (photo.latitude && photo.longitude) {
        const lat = parseFloat(photo.latitude);
        const lng = parseFloat(photo.longitude);
        
        // Create a promise for reverse geocoding
        const geocodePromise = new Promise((resolve) => {
          if (window.google && window.google.maps && window.google.maps.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                // Extract city, state, country separately with better fallback logic
                const addressComponents = results[0].address_components;
                let city = '', state = '', country = '';
                let neighborhood = '', sublocality = '';
                
                for (let component of addressComponents) {
                  const types = component.types;
                  if (types.includes('locality')) {
                    city = component.long_name;
                  } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                    sublocality = component.long_name;
                  } else if (types.includes('neighborhood')) {
                    neighborhood = component.long_name;
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                  } else if (types.includes('country')) {
                    country = component.short_name;
                  }
                }
                
                // Better fallback logic for city names
                let finalCity = city;
                if (!finalCity && sublocality) {
                  finalCity = sublocality;
                } else if (!finalCity && neighborhood) {
                  finalCity = neighborhood;
                } else if (!finalCity) {
                  // Extract from formatted address as last resort
                  const addressParts = results[0].formatted_address.split(',');
                  if (addressParts.length > 0) {
                    finalCity = addressParts[0].trim();
                  }
                }
                
                // Build location names for different levels
                const cityName = finalCity && state ? `${finalCity}, ${state}` : 
                                finalCity && country ? `${finalCity}, ${country}` :
                                finalCity || `Near ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
                
                const stateName = state || country || `Near ${lat.toFixed(0)}, ${lng.toFixed(0)}`;
                const countryName = country || `Area ${lat.toFixed(0)}, ${lng.toFixed(0)}`;
                
                resolve({
                  city: cityName,
                  state: stateName,
                  country: countryName,
                  photo: photo
                });
              } else {
                // Improved fallback to coordinates if geocoding fails
                const coordName = `Near ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
                resolve({
                  city: coordName,
                  state: `Area ${lat.toFixed(0)}, ${lng.toFixed(0)}`,
                  country: `Region ${lat.toFixed(0)}, ${lng.toFixed(0)}`,
                  photo: photo
                });
              }
            });
          } else {
            // Google Maps not loaded, use coordinate fallback with better naming
            const coordName = `Near ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
            resolve({
              city: coordName,
              state: `Area ${lat.toFixed(0)}, ${lng.toFixed(0)}`,
              country: `Region ${lat.toFixed(0)}, ${lng.toFixed(0)}`,
              photo: photo
            });
          }
        });
        
        locationPromises.push(geocodePromise);
      }
    });

    // Wait for all geocoding to complete
    Promise.all(locationPromises).then((locationResults) => {
      // Process results and organize by city/state/country
      locationResults.forEach(result => {
        const { city, state, country, photo } = result;
        
        // Count and store photos for cities
        locationData.city[city] = (locationData.city[city] || 0) + 1;
        if (!locationData.cityPhotos[city]) locationData.cityPhotos[city] = [];
        locationData.cityPhotos[city].push(photo);
        
        // Count and store photos for states
        locationData.state[state] = (locationData.state[state] || 0) + 1;
        if (!locationData.statePhotos[state]) locationData.statePhotos[state] = [];
        locationData.statePhotos[state].push(photo);
        
        // Count and store photos for countries
        locationData.country[country] = (locationData.country[country] || 0) + 1;
        if (!locationData.countryPhotos[country]) locationData.countryPhotos[country] = [];
        locationData.countryPhotos[country].push(photo);
      });
      
      // Create sorted arrays for each level
      const topCities = Object.entries(locationData.city)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count, photos: locationData.cityPhotos[name] }));
      
      const topStates = Object.entries(locationData.state)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count, photos: locationData.statePhotos[name] }));
      
      const topCountries = Object.entries(locationData.country)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count, photos: locationData.countryPhotos[name] }));
      
      // Update the state with detailed location data
      setEngagementMetrics(prev => ({
        ...prev,
        topLocations: topCities, // Default to cities
        topCities: topCities,
        topStates: topStates,
        topCountries: topCountries
      }));
    }).catch((error) => {
      console.error('Geocoding error:', error);
      // Fallback to original coordinate-based naming if geocoding fails entirely
      photos.forEach(photo => {
        if (photo.latitude && photo.longitude) {
          const lat = parseFloat(photo.latitude).toFixed(1);
          const lng = parseFloat(photo.longitude).toFixed(1);
          const locationKey = `Near ${lat}, ${lng}`;
          locationData.city[locationKey] = (locationData.city[locationKey] || 0) + 1;
        }
      });
    });

    // Initial immediate update with coordinate-based names while geocoding happens
    const initialLocationCounts = {};
    photos.forEach(photo => {
      if (photo.latitude && photo.longitude) {
        const lat = parseFloat(photo.latitude).toFixed(1);
        const lng = parseFloat(photo.longitude).toFixed(1);
        const locationKey = `Near ${lat}, ${lng}`;
        initialLocationCounts[locationKey] = (initialLocationCounts[locationKey] || 0) + 1;
      }
    });

    const topLocations = Object.entries(initialLocationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, photos: [] }));

    // Recent activity with real names prioritized and real likes data
    const recentActivity = photos.slice(0, 15).map(photo => {
      const user = usersData[photo.uid];
      let displayName = 'Unknown User';
      
      console.log('Processing photo:', photo.id, 'UID:', photo.uid, 'User found:', !!user);
      if (user) {
        console.log('User data:', user);
      }
      
      if (user) {
        // Prioritize real name first, then other options
        if (user.realName) {
          displayName = user.realName;
        } else if (user.displayScreenName) {
          displayName = user.displayScreenName;
        } else if (user.screenName) {
          displayName = user.screenName;
        } else if (user.email) {
          displayName = user.email;
        } else {
          displayName = `User ${photo.uid?.slice(-6)}`;
        }
      } else if (photo.uid) {
        displayName = `User ${photo.uid.slice(-6)}`;
      }

      // Get real location name using reverse geocoding
      let locationName = 'Unknown location';
      if (photo.latitude && photo.longitude) {
        const lat = parseFloat(photo.latitude);
        const lng = parseFloat(photo.longitude);
        
        // Show coordinates as fallback (geocoding happens asynchronously)
        locationName = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      }

      return {
        id: photo.id,
        userEmail: displayName,
        location: locationName,
        timestamp: photo.timestamp,
        likes: likesData[photo.id] || 0, // Use real likes count from likes collection
        uid: photo.uid
      };
    });

    // User signups
    const allUsers = Object.values(usersData);
    const userSignupsToday = allUsers.filter(user => user.createdAt >= today).length;
    const userSignupsWeek = allUsers.filter(user => user.createdAt >= weekAgo).length;
    const userSignupsMonth = allUsers.filter(user => user.createdAt >= monthAgo).length;

    setEngagementMetrics({
      totalUsers,
      totalPhotos: photos.length,
      todayPhotos,
      weeklyPhotos,
      monthlyPhotos,
      totalLikes,
      totalComments,
      activeUsersToday,
      activeUsersWeek,
      avgPhotosPerUser: totalUsers ? (photos.length / totalUsers).toFixed(1) : 0,
      topLocations,
      topCities: [],
      topStates: [],
      topCountries: [],
      recentActivity,
      growthRate,
      engagementRate,
      userSignupsToday,
      userSignupsWeek,
      userSignupsMonth
    });

    setLoading(false);
  };

  // Photo Modal Component
  const PhotoModal = ({ isOpen, onClose, location, photos }) => {
    if (!isOpen || !location || !photos) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '8px'
            }}
          >
            ✕
          </button>

          {/* Modal header */}
          <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              color: '#1f2937', 
              fontSize: '24px', 
              fontWeight: '700' 
            }}>
              📍 {location.name}
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#6b7280', 
              fontSize: '16px' 
            }}>
              {photos.length} photo{photos.length !== 1 ? 's' : ''} from this location
            </p>
          </div>

          {/* Photo grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            maxHeight: '60vh',
            overflow: 'auto'
          }}>
            {photos.map((photo, index) => {
              const user = usersData[photo.uid];
              // Prioritize real name first in photo modal too
              const userName = user ? (
                user.realName || user.displayScreenName || user.screenName || user.email || `User ${photo.uid?.slice(-6)}`
              ) : `User ${photo.uid?.slice(-6) || 'Unknown'}`;

              return (
                <div key={photo.id} style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  {/* Photo placeholder (you can replace with actual image) */}
                  {photo.imageUrl ? (
                    <img 
                      src={photo.imageUrl} 
                      alt="Photo"
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '150px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      color: '#6b7280'
                    }}>
                      📸 Photo
                    </div>
                  )}

                  {/* Photo info */}
                  <div>
                    <p style={{ 
                      margin: '0 0 4px 0', 
                      fontWeight: '500', 
                      color: '#1f2937',
                      fontSize: '14px'
                    }}>
                      {userName}
                    </p>
                    <p style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '12px', 
                      color: '#6b7280' 
                    }}>
                      {formatDate(photo.timestamp)}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: '#fef2f2',
                        padding: '4px 8px',
                        borderRadius: '8px'
                      }}>
                        <HeartIcon color="#ef4444" size={12} />
                        <span style={{ color: '#ef4444', fontWeight: '500' }}>
                          {photo.likeCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedLocation(null);
  };

  const getCurrentLocationData = () => {
    switch (locationFilter) {
      case 'state':
        return engagementMetrics.topStates || [];
      case 'country':
        return engagementMetrics.topCountries || [];
      default:
        return engagementMetrics.topCities || engagementMetrics.topLocations || [];
    }
  };
  const PhotoHeatmap = ({ photos }) => {
    const mapRef = React.useRef(null);

    React.useEffect(() => {
      if (!window.google || !window.google.maps || !mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 40.7128, lng: -74.0060 },
        mapTypeId: 'roadmap'
      });

      const heatmapData = photos
        .filter(photo => photo.latitude && photo.longitude)
        .map(photo => new window.google.maps.LatLng(
          parseFloat(photo.latitude),
          parseFloat(photo.longitude)
        ));

      if (heatmapData.length > 0 && window.google.maps.visualization) {
        const heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map,
          radius: 20,
          opacity: 0.6
        });

        const bounds = new window.google.maps.LatLngBounds();
        heatmapData.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
      }
    }, [photos]);

    return (
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}
      />
    );
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getVenueAnalytics = (venueName) => {
    return analytics.getVenueAnalytics(venueName);
  };

  const exportData = () => {
    analytics.exportAnalytics();
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data?')) {
      analytics.clearAnalytics();
      loadBehavioralAnalytics();
    }
  };

  const filteredEvents = selectedVenue === 'all' 
    ? analyticsData 
    : analyticsData.filter(event => event.venue_detected === selectedVenue);

  if (loading) {
    return (
      <div style={{
        padding: "40px",
        textAlign: "center",
        color: "#6b7280",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #007bff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px"
        }} />
        <p>Loading analytics dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '32px', fontWeight: '700' }}>
            📊 Corkt Analytics
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
            Real-time engagement metrics and behavioral insights
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📥 Export Data
          </button>
          <button
            onClick={clearData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🗑️ Clear Data
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '4px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <button
          onClick={() => setSelectedTab('engagement')}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: selectedTab === 'engagement' ? '#007bff' : 'transparent',
            color: selectedTab === 'engagement' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          📈 Engagement
        </button>
        <button
          onClick={() => setSelectedTab('geographic')}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: selectedTab === 'geographic' ? '#007bff' : 'transparent',
            color: selectedTab === 'geographic' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          🗺️ Geographic
        </button>
        <button
          onClick={() => setSelectedTab('behavior')}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: selectedTab === 'behavior' ? '#007bff' : 'transparent',
            color: selectedTab === 'behavior' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          🎯 Behavioral
        </button>
      </div>

      {/* Engagement Metrics Tab */}
      {selectedTab === 'engagement' && (
        <div>
          {/* Key Engagement Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            {/* Total Users */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Users
                </h3>
                <span style={{ fontSize: '24px' }}>👥</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(engagementMetrics.totalUsers)}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#10b981',
                margin: '0'
              }}>
                ↗ {engagementMetrics.activeUsersWeek} active this week
              </p>
            </div>

            {/* Total Photos */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Photos
                </h3>
                <span style={{ fontSize: '24px' }}>📸</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(engagementMetrics.totalPhotos)}
              </p>
              <p style={{
                fontSize: '14px',
                color: engagementMetrics.growthRate >= 0 ? '#10b981' : '#ef4444',
                margin: '0'
              }}>
                {engagementMetrics.growthRate >= 0 ? '↗' : '↘'} {Math.abs(engagementMetrics.growthRate)}% this week
              </p>
            </div>

            {/* Weekly Activity */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Weekly Photos
                </h3>
                <span style={{ fontSize: '24px' }}>📊</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(engagementMetrics.weeklyPhotos)}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0'
              }}>
                {engagementMetrics.todayPhotos} uploaded today
              </p>
            </div>

            {/* Engagement Rate */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Engagement Rate
                </h3>
                <span style={{ fontSize: '24px' }}>💝</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {engagementMetrics.engagementRate}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0'
              }}>
                likes + comments per photo
              </p>
            </div>

            {/* New Users */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  New Users
                </h3>
                <span style={{ fontSize: '24px' }}>🚀</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {formatNumber(engagementMetrics.userSignupsWeek)}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#10b981',
                margin: '0'
              }}>
                {engagementMetrics.userSignupsToday} signed up today
              </p>
            </div>

            {/* Average Photos Per User */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Avg Photos/User
                </h3>
                <span style={{ fontSize: '24px' }}>📱</span>
              </div>
              <p style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {engagementMetrics.avgPhotosPerUser}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0'
              }}>
                photos per registered user
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
              🕒 Recent Activity
            </h2>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {engagementMetrics.recentActivity.map((activity, index) => (
                <div key={activity.id} style={{
                  padding: '16px',
                  borderBottom: index < engagementMetrics.recentActivity.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '6px' 
                    }}>
                      <UserIcon color="#1f2937" size={14} />
                      <p style={{ margin: 0, fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                        {activity.userEmail}
                      </p>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '4px' 
                    }}>
                      <LocationIcon color="#6b7280" size={12} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                        {activity.location}
                      </p>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px' 
                    }}>
                      <ClockIcon color="#9ca3af" size={12} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    backgroundColor: '#fef2f2',
                    padding: '6px 10px',
                    borderRadius: '12px'
                  }}>
                    <HeartIcon color="#ef4444" size={12} />
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                      {activity.likes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Geographic Analytics Tab */}
      {selectedTab === 'geographic' && (
        <div>
          {/* Geographic Overview Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                Photos with Location
              </h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#007bff' }}>
                {formatNumber(allPhotos.filter(photo => photo.latitude && photo.longitude).length)}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                of {formatNumber(allPhotos.length)} total photos
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                Unique Locations
              </h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                {formatNumber(engagementMetrics.topLocations.length)}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                distinct areas
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                Hottest Location
              </h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#dc3545' }}>
                {engagementMetrics.topLocations[0]?.count || 0}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                photos in top spot
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                Location Coverage
              </h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#6f42c1' }}>
                {allPhotos.length > 0 ? Math.round((allPhotos.filter(photo => photo.latitude && photo.longitude).length / allPhotos.length) * 100) : 0}%
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                photos geotagged
              </p>
            </div>
          </div>

          {/* Large Interactive Heatmap */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '8px', 
                fontSize: '28px', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                🗺️ Photo Heatmap
                <span style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {formatNumber(allPhotos.filter(photo => photo.latitude && photo.longitude).length)} locations plotted
                </span>
              </h2>
              <p style={{ 
                color: '#6b7280', 
                margin: 0, 
                fontSize: '16px',
                lineHeight: '1.6'
              }}>
                Interactive geographic distribution showing where users are most active. 
                Red areas indicate high photo density, while blue areas show lighter activity.
                <strong style={{ color: '#1f2937' }}> Zoom and pan to explore different regions.</strong>
              </p>
            </div>
            
            {window.google && window.google.maps ? (
              window.google.maps.visualization ? (
                <PhotoHeatmap photos={allPhotos} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '500px',
                  borderRadius: '12px',
                  border: '2px dashed #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  color: '#6b7280'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>
                      Loading Heatmap Visualization
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      Loading Google Maps visualization library...
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div style={{
                width: '100%',
                height: '500px',
                borderRadius: '12px',
                border: '2px dashed #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                color: '#6b7280'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>
                    Loading Interactive Heatmap
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Initializing Google Maps visualization...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Top Locations List */}
          {engagementMetrics.topLocations && engagementMetrics.topLocations.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '20px', 
                fontSize: '20px', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📍 Top Photo Locations
                <span style={{
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  By photo activity
                </span>
              </h2>

              {/* Filter Tabs */}
              <div style={{
                display: 'flex',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '4px'
              }}>
                <button
                  onClick={() => setLocationFilter('city')}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: locationFilter === 'city' ? '#007bff' : 'transparent',
                    color: locationFilter === 'city' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🏙️ Cities
                </button>
                <button
                  onClick={() => setLocationFilter('state')}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: locationFilter === 'state' ? '#007bff' : 'transparent',
                    color: locationFilter === 'state' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🗺️ States
                </button>
                <button
                  onClick={() => setLocationFilter('country')}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: locationFilter === 'country' ? '#007bff' : 'transparent',
                    color: locationFilter === 'country' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🌍 Countries
                </button>
              </div>

              {/* Location List */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {getCurrentLocationData().map((location, index) => (
                  <div key={location.name} style={{
                    padding: '20px',
                    backgroundColor: index === 0 ? '#fef2f2' : '#f8f9fa',
                    borderRadius: '12px',
                    border: index === 0 ? '2px solid #fecaca' : '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        left: '16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        🔥 HOTTEST
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: '0 0 6px 0', 
                        fontWeight: '600', 
                        color: '#1f2937',
                        fontSize: '16px'
                      }}>
                        {location.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        #{index + 1} most active {locationFilter === 'city' ? 'city' : locationFilter === 'state' ? 'state' : 'country'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleLocationClick(location)}
                        style={{
                          backgroundColor: index === 0 ? '#dc3545' : '#007bff',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {location.count} photos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Modal */}
          <PhotoModal 
            isOpen={showPhotoModal}
            onClose={closePhotoModal}
            location={selectedLocation}
            photos={selectedLocation?.photos || []}
          />
        </div>
      )}

      {/* Behavioral Analytics Tab */}
      {selectedTab === 'behavior' && (
        <div>
          {/* Summary Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>Total Events</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#007bff' }}>
                {formatNumber(summary.totalEvents)}
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>Mode Toggles</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#28a745' }}>
                {formatNumber(summary.modeToggles)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                {summary.localTogglePercentage}% to Local mode
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>Photo Interactions</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#ffc107' }}>
                {formatNumber(summary.photoInteractions)}
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '500' }}>User Signups</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#17a2b8' }}>
                {formatNumber(summary.userSignups)}
              </p>
            </div>
          </div>

          {/* Venue Analytics */}
          {summary.venues && summary.venues.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>📍 Venue Analytics</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px'
              }}>
                {summary.venues.map(venue => {
                  const venueData = getVenueAnalytics(venue);
                  return (
                    <div key={venue} style={{
                      backgroundColor: 'white',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                    }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>{venue}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#6b7280' }}>Mode Toggles:</span>
                          <strong style={{ color: '#1f2937' }}>{venueData.mode_toggles}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#6b7280' }}>Local Mode %:</span>
                          <strong style={{ color: '#1f2937' }}>{venueData.local_mode_percentage}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#6b7280' }}>Venue Sessions:</span>
                          <strong style={{ color: '#1f2937' }}>{venueData.venue_sessions}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#6b7280' }}>User Acquisitions:</span>
                          <strong style={{ color: '#1f2937' }}>{venueData.user_acquisitions}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#6b7280' }}>Avg Session (sec):</span>
                          <strong style={{ color: '#1f2937' }}>{venueData.average_session_duration}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Event Filter */}
          <div style={{ 
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <label style={{ fontWeight: '500', color: '#1f2937' }}>Filter by Venue:</label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            >
              <option value="all">All Venues</option>
              {summary.venues && summary.venues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Showing {formatNumber(filteredEvents.length)} events
            </span>
          </div>

          {/* Recent Events */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ padding: '24px 24px 0 24px' }}>
              <h2 style={{ color: '#1f2937', margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>📋 Recent Events</h2>
            </div>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {filteredEvents.slice(-50).reverse().map((event, index) => (
                <div key={index} style={{
                  padding: '16px 24px',
                  borderBottom: index < filteredEvents.slice(-50).length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '14px' }}>{event.event}</strong>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {event.venue_detected && <span>📍 {event.venue_detected}</span>}
                    {event.from_mode && event.to_mode && (
                      <span>🔄 {event.from_mode} → {event.to_mode}</span>
                    )}
                    {event.action && <span>📸 {event.action}</span>}
                    {event.session_id && <span>Session: {event.session_id.slice(-6)}</span>}
                  </div>
                </div>
              ))}
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

export default AnalyticsDashboard;
