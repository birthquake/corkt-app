// AnalyticsDashboard.js - Enhanced with engagement metrics for investors
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import analytics from './analyticsService';

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
    recentActivity: [],
    growthRate: 0,
    engagementRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('engagement'); // 'engagement' or 'behavior'

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
  }, []);

  // Load engagement metrics from Firestore
  useEffect(() => {
    loadEngagementMetrics();
  }, []);

  const loadBehavioralAnalytics = () => {
    const events = analytics.events;
    setAnalyticsData(events);
    
    // Calculate summary statistics (your existing logic)
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

  const loadEngagementMetrics = () => {
    try {
      const { today, weekAgo, monthAgo } = getDateRanges();

      // Get all photos with real-time updates
      const photosRef = collection(db, "photos");
      const photosQuery = query(photosRef, orderBy("timestamp", "desc"));
      
      const unsubscribe = onSnapshot(photosQuery, async (snapshot) => {
        const photos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(doc.data().timestamp || Date.now())
        }));

        // Calculate photo metrics
        const todayPhotos = photos.filter(photo => 
          photo.timestamp >= today
        ).length;

        const weeklyPhotos = photos.filter(photo => 
          photo.timestamp >= weekAgo
        ).length;

        const monthlyPhotos = photos.filter(photo => 
          photo.timestamp >= monthAgo
        ).length;

        // Calculate engagement metrics
        const totalLikes = photos.reduce((sum, photo) => 
          sum + (photo.likeCount || photo.likes?.length || 0), 0
        );

        const totalComments = photos.reduce((sum, photo) => 
          sum + (photo.commentCount || photo.comments?.length || 0), 0
        );

        // Get unique users from photos
        const uniqueUsers = [...new Set(photos.map(photo => photo.userId || photo.userEmail))].filter(Boolean);
        const totalUsers = uniqueUsers.length;

        // Active users (posted in time period)
        const activeUsersToday = [...new Set(
          photos.filter(photo => photo.timestamp >= today)
                .map(photo => photo.userId || photo.userEmail)
        )].filter(Boolean).length;

        const activeUsersWeek = [...new Set(
          photos.filter(photo => photo.timestamp >= weekAgo)
                .map(photo => photo.userId || photo.userEmail)
        )].filter(Boolean).length;

        // Growth rate (weekly photos vs previous week)
        const twoWeeksAgo = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
        const previousWeekPhotos = photos.filter(photo => 
          photo.timestamp >= twoWeeksAgo && photo.timestamp < weekAgo
        ).length;
        
        const growthRate = previousWeekPhotos > 0 
          ? Math.round(((weeklyPhotos - previousWeekPhotos) / previousWeekPhotos) * 100)
          : 0;

        // Engagement rate (likes + comments per photo)
        const engagementRate = photos.length > 0 
          ? Math.round(((totalLikes + totalComments) / photos.length) * 100) / 100
          : 0;

        // Top locations
        const locationCounts = {};
        photos.forEach(photo => {
          const locationName = photo.location?.name || photo.locationName;
          if (locationName) {
            locationCounts[locationName] = (locationCounts[locationName] || 0) + 1;
          }
        });

        const topLocations = Object.entries(locationCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8)
          .map(([name, count]) => ({ name, count }));

        // Recent activity (last 15 photos with user info)
        const recentActivity = photos.slice(0, 15).map(photo => ({
          id: photo.id,
          userEmail: photo.userEmail || 'Unknown User',
          location: photo.location?.name || photo.locationName || 'Unknown location',
          timestamp: photo.timestamp,
          likes: photo.likeCount || photo.likes?.length || 0,
          comments: photo.commentCount || photo.comments?.length || 0
        }));

        // Update engagement metrics state
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
          recentActivity,
          growthRate,
          engagementRate
        });

        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      setLoading(false);
    }
  };

  const getVenueAnalytics = (venueName) => {
    return analytics.getVenueAnalytics(venueName);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
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
            padding: '12px 24px',
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
          📈 Engagement Metrics
        </button>
        <button
          onClick={() => setSelectedTab('behavior')}
          style={{
            flex: 1,
            padding: '12px 24px',
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
          🎯 Behavioral Analytics
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
          </div>

          {/* Top Locations */}
          {engagementMetrics.topLocations.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              marginBottom: '24px'
            }}>
              <h2 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
                📍 Top Locations
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {engagementMetrics.topLocations.map((location, index) => (
                  <div key={location.name} style={{
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#1f2937' }}>
                        {location.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                        #{index + 1} most popular
                      </p>
                    </div>
                    <span style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {location.count} photos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#1f2937' }}>
                      {activity.userEmail}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>
                      📍 {activity.location}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>
                      ❤️ {activity.likes}
                    </span>
                    <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                      💬 {activity.comments}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Analytics Tab (Your existing content) */}
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
