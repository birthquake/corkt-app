import React, { useState } from "react";
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

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [realName, setRealName] = useState(""); // User's actual name
  const [screenName, setScreenName] = useState(""); // Their chosen username/handle
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screenNameChecking, setScreenNameChecking] = useState(false);
  const [screenNameAvailable, setScreenNameAvailable] = useState(null);

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

    // Clear previous timeout
    if (window.screenNameTimeout) {
      clearTimeout(window.screenNameTimeout);
    }

    // Set new timeout
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
      // Double-check screen name availability before creating account
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

      // Create user profile with both names
      const profileRef = doc(collection(db, "users"), user.uid);
      await setDoc(profileRef, {
        email: user.email,
        realName: realName.trim(),
        screenName: screenName.toLowerCase().trim(), // Store lowercase for consistency
        displayScreenName: screenName.trim(), // Store original case for display
        profilePicture: "",
        bio: "",
        createdAt: serverTimestamp(),
        // Search-friendly fields
        searchTerms: [
          realName.toLowerCase().trim(),
          screenName.toLowerCase().trim(),
          ...realName.toLowerCase().split(" "), // Split real name into words
        ].filter((term) => term.length > 0),
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

      // Handle specific Firebase auth errors
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

  const getInputStyle = (hasError = false) => ({
    width: "100%",
    padding: "16px",
    border: `2px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
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
    <div style={{
      minHeight: "100vh",
      background: "#e3f2fd",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "40px 30px",
        boxShadow: "0 10px 30px rgba(0,123,255,0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{
            fontSize: "36px",
            color: "#007bff",
            fontWeight: "700",
            margin: "0 0 8px 0"
          }}>
            Corkt
          </h1>
          <p style={{
            color: "#6b7280",
            fontSize: "16px",
            margin: "0"
          }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSignup}>
          {/* Real Name Field */}
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
              id="realName"
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

          {/* Screen Name Field */}
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
              id="screenName"
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

          {/* Email Field */}
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
              id="email"
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

          {/* Password Field */}
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
              id="password"
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

          {/* Confirm Password Field */}
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
              id="confirmPassword"
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

          {/* Sign Up Button */}
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
            onMouseEnter={(e) => {
              if (!loading && screenNameAvailable !== false && !screenNameChecking) {
                e.target.style.background = "#0056b3";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(0,123,255,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && screenNameAvailable !== false && !screenNameChecking) {
                e.target.style.background = "#007bff";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          {/* Divider */}
          <div style={{
            textAlign: "center",
            color: "#6b7280",
            margin: "24px 0",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "0",
              right: "0",
              height: "1px",
              background: "#e5e7eb"
            }}></div>
            <span style={{
              background: "white",
              padding: "0 16px"
            }}>
              or
            </span>
          </div>

          {/* Login Link */}
          <div style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            Already have an account?{" "}
            <span style={{
              color: "#007bff",
              cursor: "pointer",
              fontWeight: "600"
            }}>
              Log in
            </span>
          </div>
        </form>

        {/* Error Message */}
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

        {/* Success Message */}
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
      </div>
    </div>
  );
};

export default Signup;
