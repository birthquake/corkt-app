import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import analytics from "./analyticsService"; // ✅ NEW: Import analytics service

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [realName, setRealName] = useState("");
  const [screenName, setScreenName] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screenNameChecking, setScreenNameChecking] = useState(false);
  const [screenNameAvailable, setScreenNameAvailable] = useState(null);

  // ✅ NEW: Location state for analytics
  const [currentLocation, setCurrentLocation] = useState(null);

  // ✅ NEW: Get current location for analytics
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });
        },
        (error) => {
          console.warn("Location not available for analytics:", error);
          // Don't show error to user, just proceed without location
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      );
    }
  }, []);

  // ✅ NEW: Simple venue detection function (same as HomeFeed)
  const detectVenue = (location) => {
    if (!location) return null;
    
    const KNOWN_VENUES = [
      { lat: 39.9685, lng: -82.9923, radius: 100, name: 'Fox in the Snow - Italian Village' },
      { lat: 39.9612, lng: -82.9988, radius: 150, name: 'North Market' },
      { lat: 39.9691, lng: -82.9977, radius: 200, name: 'Huntington Park' },
      { lat: 39.9634, lng: -82.9959, radius: 100, name: 'Natalie\'s Music Hall' },
      { lat: 39.9712, lng: -82.9943, radius: 150, name: 'Land-Grant Brewing' },
    ];

    for (const venue of KNOWN_VENUES) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        venue.lat,
        venue.lng
      );
      if (distance <= venue.radius) {
        return venue.name;
      }
    }
    return null;
  };

  // ✅ NEW: Distance calculation helper
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Check if screen name is available
  const checkScreenNameAvailability = async (screenName) => {
    if (!screenName || screenName.length < 3) {
      setScreenNameAvailable(null);
      return;
    }

    setScreenNameChecking(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("screenName", "==", screenName.toLowerCase())
      );
      const querySnapshot = await getDocs(q);
      setScreenNameAvailable(querySnapshot.empty);
    } catch (error) {
      console.error("Error checking screen name:", error);
      setScreenNameAvailable(null);
    } finally {
      setScreenNameChecking(false);
    }
  };

  // Debounced screen name check
  const handleScreenNameChange = (value) => {
    setScreenName(value);
    setScreenNameAvailable(null);

    if (window.screenNameTimeout) {
      clearTimeout(window.screenNameTimeout);
    }

    window.screenNameTimeout = setTimeout(() => {
      checkScreenNameAvailability(value);
    }, 500);
  };

  const validateScreenName = (screenName) => {
    const regex = /^[a-zA-Z0-9_]+$/;
    return (
      regex.test(screenName) &&
      screenName.length >= 3 &&
      screenName.length <= 20
    );
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validation
    if (!realName.trim()) {
      setError("Please enter your real name.");
      setLoading(false);
      return;
    }

    if (!screenName.trim()) {
      setError("Please choose a screen name.");
      setLoading(false);
      return;
    }

    if (!validateScreenName(screenName)) {
      setError(
        "Screen name must be 3-20 characters and contain only letters, numbers, and underscores."
      );
      setLoading(false);
      return;
    }

    if (screenNameAvailable === false) {
      setError("This screen name is already taken. Please choose another.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const auth = getAuth();
    try {
      await checkScreenNameAvailability(screenName);
      if (screenNameAvailable === false) {
        setError("This screen name was just taken. Please choose another.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const profileRef = doc(collection(db, "users"), user.uid);
      await setDoc(profileRef, {
        email: user.email,
        realName: realName.trim(),
        screenName: screenName.toLowerCase().trim(),
        displayScreenName: screenName.trim(),
        profilePicture: "",
        bio: "",
        createdAt: serverTimestamp(),
        searchTerms: [
          realName.toLowerCase().trim(),
          screenName.toLowerCase().trim(),
          ...realName.toLowerCase().split(" "),
        ].filter((term) => term.length > 0),
      });

      // ✅ NEW: Track user signup with analytics
      const venueDetected = detectVenue(currentLocation);
      analytics.trackUserAcquisition(user.uid, currentLocation, venueDetected);
      
      console.log("📊 User signup tracked:", {
        userId: user.uid,
        location: currentLocation,
        venue: venueDetected
      });

      setSuccess(true);
      console.log("User created successfully:", user.email);

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRealName("");
      setScreenName("");
    } catch (err) {
      console.error("Signup error:", err);

      switch (err.code) {
        case "auth/email-already-in-use":
          setError(
            "This email is already registered. Please try logging in instead."
          );
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password is too weak. Please choose a stronger password.");
          break;
        default:
          setError(err.message || "An error occurred during signup.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getScreenNameInputStyle = () => {
    let borderColor = "#e5e7eb";
    if (screenNameChecking) borderColor = "#f59e0b";
    else if (screenNameAvailable === true) borderColor = "#10b981";
    else if (screenNameAvailable === false) borderColor = "#ef4444";

    return {
      width: "100%",
      padding: "16px",
      border: `2px solid ${borderColor}`,
      borderRadius: "12px",
      fontSize: "16px",
      background: loading ? "#f9fafb" : "#fafafa",
      transition: "all 0.3s ease",
      boxSizing: "border-box",
      outline: "none"
    };
  };

  const getScreenNameFeedback = () => {
    if (!screenName) return null;
    if (screenName.length < 3)
      return (
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
          At least 3 characters required
        </p>
      );
    if (!validateScreenName(screenName))
      return (
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#ef4444" }}>
          Only letters, numbers, and underscores allowed
        </p>
      );
    if (screenNameChecking)
      return (
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#f59e0b" }}>
          Checking availability...
        </p>
      );
    if (screenNameAvailable === true)
      return (
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#10b981" }}>
          ✓ Available!
        </p>
      );
    if (screenNameAvailable === false)
      return (
        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#ef4444" }}>
          ✗ Already taken
        </p>
      );
    return null;
  };

  const getInputStyle = () => ({
    width: "100%",
    padding: "16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "16px",
    background: loading ? "#f9fafb" : "#fafafa",
    transition: "all 0.3s ease",
    boxSizing: "border-box",
    outline: "none"
  });

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#007bff";
    e.target.style.background = "white";
    e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#e5e7eb";
    e.target.style.background = "#fafafa";
    e.target.style.boxShadow = "none";
  };

  return (
    <>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            color: "#1a1a1a",
            fontWeight: "600",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            Real Name
          </label>
          <input
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="John Doe"
            required
            disabled={loading}
            style={getInputStyle()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            Your real name (visible to others)
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            color: "#1a1a1a",
            fontWeight: "600",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            Screen Name
          </label>
          <input
            type="text"
            value={screenName}
            onChange={(e) => handleScreenNameChange(e.target.value)}
            placeholder="john_doe_photo"
            required
            disabled={loading}
            style={getScreenNameInputStyle()}
          />
          {getScreenNameFeedback()}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            color: "#1a1a1a",
            fontWeight: "600",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
            style={getInputStyle()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            color: "#1a1a1a",
            fontWeight: "600",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
            style={getInputStyle()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            color: "#1a1a1a",
            fontWeight: "600",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            disabled={loading}
            style={getInputStyle()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        <button
          type="submit"
          disabled={
            loading || screenNameAvailable === false || screenNameChecking
          }
          style={{
            width: "100%",
            padding: "18px",
            background: loading || screenNameAvailable === false || screenNameChecking 
              ? "#9ca3af" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading || screenNameAvailable === false || screenNameChecking 
              ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            marginBottom: "20px"
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: "20px",
          padding: "12px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          fontSize: "14px",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: "20px",
          padding: "12px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          color: "#166534",
          fontSize: "14px",
          textAlign: "center"
        }}>
          Account created successfully! You can now start using Corkt.
        </div>
      )}
    </>
  );
};

export default Signup;
