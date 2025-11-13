import React, { useState, useEffect } from "react";

// SVG Icon Components for place types
const RestaurantIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M6 2L6 22"/>
    <path d="M6 6H15C16.66 6 18 7.34 18 9C18 10.66 16.66 12 15 12H6"/>
    <path d="M6 12H18C19.66 12 21 13.34 21 15C21 16.66 19.66 18 18 18H6"/>
  </svg>
);

const CafeIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 15V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/>
    <path d="M20 9H4"/>
    <circle cx="16" cy="15" r="3"/>
    <path d="M19 19H5a2 2 0 0 0-2 2h18a2 2 0 0 0-2-2z"/>
  </svg>
);

const ShoppingIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const StoreIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 9l1.65 8.8a2 2 0 0 0 2 1.6h12.7a2 2 0 0 0 2-1.6L21 9"/>
    <path d="M3 9V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
    <line x1="7" y1="9" x2="7" y2="4"/>
    <line x1="17" y1="9" x2="17" y2="4"/>
  </svg>
);

const BuildingIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 21H21V3H3Z"/>
    <path d="M3 9H21"/>
    <path d="M3 15H21"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);

const MuseumIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 21H21"/>
    <path d="M12 3L2 9V21"/>
    <path d="M12 3L22 9V21"/>
    <line x1="12" y1="3" x2="12" y2="21"/>
  </svg>
);

const ParkIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 2L15 9L23 9L17 14L19 21L12 16L5 21L7 14L1 9L9 9Z"/>
  </svg>
);

const GymIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M6 4L4 6L4 20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V6L18 4M6 4H18M6 4V2M18 4V2M8 9L16 9M8 15L16 15"/>
  </svg>
);

const HospitalIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 21H21V3H3Z"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const SchoolIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 2L2 8L2 14L12 20L22 14V8Z"/>
    <polyline points="2 8 12 14 22 8"/>
    <polyline points="12 14 12 20"/>
  </svg>
);

const LibraryIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/>
    <path d="M4 5L6 3"/>
    <path d="M20 5L18 3"/>
    <line x1="8" y1="7" x2="8" y2="17"/>
    <line x1="12" y1="7" x2="12" y2="17"/>
    <line x1="16" y1="7" x2="16" y2="17"/>
  </svg>
);

const ChurchIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 2L12 8"/>
    <path d="M8 8L16 8L16 20L8 20Z"/>
    <path d="M8 20H16"/>
    <path d="M12 2L8 8H16Z"/>
    <line x1="12" y1="12" x2="12" y2="20"/>
  </svg>
);

const TransitIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M5 15L5 19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V15"/>
    <path d="M2 8L2 12C2 13.1046 2.89543 14 4 14H20C21.1046 14 22 13.1046 22 12V8"/>
    <rect x="4" y="3" width="16" height="5"/>
  </svg>
);

const BankIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M2 6L12 2L22 6"/>
    <rect x="2" y="6" width="20" height="14" rx="1"/>
    <line x1="2" y1="6" x2="22" y2="6"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="8" y1="6" x2="8" y2="20"/>
    <line x1="16" y1="6" x2="16" y2="20"/>
  </svg>
);

const PharmacyIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 8L12 16"/>
    <path d="M8 12L16 12"/>
  </svg>
);

const MovieIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
    <polyline points="17 2 12 7 7 2"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);

const BarIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M2 2H22V7H2Z"/>
    <path d="M8 7L7 22H17L16 7"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
  </svg>
);

const HotelIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 21H21V3H3Z"/>
    <path d="M3 9H21"/>
    <path d="M7 6H7.01"/>
    <path d="M11 6H11.01"/>
    <path d="M15 6H15.01"/>
  </svg>
);

const LocationIconDefault = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const AirportIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M18 8H6L12 2"/>
    <path d="M6 8H2"/>
    <path d="M22 8H18"/>
    <path d="M12 8V22"/>
    <path d="M6 22H18"/>
  </svg>
);

const StadiumIcon = ({ color = "var(--color-primary)", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <ellipse cx="12" cy="12" rx="9" ry="6"/>
    <ellipse cx="12" cy="12" rx="6" ry="3"/>
    <path d="M6 9L3 18"/>
    <path d="M18 9L21 18"/>
  </svg>
);

// Enhanced LocationPicker component with SMART VENUE DETECTION
const LocationPicker = ({ onLocationSelect, onClose, isVisible }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualSearch, setManualSearch] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [searching, setSearching] = useState(false);

  // iOS Safari detection for better location handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // ✅ AGGRESSIVE ACCURACY: All searches locked to 100m max
  const MAX_SEARCH_RADIUS = 100;

  useEffect(() => {
    if (isVisible) {
      checkGoogleMapsAPI();
    }
  }, [isVisible]);

  // REAL-TIME SEARCH: Debounced search as user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (manualSearch.trim() && currentLocation) {
        handleAutoSearch();
      } else if (!manualSearch.trim() && currentLocation) {
        // Reset to nearby places when search is cleared
        fetchNearbyPlacesCompatible(currentLocation);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [manualSearch, currentLocation]);

  // Check if Google Maps API and Places are properly loaded
  const checkGoogleMapsAPI = async () => {
    console.log("🔍 Checking Google Maps API availability...");

    try {
      // Wait for Google Maps to be fully loaded
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total

      while (attempts < maxAttempts) {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log("✅ Google Maps API with Places is available");
          setApiStatus("available");
          await getPreciseLocation();
          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // If we get here, API isn't available
      throw new Error("Google Maps API not available");
    } catch (err) {
      console.error("❌ Google Maps API check failed:", err);
      setApiStatus("unavailable");
      setError(
        "Google Maps API is not available. Please check your API key and ensure Places API is enabled."
      );
      setLoading(false);
    }
  };

  // Enhanced location getting with better precision
  const getPreciseLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🎯 Getting precise location...");

      // Enhanced geolocation options for better accuracy
      const options = {
        enableHighAccuracy: true,
        timeout: isIOS ? 20000 : 15000, // Longer timeout for iOS
        maximumAge: 10000, // Cache for 10 seconds max
      };

      // Get high-accuracy position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const { latitude, longitude, accuracy } = position.coords;

      const location = {
        latitude: parseFloat(latitude.toFixed(7)), // More precision
        longitude: parseFloat(longitude.toFixed(7)),
        accuracy: Math.round(accuracy),
      };

      console.log(
        `📍 Got location: ${location.latitude}, ${location.longitude} (±${location.accuracy}m)`
      );
      setCurrentLocation(location);

      // Fetch initial nearby places with smart detection
      await fetchNearbyPlacesCompatible(location);
    } catch (err) {
      console.error("📍 Location error:", err);
      setError(getLocationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Get user-friendly error message
  const getLocationErrorMessage = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location access denied. Please enable location permissions and try again.";
      case error.POSITION_UNAVAILABLE:
        return "Location information unavailable. Please try again.";
      case error.TIMEOUT:
        return "Location request timed out. Please try again.";
      default:
        return "Unable to get your location. Please try again or search manually.";
    }
  };

  // ✅ NEW: Smart venue detection - if few results, search for large venues
  const fetchNearbyPlacesCompatible = async (location) => {
    try {
      console.log("🔍 Starting smart venue detection (100m max)...");

      // Step 1: Primary search (100m for exact location)
      const primaryResults = await fetchNearbyPlacesLegacy(location, MAX_SEARCH_RADIUS);
      console.log(`📍 Primary search (${MAX_SEARCH_RADIUS}m): ${primaryResults.length} results`);

      // Step 2: Smart detection - if < 3 results, search for large venues
      if (primaryResults.length < 3) {
        console.log("🏢 Few results found, searching for large venues (100m max)...");
        const venueResults = await fetchLargeVenues(location);
        console.log(`🏟️ Venue search: ${venueResults.length} results`);

        // Combine results, marking venue results
        const combinedResults = [
          ...primaryResults,
          ...venueResults.map(venue => ({ ...venue, isLargeVenue: true }))
        ];

        // Remove duplicates based on place_id
        const uniqueResults = combinedResults.filter((place, index, self) =>
          index === self.findIndex(p => p.id === place.id)
        );

        console.log(`✅ Smart detection complete: ${uniqueResults.length} total results`);
        setNearbyPlaces(uniqueResults);
      } else {
        console.log("✅ Sufficient results found, using primary search only");
        setNearbyPlaces(primaryResults);
      }
    } catch (err) {
      console.error("🔍 Error in smart venue detection:", err);
      setNearbyPlaces([]);
    }
  };

  // ✅ NEW: Search specifically for large venues (airports, malls, stadiums, etc.) - 100m LOCKED
  const fetchLargeVenues = async (location) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        reject(new Error("Google Places API not available"));
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      // Search for large venue types with 100m radius (AGGRESSIVE ACCURACY)
      const venueTypes = [
        'airport',
        'shopping_mall', 
        'stadium',
        'university',
        'hospital',
        'amusement_park',
        'zoo',
        'transit_station',
        'train_station',
        'subway_station'
      ];

      let allVenueResults = [];
      let completedSearches = 0;

      // Search each venue type
      venueTypes.forEach(venueType => {
        const request = {
          location: new window.google.maps.LatLng(
            location.latitude,
            location.longitude
          ),
          radius: MAX_SEARCH_RADIUS, // ✅ LOCKED TO 100m
          type: venueType
        };

        service.nearbySearch(request, (results, status) => {
          completedSearches++;

          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const processedVenues = results
              .slice(0, 3) // Max 3 per venue type
              .map((place, index) => {
                const distance = calculateDistance(
                  location.latitude,
                  location.longitude,
                  place.geometry?.location?.lat() || location.latitude,
                  place.geometry?.location?.lng() || location.longitude
                );

                return {
                  id: place.place_id || `venue_${venueType}_${index}`,
                  name: place.name || "Unknown Venue",
                  address: place.vicinity || place.formatted_address || "",
                  location: {
                    latitude: place.geometry?.location?.lat() || location.latitude,
                    longitude: place.geometry?.location?.lng() || location.longitude,
                  },
                  types: place.types || [],
                  rating: place.rating || null,
                  ratingCount: place.user_ratings_total || 0,
                  priceLevel: place.price_level || null,
                  businessStatus: place.business_status || "OPERATIONAL",
                  distance: distance,
                  venueType: venueType, // Mark the venue type
                  photoUrl:
                    place.photos && place.photos[0]
                      ? place.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 })
                      : null,
                };
              })
              .filter(venue => 
                venue.businessStatus !== "CLOSED_PERMANENTLY" && 
                venue.distance <= MAX_SEARCH_RADIUS // ✅ LOCKED TO 100m
              );

            allVenueResults = [...allVenueResults, ...processedVenues];
          }

          // When all searches complete
          if (completedSearches === venueTypes.length) {
            // Remove duplicates and sort by distance
            const uniqueVenues = allVenueResults
              .filter((venue, index, self) =>
                index === self.findIndex(v => v.id === venue.id)
              )
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 10); // Max 10 venue results

            console.log(`🏟️ Large venue search found ${uniqueVenues.length} venues within ${MAX_SEARCH_RADIUS}m`);
            resolve(uniqueVenues);
          }
        });
      });

      // Fallback timeout
      setTimeout(() => {
        if (completedSearches < venueTypes.length) {
          console.log("⏰ Venue search timeout, returning partial results");
          resolve(allVenueResults.slice(0, 10));
        }
      }, 5000);
    });
  };

  // UPDATED: Original nearby search with configurable radius
  const fetchNearbyPlacesLegacy = async (location, radius = MAX_SEARCH_RADIUS) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        reject(new Error("Google Places API not available"));
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      const request = {
        location: new window.google.maps.LatLng(
          location.latitude,
          location.longitude
        ),
        radius: radius,
        type: undefined, // Remove type filter to get more results
      };

      console.log(`🔍 Places API request (${radius}m):`, request);

      service.nearbySearch(request, (results, status) => {
        console.log(`🔍 Places API Status (${radius}m):`, status);
        console.log(`🔍 Places API Results (${radius}m):`, results);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          console.log(`🏢 Found ${results.length} places within ${radius}m`);
          // Process ALL results, not just specific types
          const processedPlaces = results
            .slice(0, 15) // Take top 15 results
            .map((place, index) => ({
              id: place.place_id || `legacy_${index}`,
              name: place.name || "Unknown Place",
              address: place.vicinity || place.formatted_address || "",
              location: {
                latitude: place.geometry?.location?.lat() || location.latitude,
                longitude:
                  place.geometry?.location?.lng() || location.longitude,
              },
              types: place.types || [],
              rating: place.rating || null,
              ratingCount: place.user_ratings_total || 0,
              priceLevel: place.price_level || null,
              businessStatus: place.business_status || "OPERATIONAL",
              distance: calculateDistance(
                location.latitude,
                location.longitude,
                place.geometry?.location?.lat() || location.latitude,
                place.geometry?.location?.lng() || location.longitude
              ),
              photoUrl:
                place.photos && place.photos[0]
                  ? place.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 })
                  : null,
            }))
            // Filter out places that are too far or closed
            .filter(
              (place) =>
                place.businessStatus !== "CLOSED_PERMANENTLY" &&
                place.distance <= radius
            )
            // Sort by distance
            .sort((a, b) => a.distance - b.distance);

          console.log(`✅ Processed ${processedPlaces.length} places within ${radius}m`);
          resolve(processedPlaces);
        } else {
          console.error(`🔍 Places API failed (${radius}m):`, status);

          // Log specific error details
          if (
            status ===
            window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            console.log(`ℹ️ No places found within ${radius}m`);
          }

          resolve([]); // Return empty array instead of rejecting
        }
      });
    });
  };

  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  // REAL-TIME SEARCH: Auto-search as user types - 100m LOCKED
  const handleAutoSearch = async () => {
    if (!manualSearch.trim() || !currentLocation) return;

    setSearching(true);

    try {
      console.log("🔍 Auto-search:", manualSearch);

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      // Primary search method - LOCKED TO 100m
      const request = {
        query: manualSearch,
        location: new window.google.maps.LatLng(
          currentLocation.latitude,
          currentLocation.longitude
        ),
        radius: MAX_SEARCH_RADIUS, // ✅ LOCKED TO 100m
      };

      service.textSearch(request, (results, status) => {
        console.log(
          `🔍 Text search status: ${status}, results: ${results?.length || 0}`
        );

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          const searchResults = results
            .filter((place) => {
              const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                place.geometry?.location?.lat() || currentLocation.latitude,
                place.geometry?.location?.lng() || currentLocation.longitude
              );
              return distance <= MAX_SEARCH_RADIUS; // ✅ LOCKED TO 100m
            })
            .slice(0, 10)
            .map((place, index) => ({
              id: place.place_id || `search_${index}`,
              name: place.name || "Unknown Place",
              address: place.formatted_address || place.vicinity || "",
              location: {
                latitude: place.geometry?.location?.lat(),
                longitude: place.geometry?.location?.lng(),
              },
              types: place.types || [],
              rating: place.rating || null,
              ratingCount: place.user_ratings_total || 0,
              distance: calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                place.geometry?.location?.lat() || currentLocation.latitude,
                place.geometry?.location?.lng() || currentLocation.longitude
              ),
              isSearchResult: true,
            }));

          console.log(`✅ Auto-search found ${searchResults.length} results within ${MAX_SEARCH_RADIUS}m`);
          setNearbyPlaces(searchResults);
        } else {
          // If text search fails, try keyword search
          console.log("🔍 Trying keyword search...");
          const keywordRequest = {
            location: new window.google.maps.LatLng(
              currentLocation.latitude,
              currentLocation.longitude
            ),
            radius: MAX_SEARCH_RADIUS, // ✅ LOCKED TO 100m
            keyword: manualSearch,
          };

          service.nearbySearch(keywordRequest, (results, status) => {
            console.log(
              `🔍 Keyword search status: ${status}, results: ${
                results?.length || 0
              }`
            );

            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              const keywordResults = results
                .slice(0, 10)
                .map((place, index) => ({
                  id: place.place_id || `keyword_${index}`,
                  name: place.name || "Unknown Place",
                  address: place.vicinity || "",
                  location: {
                    latitude: place.geometry?.location?.lat(),
                    longitude: place.geometry?.location?.lng(),
                  },
                  types: place.types || [],
                  rating: place.rating || null,
                  ratingCount: place.user_ratings_total || 0,
                  distance: calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    place.geometry?.location?.lat() || currentLocation.latitude,
                    place.geometry?.location?.lng() || currentLocation.longitude
                  ),
                  isSearchResult: true,
                }));

              setNearbyPlaces(keywordResults);
              console.log(
                `✅ Keyword search found ${keywordResults.length} results within ${MAX_SEARCH_RADIUS}m`
              );
            } else {
              // No results found
              setNearbyPlaces([]);
              console.log("❌ No search results found");
            }
          });
        }

        setSearching(false);
      });
    } catch (err) {
      console.error("Auto-search error:", err);
      setSearching(false);
    }
  };

  // ✅ UPDATED: Enhanced icon mapping for large venues - using SVG components
  const getPlaceIcon = (types, isLargeVenue = false, venueType = null) => {
    // Special icons for large venues
    if (isLargeVenue && venueType) {
      const venueIconMap = {
        airport: AirportIcon,
        shopping_mall: ShoppingIcon,
        stadium: StadiumIcon,
        university: SchoolIcon,
        hospital: HospitalIcon,
        amusement_park: ParkIcon,
        zoo: ParkIcon,
        transit_station: TransitIcon,
        train_station: TransitIcon,
        subway_station: TransitIcon
      };
      if (venueIconMap[venueType]) return venueIconMap[venueType];
    }

    if (!types || types.length === 0) return LocationIconDefault;

    const typeIconMap = {
      restaurant: RestaurantIcon,
      food: RestaurantIcon,
      meal_takeaway: RestaurantIcon,
      cafe: CafeIcon,
      shopping_mall: ShoppingIcon,
      store: StoreIcon,
      establishment: BuildingIcon,
      tourist_attraction: MuseumIcon,
      museum: MuseumIcon,
      park: ParkIcon,
      gym: GymIcon,
      hospital: HospitalIcon,
      school: SchoolIcon,
      university: SchoolIcon,
      library: LibraryIcon,
      church: ChurchIcon,
      subway_station: TransitIcon,
      gas_station: StoreIcon,
      bank: BankIcon,
      atm: BankIcon,
      pharmacy: PharmacyIcon,
      movie_theater: MovieIcon,
      night_club: BarIcon,
      bar: BarIcon,
      lodging: HotelIcon,
      beauty_salon: StoreIcon,
      hair_care: StoreIcon,
      electronics_store: StoreIcon,
      clothing_store: StoreIcon,
      book_store: LibraryIcon,
      grocery_or_supermarket: ShoppingIcon,
      point_of_interest: LocationIconDefault,
      airport: AirportIcon,
      stadium: StadiumIcon,
    };

    // Find the first matching type
    for (const type of types) {
      if (typeIconMap[type]) {
        return typeIconMap[type];
      }
    }
    return LocationIconDefault;
  };

  // Handle place selection - IMMEDIATE CONFIRMATION
  const handlePlaceSelect = (place) => {
    // Immediately use the selected place
    onLocationSelect({
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      placeName: place.name,
      placeAddress: place.address,
      placeTypes: place.types,
      accuracy: currentLocation?.accuracy,
    });
    onClose();
  };

  // Handle current location selection - IMMEDIATE CONFIRMATION
  const handleCurrentLocationSelect = () => {
    if (currentLocation) {
      onLocationSelect({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        placeName: null,
        placeAddress: null,
        placeTypes: null,
        accuracy: currentLocation.accuracy,
      });
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "16px",
          maxWidth: "400px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid var(--color-border)",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              right: "16px",
              top: "16px",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "4px",
            }}
          >
            ✕
          </button>

          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--color-text-primary)",
            }}
          >
            📍 Choose Location
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--color-text-muted)",
            }}
          >
            Tap any location to use it
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            maxHeight: "calc(85vh - 200px)",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid var(--color-border)",
                  borderTop: "2px solid var(--color-primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <p style={{ margin: 0 }}>
                {apiStatus === "checking"
                  ? "Checking Google Maps API..."
                  : "Getting your location..."}
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#dc3545",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>⚠️</div>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>{error}</p>
              <button
                onClick={checkGoogleMapsAPI}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div style={{ padding: "16px" }}>
              {/* Auto-Search Input */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Type to search nearby places..."
                    style={{
                      width: "100%",
                      padding: "12px 12px 12px 44px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: "var(--color-bg-tertiary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  {/* Search Icon */}
                  <div
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "20px",
                      height: "20px",
                    }}
                  >
                    <LocationIconDefault color="var(--color-text-muted)" size={16} />
                  </div>
                  {/* Loading Indicator */}
                  {searching && (
                    <div
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid var(--color-border)",
                          borderTop: "2px solid var(--color-primary)",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </div>
                {manualSearch && nearbyPlaces.length === 0 && !searching && (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      textAlign: "center",
                    }}
                  >
                    No places found matching "{manualSearch}"
                  </p>
                )}
              </div>

              {/* Current Location Option */}
              {currentLocation && (
                <div
                  onClick={handleCurrentLocationSelect}
                  style={{
                    padding: "12px",
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    marginBottom: "16px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LocationIconDefault color="var(--color-primary)" size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        Current Location
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {currentLocation.accuracy &&
                          `Accuracy: ±${currentLocation.accuracy}m • Tap to use`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ UPDATED: Nearby Places with Large Venue Labels */}
              {nearbyPlaces.length > 0 ? (
                <div>
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Nearby Places ({nearbyPlaces.length})
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {nearbyPlaces.map((place) => {
                      const IconComponent = getPlaceIcon(place.types, place.isLargeVenue, place.venueType);
                      return (
                        <div
                          key={place.id}
                          onClick={() => handlePlaceSelect(place)}
                          style={{
                            padding: "12px",
                            backgroundColor: place.isLargeVenue ? "rgba(255, 193, 7, 0.15)" : "var(--color-bg-tertiary)",
                            border: place.isLargeVenue ? "1px solid #ffc107" : "1px solid var(--color-border)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconComponent color="var(--color-primary)" size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "var(--color-text-primary)",
                                  }}
                                >
                                  {place.name}
                                </p>
                                {/* ✅ NEW: Large venue indicator */}
                                {place.isLargeVenue && (
                                  <span
                                    style={{
                                      backgroundColor: "#ffc107",
                                      color: "#000",
                                      fontSize: "10px",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    VENUE
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {place.distance !== null && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--color-text-muted)",
                                    }}
                                  >
                                    {place.distance < 1000
                                      ? `${place.distance}m away`
                                      : `${(place.distance / 1000).toFixed(
                                          1
                                        )}km away`}
                                  </span>
                                )}
                                {place.rating && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#ffc107",
                                    }}
                                  >
                                    ⭐ {place.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              {place.address && (
                                <p
                                  style={{
                                    margin: "4px 0 0 0",
                                    fontSize: "12px",
                                    color: "var(--color-text-muted)",
                                    lineHeight: "1.2",
                                  }}
                                >
                                  {place.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                currentLocation && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 8px",
                      }}
                    >
                      <LocationIconDefault color="var(--color-primary)" size={24} />
                    </div>
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      No places found nearby. Try a search or use your current location.
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
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

export default LocationPicker;
