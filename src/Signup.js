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
    let borderColor = "#e9ecef";
    if (screenNameChecking) borderColor = "#ffc107";
    else if (screenNameAvailable === true) borderColor = "#28a745";
    else if (screenNameAvailable === false) borderColor = "#dc3545";

    return {
      width: "100%",
      padding: "10px",
      borderRadius: "5px",
      border: `1px solid ${borderColor}`,
      fontSize: "16px",
      outline: "none",
      transition: "border-color 0.2s ease",
    };
  };

  const getScreenNameFeedback = () => {
    if (!screenName) return null;
    if (screenName.length < 3)
      return (
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6c757d" }}>
          At least 3 characters required
        </p>
      );
    if (!validateScreenName(screenName))
      return (
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#dc3545" }}>
          Only letters, numbers, and underscores allowed
        </p>
      );
    if (screenNameChecking)
      return (
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#ffc107" }}>
          Checking availability...
        </p>
      );
    if (screenNameAvailable === true)
      return (
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#28a745" }}>
          ✓ Available!
        </p>
      );
    if (screenNameAvailable === false)
      return (
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#dc3545" }}>
          ✗ Already taken
        </p>
      );
    return null;
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px" }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="realName"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Real Name:
          </label>
          <input
            id="realName"
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="John Doe"
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
          <p
            style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6c757d" }}
          >
            Your real name (visible to others)
          </p>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="screenName"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Screen Name:
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

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="email"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Email:
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Password:
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="confirmPassword"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Confirm Password:
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={
            loading || screenNameAvailable === false || screenNameChecking
          }
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor:
              loading || screenNameAvailable === false || screenNameChecking
                ? "#ccc"
                : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor:
              loading || screenNameAvailable === false || screenNameChecking
                ? "not-allowed"
                : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "15px", textAlign: "center" }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: "green", marginTop: "15px", textAlign: "center" }}>
          Account created successfully! You can now start using Corkt.
        </p>
      )}
    </div>
  );
};

export default Signup;
