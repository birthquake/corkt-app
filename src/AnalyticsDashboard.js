// AnalyticsDashboard.js - View analytics data
import React, { useState, useEffect } from 'react';
import analytics from './analyticsService';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedVenue, setSelectedVenue] = useState('all');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    const events = analytics.events;
    setAnalyticsData(events);
    
    // Calculate summary statistics
    const totalEvents = events.length;
    const modeToggles = events.filter(e => e.event === 'mode_toggle');
    const localToggles = modeToggles.filter(e => e.to_mode === 'local');
    const globalToggles = modeToggles.filter(e => e.to_mode === 'global');
    const photoInteractions = events.filter(e => e.event === 'photo_interaction');
    const userSignups = events.filter(e => e.event === 'user_signup');
    const appOpens = events.filter(e => e.event === 'app_open');
    
    // Get unique venues
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

  const getVenueAnalytics = (venueName) => {
    return analytics.getVenueAnalytics(venueName);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportData = () => {
    analytics.exportAnalytics();
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data?')) {
      analytics.clearAnalytics();
      loadAnalytics();
    }
  };

  const filteredEvents = selectedVenue === 'all' 
    ? analyticsData 
    : analyticsData.filter(event => event.venue_detected === selectedVenue);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>📊 Corkt Analytics Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Export Data
          </button>
          <button
            onClick={clearData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Events</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {summary.totalEvents}
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Mode Toggles</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {summary.modeToggles}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
            {summary.localTogglePercentage}% to Local mode
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Photo Interactions</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {summary.photoInteractions}
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>User Signups</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
            {summary.userSignups}
          </p>
        </div>
      </div>

      {/* Venue Analytics */}
      {summary.venues && summary.venues.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>📍 Venue Analytics</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {summary.venues.map(venue => {
              const venueData = getVenueAnalytics(venue);
              return (
                <div key={venue} style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>{venue}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mode Toggles:</span>
                      <strong>{venueData.mode_toggles}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Local Mode %:</span>
                      <strong>{venueData.local_mode_percentage}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Venue Sessions:</span>
                      <strong>{venueData.venue_sessions}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>User Acquisitions:</span>
                      <strong>{venueData.user_acquisitions}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Avg Session (sec):</span>
                      <strong>{venueData.average_session_duration}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Filter */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filter by Venue:</label>
        <select
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '10px'
          }}
        >
          <option value="all">All Venues</option>
          {summary.venues && summary.venues.map(venue => (
            <option key={venue} value={venue}>{venue}</option>
          ))}
        </select>
        <span style={{ color: '#6c757d' }}>
          Showing {filteredEvents.length} events
        </span>
      </div>

      {/* Recent Events */}
      <div>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>📋 Recent Events</h2>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {filteredEvents.slice(-50).reverse().map((event, index) => (
            <div key={index} style={{
              padding: '12px 16px',
              borderBottom: index < filteredEvents.length - 1 ? '1px solid #f8f9fa' : 'none',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ color: '#495057' }}>{event.event}</strong>
                <span style={{ color: '#6c757d', fontSize: '12px' }}>
                  {formatDate(event.timestamp)}
                </span>
              </div>
              <div style={{ color: '#6c757d', fontSize: '12px' }}>
                {event.venue_detected && <span>📍 {event.venue_detected} • </span>}
                {event.from_mode && event.to_mode && (
                  <span>🔄 {event.from_mode} → {event.to_mode} • </span>
                )}
                {event.action && <span>📸 {event.action} • </span>}
                {event.session_id && <span>Session: {event.session_id.slice(-6)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
