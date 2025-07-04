// geocodingService.js - FIXED VERSION
class GeocodingCache {
    constructor() {
      this.cache = new Map();
      this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }
  
    // Round coordinates to 4 decimal places for caching (~11m precision)
    createKey(lat, lng) {
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLng = Math.round(lng * 10000) / 10000;
      return `${roundedLat},${roundedLng}`;
    }
  
    get(lat, lng) {
      const key = this.createKey(lat, lng);
      const cached = this.cache.get(key);
      
      if (!cached) return null;
      
      // Check if cache has expired
      if (Date.now() - cached.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        return null;
      }
      
      return cached.data;
    }
  
    set(lat, lng, data) {
      const key = this.createKey(lat, lng);
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
    }
  }
  
  // Create a singleton cache instance
  const geocodingCache = new GeocodingCache();
  
  // Format the location string with neighborhood, city, state hierarchy
  const formatLocation = (addressComponents) => {
    const getComponent = (types) => {
      return addressComponents.find(component => 
        types.some(type => component.types.includes(type))
      );
    };
  
    const neighborhood = getComponent(['neighborhood', 'sublocality', 'sublocality_level_1']);
    const city = getComponent(['locality']);
    const state = getComponent(['administrative_area_level_1']);
    const country = getComponent(['country']);
  
    // Build location string with hierarchy
    const parts = [];
    
    if (neighborhood) {
      parts.push(neighborhood.long_name);
    }
    
    if (city) {
      parts.push(city.long_name);
    }
    
    if (state) {
      // Use short_name for state (e.g., "OH" instead of "Ohio")
      parts.push(state.short_name || state.long_name);
    } else if (country && country.short_name !== 'US') {
      // For international locations, show country if no state
      parts.push(country.long_name);
    }
  
    return parts.length > 0 ? parts.join(', ') : null;
  };
  
  // Main geocoding function
  export const reverseGeocode = async (latitude, longitude) => {
    // Check cache first
    const cached = geocodingCache.get(latitude, longitude);
    if (cached) {
      console.log('Using cached location:', cached);
      return cached;
    }
  
    // FIXED: Use environment variable instead of hardcoded key
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      throw new Error('Google Maps API key not found in environment variables');
    }
  
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`;
  
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No geocoding results found');
      }
  
      // Extract the best result (first one is usually most accurate)
      const result = data.results[0];
      const formattedLocation = formatLocation(result.address_components);
      
      if (!formattedLocation) {
        throw new Error('Could not format location from geocoding result');
      }
  
      // Cache the result
      geocodingCache.set(latitude, longitude, formattedLocation);
      console.log('Geocoded new location:', formattedLocation);
      
      return formattedLocation;
      
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };
  
  // Optional: Export cache for debugging/monitoring
  export const getGeocodingCacheStats = () => {
    return {
      size: geocodingCache.cache.size,
      entries: Array.from(geocodingCache.cache.keys())
    };
  };
  
  // Optional: Clear cache manually
  export const clearGeocodingCache = () => {
    geocodingCache.cache.clear();
  };