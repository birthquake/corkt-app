import React, { useState, useEffect } from "react";

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
      console.log("🔍 Starting smart venue detection...");

      // Step 1: Primary search (100m for exact location)
      const primaryResults = await fetchNearbyPlacesLegacy(location, 100);
      console.log(`📍 Primary search (100m): ${primaryResults.length} results`);

      // Step 2: Smart detection - if < 3 results, search for large venues
      if (primaryResults.length < 3) {
        console.log("🏢 Few results found, searching for large venues...");
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

  // ✅ NEW: Search specifically for large venues (airports, malls, stadiums, etc.)
  const fetchLargeVenues = async (location) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        reject(new Error("Google Places API not available"));
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      // Search for large venue types with bigger radius
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
          radius: 800, // Larger radius for large venues only
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
                venue.distance <= 800 // Within 800m for large venues
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

            console.log(`🏟️ Large venue search found ${uniqueVenues.length} venues`);
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
  const fetchNearbyPlacesLegacy = async (location, radius = 100) => {
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

  // REAL-TIME SEARCH: Auto-search as user types
  const handleAutoSearch = async () => {
    if (!manualSearch.trim() || !currentLocation) return;

    setSearching(true);

    try {
      console.log("🔍 Auto-search:", manualSearch);

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      // Primary search method
      const request = {
        query: manualSearch,
        location: new window.google.maps.LatLng(
          currentLocation.latitude,
          currentLocation.longitude
        ),
        radius: 200, // Slightly larger for search, but still very local
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
              return distance <= 200; // Keep within 2 blocks for search
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

          console.log(`✅ Auto-search found ${searchResults.length} results`);
          setNearbyPlaces(searchResults);
        } else {
          // If text search fails, try keyword search
          console.log("🔍 Trying keyword search...");
          const keywordRequest = {
            location: new window.google.maps.LatLng(
              currentLocation.latitude,
              currentLocation.longitude
            ),
            radius: 150,
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
                `✅ Keyword search found ${keywordResults.length} results`
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

  // ✅ UPDATED: Enhanced icon mapping for large venues
  const getPlaceIcon = (types, isLargeVenue = false, venueType = null) => {
    // Special icons for large venues
    if (isLargeVenue && venueType) {
      const venueIconMap = {
        airport: "✈️",
        shopping_mall: "🛒",
        stadium: "🏟️",
        university: "🎓",
        hospital: "🏥",
        amusement_park: "🎢",
        zoo: "🦁",
        transit_station: "🚉",
        train_station: "🚂",
        subway_station: "🚇"
      };
      if (venueIconMap[venueType]) return venueIconMap[venueType];
    }

    if (!types || types.length === 0) return "📍";

    const typeIconMap = {
      restaurant: "🍽️",
      food: "🍽️",
      meal_takeaway: "🥡",
      cafe: "☕",
      shopping_mall: "🛒",
      store: "🏪",
      establishment: "🏢",
      tourist_attraction: "🗿",
      museum: "🏛️",
      park: "🌳",
      gym: "💪",
      hospital: "🏥",
      school: "🏫",
      university: "🎓",
      library: "📚",
      church: "⛪",
      subway_station: "🚇",
      gas_station: "⛽",
      bank: "🏦",
      atm: "🏧",
      pharmacy: "💊",
      movie_theater: "🎬",
      night_club: "🌃",
      bar: "🍻",
      lodging: "🏨",
      beauty_salon: "💅",
      hair_care: "💇",
      electronics_store: "📱",
      clothing_store: "👕",
      book_store: "📖",
      grocery_or_supermarket: "🛒",
      point_of_interest: "📍",
      airport: "✈️",
      stadium: "🏟️",
    };

    // Find the first matching type
    for (const type of types) {
      if (typeIconMap[type]) {
        return typeIconMap[type];
      }
    }
    return "📍";
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
          backgroundColor: "#ffffff",
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
            borderBottom: "1px solid #e9ecef",
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
              color: "#6c757d",
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
              color: "#343a40",
            }}
          >
            📍 Choose Location
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#6c757d",
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
                color: "#6c757d",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid #e9ecef",
                  borderTop: "2px solid #007bff",
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
                  backgroundColor: "#007bff",
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
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {/* Search Icon */}
                  <div
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6c757d",
                      fontSize: "16px",
                    }}
                  >
                    🔍
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
                          border: "2px solid #e9ecef",
                          borderTop: "2px solid #007bff",
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
                      color: "#6c757d",
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
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #e9ecef",
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
                        fontSize: "20px",
                        width: "32px",
                        textAlign: "center",
                      }}
                    >
                      📍
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "#343a40",
                        }}
                      >
                        Current Location
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#6c757d",
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
                      color: "#343a40",
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
                    {nearbyPlaces.map((place) => (
                      <div
                        key={place.id}
                        onClick={() => handlePlaceSelect(place)}
                        style={{
                          padding: "12px",
                          backgroundColor: place.isLargeVenue ? "#fff9c4" : "#f8f9fa",
                          border: place.isLargeVenue ? "1px solid #ffc107" : "1px solid #e9ecef",
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
                              fontSize: "20px",
                              width: "32px",
                              textAlign: "center",
                            }}
                          >
                            {getPlaceIcon(place.types, place.isLargeVenue, place.venueType)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "#343a40",
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
                                    color: "#6c757d",
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
                                  color: "#6c757d",
                                  lineHeight: "1.2",
                                }}
                              >
                                {place.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                currentLocation && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#6c757d",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                      🔍
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
