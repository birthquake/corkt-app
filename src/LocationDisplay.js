import React, { useState, useEffect } from "react";
import { reverseGeocode } from "./geocodingService";

// Global request queue to manage rate limiting
let requestQueue = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { resolve, reject, latitude, longitude } = requestQueue.shift();

    try {
      const result = await reverseGeocode(latitude, longitude);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Wait 50ms between requests to avoid rate limiting (20 requests/second max)
    if (requestQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  isProcessingQueue = false;
};

const queuedReverseGeocode = (latitude, longitude) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, latitude, longitude });
    processQueue();
  });
};

const LocationDisplay = ({ latitude, longitude }) => {
  const [locationText, setLocationText] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getLocation = async () => {
      // Validate coordinates first
      if (!latitude || !longitude) {
        setError("No coordinates provided");
        setIsLoading(false);
        return;
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setError("Invalid coordinates");
        setIsLoading(false);
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError("Coordinates out of range");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Use queued requests to avoid rate limiting
        const location = await queuedReverseGeocode(lat, lng);
        setLocationText(location);
        setError(null);
      } catch (err) {
        console.error("Geocoding error:", err);
        setError(err.message || "Unknown error");
        // Fallback to coordinates
        setLocationText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setIsLoading(false);
      }
    };

    getLocation();
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "#8e8e8e",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "2px",
        }}
      >
        <span>📍</span>
        <span>Getting location...</span>
      </div>
    );
  }

  if (error && !locationText) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "#8e8e8e",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "2px",
        }}
      >
        <span>📍</span>
        <span>Unknown location</span>
      </div>
    );
  }

  return (
    <div
      style={{
        fontSize: "12px",
        color: "#8e8e8e",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "2px",
      }}
    >
      <span>📍</span>
      <span>{locationText}</span>
    </div>
  );
};

export default LocationDisplay;
