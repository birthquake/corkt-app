// analyticsService.js - Comprehensive analytics collection
class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.currentMode = 'global';
    this.modeStartTime = Date.now();
    this.events = this.loadStoredEvents();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Load events from localStorage
  loadStoredEvents() {
    try {
      const stored = localStorage.getItem('corkt_analytics');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading analytics:', error);
      return [];
    }
  }

  // Save events to localStorage
  saveEvents() {
    try {
      // Keep only last 1000 events to avoid storage limits
      const eventsToStore = this.events.slice(-1000);
      localStorage.setItem('corkt_analytics', JSON.stringify(eventsToStore));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  // Core event tracking function
  track(eventName, properties = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: properties.user_id || 'anonymous',
      ...properties
    };

    this.events.push(event);
    this.saveEvents();
    
    // Log for development (remove in production)
    console.log('📊 Analytics:', eventName, properties);
  }

  // Track mode toggle with location context
  trackModeToggle(fromMode, toMode, currentLocation, venueDetected = null) {
    // Track mode switch
    this.track('mode_toggle', {
      from_mode: fromMode,
      to_mode: toMode,
      location: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        accuracy: currentLocation.accuracy
      } : null,
      venue_detected: venueDetected,
      session_duration_seconds: Math.round((Date.now() - this.sessionStart) / 1000)
    });

    // Track duration in previous mode
    if (this.currentMode) {
      const modeDuration = Math.round((Date.now() - this.modeStartTime) / 1000);
      this.track('mode_session', {
        mode: this.currentMode,
        duration_seconds: modeDuration,
        location: currentLocation ? {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude
        } : null,
        venue_detected: venueDetected
      });
    }

    // Update current mode tracking
    this.currentMode = toMode;
    this.modeStartTime = Date.now();
  }

  // Track photo interactions
  trackPhotoInteraction(action, photoLocation, currentLocation, currentMode) {
    this.track('photo_interaction', {
      action: action, // 'view', 'like', 'post'
      current_mode: currentMode,
      photo_location: photoLocation ? {
        lat: photoLocation.latitude,
        lng: photoLocation.longitude
      } : null,
      user_location: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      } : null,
      distance_to_photo: this.calculateDistance(currentLocation, photoLocation)
    });
  }

  // Track venue-specific sessions
  trackVenueSession(venueInfo, currentLocation, mode, duration, photosViewed, photosPosted) {
    this.track('venue_session', {
      venue_name: venueInfo.name,
      venue_type: venueInfo.type,
      mode: mode,
      duration_seconds: duration,
      photos_viewed: photosViewed,
      photos_posted: photosPosted,
      location: {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      }
    });
  }

  // Track user acquisition
  trackUserAcquisition(userId, currentLocation, venueDetected = null) {
    this.track('user_signup', {
      user_id: userId,
      location: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      } : null,
      venue_detected: venueDetected,
      referrer: document.referrer || 'direct'
    });
  }

  // Track app opens
  trackAppOpen(currentLocation, venueDetected = null) {
    this.track('app_open', {
      location: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      } : null,
      venue_detected: venueDetected,
      user_agent: navigator.userAgent,
      screen_size: {
        width: window.screen.width,
        height: window.screen.height
      }
    });
  }

  // Calculate distance between two points
  calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2) return null;
    
    const R = 6371000; // Earth's radius in meters
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Get analytics summary for venues
  getVenueAnalytics(venueName) {
    const venueEvents = this.events.filter(event => 
      event.venue_detected === venueName || 
      (event.venue_name && event.venue_name === venueName)
    );

    const modeToggles = venueEvents.filter(event => event.event === 'mode_toggle');
    const localToggles = modeToggles.filter(event => event.to_mode === 'local');
    const venueSessions = venueEvents.filter(event => event.event === 'venue_session');
    const userSignups = venueEvents.filter(event => event.event === 'user_signup');

    return {
      total_events: venueEvents.length,
      mode_toggles: modeToggles.length,
      local_mode_activations: localToggles.length,
      local_mode_percentage: modeToggles.length > 0 ? 
        Math.round((localToggles.length / modeToggles.length) * 100) : 0,
      venue_sessions: venueSessions.length,
      user_acquisitions: userSignups.length,
      average_session_duration: venueSessions.length > 0 ?
        Math.round(venueSessions.reduce((sum, session) => sum + session.duration_seconds, 0) / venueSessions.length) : 0
    };
  }

  // Export all analytics data
  exportAnalytics() {
    const blob = new Blob([JSON.stringify(this.events, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corkt_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all analytics data
  clearAnalytics() {
    this.events = [];
    this.saveEvents();
    console.log('Analytics data cleared');
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics;
