import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebaseConfig";
import { getAuth } from "firebase/auth";
import LocationPicker from "./LocationPicker";
import { useUserSearch } from "./useUserData";
import { extractHashtags } from "./hashtagService";

// Minimal SVG icon components - matching MobileBottomNavigation style
const BugIcon = ({ color = "#00ff00", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M8 2h8"/>
    <path d="M9 9V1.5a3.5 3.5 0 0 1 7 0V9"/>
    <circle cx="13" cy="11" r="4"/>
    <path d="M18 16.496V17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-.504"/>
    <path d="M13 15.5a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0 0 7z"/>
    <path d="M9 9a5 5 0 0 0 10 0"/>
  </svg>
);

const LocationIcon = ({ color = "var(--color-primary)", size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const AlertTriangleIcon = ({ color = "#ffc107", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CameraIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const RefreshIcon = ({ color = "var(--color-primary)", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const CheckCircleIcon = ({ color = "#28a745", size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const GlobeIcon = ({ color = "var(--color-primary)", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const UsersIcon = ({ color = "var(--color-primary)", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TagIcon = ({ color = "var(--color-primary)", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const XIcon = ({ color = "#dc3545", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CaptureComponent = ({ user }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [uploadedPrivacy, setUploadedPrivacy] = useState("public");
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Location state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [autoLocation, setAutoLocation] = useState(null);

  // Tagging system state
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);

  // 📱 MOBILE DEBUG STATE
  const [debugLog, setDebugLog] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const { searchResults: userSearchResults, loading: userSearchLoading } =
    useUserSearch(showUserSearch ? userSearchQuery : "");

  // Device detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

  // 📱 MOBILE DEBUG HELPER
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { time: timestamp, message, type }]);
  };

  // Component mount effect
  useEffect(() => {
    console.log("🚀 CaptureComponent mounted");
    addDebugLog("🚀 CaptureComponent mounted", 'info');
    startCamera();
    getCurrentLocationAuto();

    return () => {
      console.log("🔴 CaptureComponent unmounting");
      addDebugLog("🔴 CaptureComponent unmounting", 'info');
      stopCamera();
    };
  }, [facingMode]);

  // Auto-detect location
  const getCurrentLocationAuto = () => {
    console.log("📍 Getting location...");
    addDebugLog("📍 Getting location...", 'info');
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLocationLoading(false);
      addDebugLog("❌ Geolocation not supported", 'error');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        console.log("📍 Location found:", location);
        addDebugLog(`📍 Location found: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, 'success');
        setAutoLocation(location);
        setSelectedLocation(location);
        setLocationLoading(false);
        setLocationError(null);
      },
      (error) => {
        console.error("📍 Location error:", error);
        addDebugLog(`📍 Location error: ${error.message}`, 'error');
        setLocationError("Location access denied");
        setLocationLoading(false);
      },
      options
    );
  };

  // Privacy and user search effects
  useEffect(() => {
    setShowUserSearch(privacy === "tagged");
    if (privacy !== "tagged") {
      setTaggedUsers([]);
      setUserSearchQuery("");
    }
  }, [privacy]);

  // Simple camera start
  const startCamera = async () => {
    try {
      setError(null);
      console.log("🟢 Starting camera...");
      addDebugLog("🟢 Starting camera...", 'info');

      let constraints;
      if (isIOS && isSafari) {
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
          },
        };
      } else {
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Stream obtained");
      addDebugLog("✅ Camera stream obtained", 'success');

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        video.playsInline = true;
        video.autoplay = true;
        video.muted = true;

        video.oncanplay = () => {
          console.log("📺 Video can play");
          addDebugLog("📺 Video can play", 'success');
          video
            .play()
            .then(() => {
              console.log("✅ Video playing");
              addDebugLog("✅ Video playing", 'success');
              setCameraActive(true);
            })
            .catch((err) => {
              console.error("❌ Play failed:", err);
              addDebugLog(`❌ Video play failed: ${err.message}`, 'error');
              setError("Failed to start camera preview");
            });
        };

        video.onerror = (e) => {
          console.error("❌ Video error:", e);
          addDebugLog(`❌ Video error: ${e.message || 'Unknown error'}`, 'error');
          setError("Camera display failed");
        };
      }
    } catch (err) {
      console.error("❌ Camera error:", err);
      addDebugLog(`❌ Camera access failed: ${err.message}`, 'error');
      setError("Camera access denied. Please allow camera permissions.");
      setCameraActive(false);
    }
  };

  // Simple camera stop
  const stopCamera = async () => {
    console.log("🔴 Stopping camera...");
    addDebugLog("🔴 Stopping camera...", 'info');

    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        if (track.readyState === "live") {
          track.stop();
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;
      video.src = "";
    }

    setCameraActive(false);
  };

  const flipCamera = () => {
    setFacingMode(facingMode === "user" ? "environment" : "user");
  };

  // Simple photo capture
  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera not ready. Please try again.");
      addDebugLog("❌ Camera not ready for capture", 'error');
      return;
    }

    console.log("📸 Capturing photo...");
    addDebugLog("📸 Capturing photo...", 'info');

    try {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const maxSize = isMobile ? 1200 : 1600;
      const actualSize = Math.min(size, maxSize);

      canvas.width = actualSize;
      canvas.height = actualSize;

      const ctx = canvas.getContext("2d");
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      ctx.drawImage(
        video,
        startX,
        startY,
        size,
        size,
        0,
        0,
        actualSize,
        actualSize
      );
      const imageData = canvas.toDataURL("image/jpeg", isMobile ? 0.8 : 0.9);

      await stopCamera();
      setCapturedImage(imageData);
      setError(null);
      console.log("📸 Photo captured");
      addDebugLog("📸 Photo captured successfully", 'success');
    } catch (err) {
      console.error("❌ Capture error:", err);
      addDebugLog(`❌ Photo capture failed: ${err.message}`, 'error');
      setError("Failed to capture photo");
      await stopCamera();
    }
  };

  const retakePhoto = async () => {
    console.log("🔄 Retaking photo...");
    addDebugLog("🔄 Retaking photo...", 'info');
    setCapturedImage(null);
    setCaption("");
    setPrivacy("public");
    setSelectedLocation(autoLocation);
    setTaggedUsers([]);
    setUserSearchQuery("");
    setError(null);
    setUploadSuccess(false);

    setTimeout(() => {
      startCamera();
    }, 500);
  };

  // Location and user management functions
  const handleLocationSelect = (locationData) => {
    setSelectedLocation(locationData);
    setShowLocationPicker(false);
  };

  const addTaggedUser = (user) => {
    if (!taggedUsers.find((u) => u.id === user.id)) {
      setTaggedUsers((prev) => [...prev, user]);
      setUserSearchQuery("");
    }
  };

  const removeTaggedUser = (userId) => {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handlePrivacyChange = (newPrivacy) => {
    setPrivacy(newPrivacy);
    if (newPrivacy !== "tagged") {
      setTaggedUsers([]);
    }
  };

  // Upload function with hashtag integration
  const uploadPhoto = async () => {
    addDebugLog("🚀 Starting upload process...", 'info');
    
    if (!capturedImage) {
      addDebugLog("❌ No captured image found", 'error');
      return;
    }

    addDebugLog("📍 Checking location...", 'info');
    addDebugLog(`Location state: ${selectedLocation ? 'EXISTS' : 'MISSING'}`, selectedLocation ? 'success' : 'error');
    
    if (selectedLocation) {
      addDebugLog(`Lat: ${selectedLocation.latitude?.toFixed(6) || 'MISSING'}`, selectedLocation.latitude ? 'success' : 'error');
      addDebugLog(`Lng: ${selectedLocation.longitude?.toFixed(6) || 'MISSING'}`, selectedLocation.longitude ? 'success' : 'error');
    }
    
    if (
      !selectedLocation ||
      !selectedLocation.latitude ||
      !selectedLocation.longitude
    ) {
      addDebugLog("❌ Location validation FAILED", 'error');
      setError("Location is required for photo sharing. Please allow location access and try again.");
      return;
    }
    addDebugLog("✅ Location validation PASSED", 'success');

    if (privacy === "tagged" && taggedUsers.length === 0) {
      addDebugLog("❌ Tagged privacy but no users tagged", 'error');
      setError("Please tag at least one user to share with tagged privacy.");
      return;
    }
    addDebugLog(`✅ Privacy validation PASSED (${privacy})`, 'success');

    const hashtags = extractHashtags(caption || "");
    addDebugLog(`🏷️ Extracted hashtags: [${hashtags.join(', ') || 'none'}]`, hashtags.length > 0 ? 'success' : 'info');
    if (hashtags.length > 0) {
      addDebugLog(`Found ${hashtags.length} hashtag(s): ${hashtags.map(tag => '#' + tag).join(', ')}`, 'success');
    }

    setUploading(true);
    setError(null);
    addDebugLog("🔄 Set uploading state to TRUE", 'info');

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      addDebugLog(`👤 User: ${currentUser?.uid ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}`, currentUser?.uid ? 'success' : 'error');

      if (!currentUser) {
        throw new Error("Please log in to share photos");
      }

      const currentPrivacy = privacy;
      setUploadedPrivacy(currentPrivacy);
      addDebugLog(`🔒 Privacy set: ${currentPrivacy}`, 'info');

      const timestamp = Date.now();
      const photoRef = ref(storage, `photos/${currentUser.uid}_${timestamp}`);
      addDebugLog("📁 Storage reference created", 'success');

      let uploadAttempts = 0;
      const maxAttempts = isIOS ? 3 : 2;
      addDebugLog(`⚡ Starting upload (${maxAttempts} max attempts)`, 'info');

      while (uploadAttempts < maxAttempts) {
        try {
          uploadAttempts++;
          addDebugLog(`📤 Upload attempt ${uploadAttempts}/${maxAttempts}`, 'info');
          await uploadString(photoRef, capturedImage, "data_url");
          addDebugLog("✅ File upload SUCCESSFUL", 'success');
          break;
        } catch (uploadError) {
          addDebugLog(`❌ Upload attempt ${uploadAttempts} FAILED: ${uploadError.message}`, 'error');
          if (uploadAttempts >= maxAttempts) {
            throw uploadError;
          }
          addDebugLog("🔄 Retrying in 1 second...", 'info');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      addDebugLog("🔗 Getting download URL...", 'info');
      const downloadURL = await getDownloadURL(photoRef);
      addDebugLog("✅ Download URL obtained", 'success');

      const photoData = {
        uid: currentUser.uid,
        imageUrl: downloadURL,
        caption: caption || null,
        hashtags: hashtags,
        privacy: currentPrivacy,
        timestamp: serverTimestamp(),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        locationAccuracy: selectedLocation.accuracy || null,
        taggedUsers:
          currentPrivacy === "tagged"
            ? taggedUsers.map((user) => ({
                uid: user.id,
                realName: user.realName,
                displayScreenName: user.displayScreenName || user.screenName,
              }))
            : null,
      };

      if (selectedLocation.placeName) {
        photoData.placeName = selectedLocation.placeName;
        photoData.placeAddress = selectedLocation.placeAddress;
        photoData.placeTypes = selectedLocation.placeTypes;
      }

      addDebugLog("📝 Photo data prepared (with hashtags)", 'success');
      addDebugLog("💾 Saving to Firestore...", 'info');

      await addDoc(collection(db, "photos"), photoData);
      addDebugLog("✅ Firestore save SUCCESSFUL!", 'success');

      addDebugLog("🎉 Upload completed - setting success state", 'success');
      setUploadSuccess(true);
      setCapturedImage(null);
      setCaption("");
      setPrivacy("public");
      setSelectedLocation(autoLocation);
      setTaggedUsers([]);

      setTimeout(() => {
        addDebugLog("🔄 Navigating to home...", 'info');
        navigate("/");
      }, 1500);
      
    } catch (error) {
      addDebugLog(`💥 UPLOAD FAILED: ${error.name}`, 'error');
      addDebugLog(`Error message: ${error.message}`, 'error');
      addDebugLog(`Error code: ${error.code || 'No code'}`, 'error');
      
      setError(`Failed to share photo: ${error.message}. Please check your connection and try again.`);
    } finally {
      addDebugLog("🏁 Setting uploading to FALSE", 'info');
      setUploading(false);
    }
  };

  // Upload success screen
  if (uploadSuccess) {
    return (
      <div
        style={{
          position: "relative",
          height: "100%",
          backgroundColor: "var(--color-bg-primary)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid var(--color-border)",
            maxWidth: "300px",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
              animation: "bounce 1s ease-in-out",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CheckCircleIcon color="#28a745" size={64} />
          </div>
          <h2
            style={{
              margin: "0 0 12px 0",
              color: "#28a745",
              fontSize: "24px",
              fontWeight: "600",
            }}
          >
            Photo Shared!
          </h2>
          <p
            style={{
              margin: "0 0 8px 0",
              color: "var(--color-text-muted)",
              fontSize: "16px",
            }}
          >
            Your photo has been added to your feed
          </p>
          <p
            style={{
              margin: "0 0 20px 0",
              color: "var(--color-primary)",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            Privacy:{" "}
            {uploadedPrivacy === "public" ? (
              <>
                <GlobeIcon color="var(--color-primary)" size={16} />
                Public
              </>
            ) : uploadedPrivacy === "friends" ? (
              <>
                <UsersIcon color="var(--color-primary)" size={16} />
                Friends
              </>
            ) : (
              <>
                <TagIcon color="var(--color-primary)" size={16} />
                Tagged
              </>
            )}
          </p>
          <div
            style={{
              width: "100%",
              height: "4px",
              backgroundColor: "var(--color-border)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--color-primary)",
                animation: "progress 1.5s ease-out",
              }}
            />
          </div>
          <p
            style={{
              margin: "12px 0 0 0",
              color: "var(--color-text-muted)",
              fontSize: "14px",
            }}
          >
            Redirecting to feed...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        backgroundColor: "var(--color-bg-primary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 📱 MOBILE DEBUG PANEL */}
      {showDebugPanel && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            left: "10px",
            right: "10px",
            maxHeight: "300px",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            color: "#00ff00",
            padding: "16px",
            borderRadius: "12px",
            zIndex: 3000,
            fontSize: "12px",
            fontFamily: "monospace",
            overflowY: "auto",
            border: "2px solid #333",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: "1px solid #333",
            }}
          >
            <span style={{ color: "#00ff00", fontWeight: "bold" }}>📱 Debug Log</span>
            <button
              onClick={() => {
                setDebugLog([]);
                setShowDebugPanel(false);
              }}
              style={{
                backgroundColor: "#ff0000",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
          <div>
            {debugLog.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "4px",
                  color:
                    log.type === "error"
                      ? "#ff6b6b"
                      : log.type === "success"
                      ? "#51cf66"
                      : "#74c0fc",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ opacity: 0.7 }}>[{log.time}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location error display */}
      {locationError && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "8px",
            padding: "8px 16px",
            margin: "40px 16px 0 16px",
            fontSize: "12px",
            color: "#721c24",
            position: "relative",
            zIndex: 1500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <LocationIcon color="#721c24" size={14} />
          {locationError}
          <button
            onClick={getCurrentLocationAuto}
            style={{
              marginLeft: "8px",
              padding: "2px 6px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Location loading indicator */}
      {!selectedLocation && !locationError && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "8px",
            padding: "8px 16px",
            margin: "40px 16px 0 16px",
            fontSize: "12px",
            color: "#856404",
            position: "relative",
            zIndex: 1500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <LocationIcon color="#856404" size={14} />
          Getting location... (iOS may need permission)
          <button
            onClick={() => {
              alert(
                "Location status: " +
                  (navigator.geolocation ? "Available" : "Not available")
              );
            }}
            style={{
              marginLeft: "8px",
              padding: "2px 6px",
              backgroundColor: "#ffc107",
              color: "black",
              border: "none",
              borderRadius: "4px",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            Test
          </button>
        </div>
      )}

      {/* Camera View */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "20px 20px 10px 20px",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {!capturedImage ? (
          <>
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
                display: "block",
              }}
            />

            {/* Error Overlay */}
            {error && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(220, 53, 69, 0.95)",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
              >
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <AlertTriangleIcon color="#ffffff" size={48} />
                  </div>
                  <h3 style={{ margin: "0 0 16px 0" }}>Camera Error</h3>
                  <p style={{ margin: "0 0 20px 0" }}>{error}</p>
                  <button
                    onClick={startCamera}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "var(--color-primary)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Starting Camera Overlay */}
            {!cameraActive && !error && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 999,
                }}
              >
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <CameraIcon color="#ffffff" size={64} />
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>Starting Camera</h3>
                  <p style={{ margin: "0", opacity: 0.8, fontSize: "14px" }}>
                    Please allow camera access when prompted
                  </p>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "3px solid transparent",
                      borderTop: "3px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      margin: "20px auto 0",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Grid overlay when camera is ready */}
            {cameraActive && !error && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: "2px solid rgba(255,255,255,0.5)",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "33.33%",
                    left: 0,
                    right: 0,
                    height: "1px",
                    backgroundColor: "rgba(255,255,255,0.3)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "66.66%",
                    left: 0,
                    right: 0,
                    height: "1px",
                    backgroundColor: "rgba(255,255,255,0.3)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "33.33%",
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    backgroundColor: "rgba(255,255,255,0.3)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "66.66%",
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    backgroundColor: "rgba(255,255,255,0.3)",
                  }}
                />
              </div>
            )}
          </>
        ) : (
          // Captured Image Preview
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "20px 20px 110px 20px",
          backgroundColor: "var(--color-bg-secondary)",
          borderTop: "1px solid var(--color-border)",
          maxHeight: "50vh",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        {!capturedImage ? (
          // Camera Controls
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={flipCamera}
              disabled={!cameraActive}
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "2px solid var(--color-primary)",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                color: "var(--color-primary)",
                cursor: cameraActive ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cameraActive ? 1 : 0.5,
              }}
            >
              <RefreshIcon color="var(--color-primary)" size={18} />
            </button>

            <button
              onClick={cameraActive ? capturePhoto : startCamera}
              style={{
                backgroundColor: cameraActive ? "var(--color-primary)" : "#28a745",
                border: "4px solid white",
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                cursor: "pointer",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraIcon color="#ffffff" size={24} />
            </button>

            <div style={{ width: "50px" }}></div>
          </div>
        ) : (
          // POST-CAPTURE CONTROLS WITH FULL UI
          <div>
            {/* Caption Input */}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... (use #hashtags)"
              style={{
                width: "100%",
                padding: "16px",
                backgroundColor: "var(--color-bg-tertiary)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                color: "var(--color-text-primary)",
                fontSize: "16px",
                marginBottom: "16px",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />

            {/* ENHANCED LOCATION SECTION */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "var(--color-text-primary)",
                  marginBottom: "8px",
                }}
              >
                <LocationIcon color="var(--color-text-primary)" size={14} />
                Location {selectedLocation ? "✅" : "❌"}
              </label>

              {selectedLocation ? (
                <div
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "8px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <LocationIcon color="var(--color-primary)" size={14} />
                      {selectedLocation.placeName ||
                        (selectedLocation === autoLocation
                          ? "Current Location"
                          : "Selected Location")}
                    </p>
                    {selectedLocation.placeAddress && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {selectedLocation.placeAddress}
                      </p>
                    )}
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {selectedLocation.latitude.toFixed(6)},{" "}
                      {selectedLocation.longitude.toFixed(6)}
                      {selectedLocation.accuracy &&
                        ` (±${Math.round(selectedLocation.accuracy)}m)`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLocationPicker(true)}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "var(--color-primary)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: "4px",
                      marginRight: "8px",
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "#f8d7da",
                    border: "1px solid #f5c6cb",
                    borderRadius: "8px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      color: "#721c24",
                    }}
                  >
                    Location is required to share photos
                  </p>
                  <button
                    onClick={getCurrentLocationAuto}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      margin: "0 auto",
                    }}
                  >
                    <LocationIcon color="#ffffff" size={14} />
                    Get Location
                  </button>
                </div>
              )}
            </div>

            {/* PRIVACY SELECTOR */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "var(--color-text-primary)",
                  marginBottom: "8px",
                }}
              >
                Who can see this photo?
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    value: "public",
                    label: "Public",
                    desc: "Anyone can see",
                    icon: GlobeIcon,
                  },
                  {
                    value: "friends",
                    label: "Friends",
                    desc: "Followers only",
                    icon: UsersIcon,
                  },
                  {
                    value: "tagged",
                    label: "Tagged",
                    desc: "Selected users only",
                    icon: TagIcon,
                  },
                ].map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = privacy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handlePrivacyChange(option.value)}
                      style={{
                        flex: 1,
                        minWidth: "120px",
                        padding: "12px 8px",
                        backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-bg-tertiary)",
                        color: isSelected ? "white" : "var(--color-text-primary)",
                        border: isSelected ? "none" : "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconComponent 
                          color={isSelected ? "white" : "var(--color-primary)"} 
                          size={16} 
                        />
                        {option.label}
                      </div>
                      <div style={{ fontSize: "11px", opacity: 0.8 }}>
                        {option.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* USER TAGGING INTERFACE - Only show when Tagged privacy is selected */}
            {privacy === "tagged" && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--color-text-primary)",
                    marginBottom: "8px",
                  }}
                >
                  <TagIcon color="var(--color-text-primary)" size={14} />
                  Tag Users (required)
                </label>

                {/* Tagged Users Display */}
                {taggedUsers.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      {taggedUsers.map((user) => (
                        <div
                          key={user.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "var(--color-bg-tertiary)",
                            padding: "6px 10px",
                            borderRadius: "16px",
                            fontSize: "14px",
                            border: "1px solid var(--color-primary)",
                          }}
                        >
                          <span style={{ color: "var(--color-primary)", fontWeight: "500" }}>
                            @{user.displayScreenName || user.screenName}
                          </span>
                          <button
                            onClick={() => removeTaggedUser(user.id)}
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "0",
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <XIcon color="#dc3545" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Search Input */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users to tag..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "var(--color-bg-tertiary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      color: "var(--color-text-primary)",
                      fontSize: "14px",
                      outline: "none",
                      transition: "border-color 0.2s ease",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                  />

                  {/* User Search Results */}
                  {userSearchQuery && userSearchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        marginTop: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      {userSearchResults
                        .filter((searchUser) => searchUser.id !== user?.uid)
                        .map((searchUser) => (
                          <div
                            key={searchUser.id}
                            onClick={() => addTaggedUser(searchUser)}
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid var(--color-border)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              transition: "background-color 0.2s ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "var(--color-bg-tertiary)")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "transparent")
                            }
                          >
                            {searchUser.profilePicture ? (
                              <img
                                src={searchUser.profilePicture}
                                alt={searchUser.realName}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: "var(--color-primary)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                {searchUser.realName
                                  ?.charAt(0)
                                  ?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div>
                              <p
                                style={{
                                  margin: "0 0 2px 0",
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "var(--color-text-primary)",
                                }}
                              >
                                {searchUser.realName}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "12px",
                                  color: "var(--color-text-muted)",
                                }}
                              >
                                @
                                {searchUser.displayScreenName ||
                                  searchUser.screenName}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* No results message */}
                  {userSearchQuery &&
                    !userSearchLoading &&
                    userSearchResults.length === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "var(--color-bg-secondary)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          marginTop: "4px",
                          padding: "16px",
                          textAlign: "center",
                          color: "var(--color-text-muted)",
                          fontSize: "14px",
                          zIndex: 1000,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        No users found
                      </div>
                    )}
                </div>

                {/* Validation message */}
                {privacy === "tagged" && taggedUsers.length === 0 && (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "12px",
                      color: "#dc3545",
                    }}
                  >
                    Please tag at least one user to use tagged privacy
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={retakePhoto}
                disabled={uploading}
                style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: uploading ? "var(--color-text-muted)" : "var(--color-text-muted)",
                  border: "none",
                  borderRadius: "12px",
                  color: uploading ? "var(--color-text-muted)" : "white",
                  fontSize: "16px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  transition: "background-color 0.2s ease",
                }}
              >
                Retake
              </button>
              <button
                onClick={uploadPhoto}
                disabled={
                  uploading ||
                  !selectedLocation ||
                  (privacy === "tagged" && taggedUsers.length === 0)
                }
                style={{
                  flex: 2,
                  padding: "16px",
                  backgroundColor:
                    uploading ||
                    !selectedLocation ||
                    (privacy === "tagged" && taggedUsers.length === 0)
                      ? "var(--color-text-muted)"
                      : "var(--color-primary)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "16px",
                  cursor:
                    uploading ||
                    !selectedLocation ||
                    (privacy === "tagged" && taggedUsers.length === 0)
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "500",
                  transition: "background-color 0.2s ease",
                }}
              >
                {uploading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid transparent",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Sharing...
                  </div>
                ) : (
                  "Share"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isVisible={showLocationPicker}
        onLocationSelect={handleLocationSelect}
        onClose={() => setShowLocationPicker(false)}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes bounce {
            0%, 20%, 60%, 100% { transform: translateY(0); }
            40% { transform: translateY(-20px); }
            80% { transform: translateY(-10px); }
          }
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}
      </style>
    </div>
  );
};

export default CaptureComponent;
