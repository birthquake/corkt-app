import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful for:", email);
      // Clear form
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Login error:", err);
      // Handle specific Firebase auth errors
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email. Please sign up first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled. Please contact support.");
          break;
        default:
          setError(err.message || "An error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
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
            Share your moments
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email Field */}
          <div style={{ marginBottom: "24px" }}>
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
              style={{
                width: "100%",
                padding: "16px",
                border: "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "16px",
                background: loading ? "#f9fafb" : "#fafafa",
                transition: "all 0.3s ease",
                boxSizing: "border-box",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#007bff";
                e.target.style.background = "white";
                e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.background = "#fafafa";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "24px" }}>
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
              style={{
                width: "100%",
                padding: "16px",
                border: "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "16px",
                background: loading ? "#f9fafb" : "#fafafa",
                transition: "all 0.3s ease",
                boxSizing: "border-box",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#007bff";
                e.target.style.background = "white";
                e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.background = "#fafafa";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "18px",
              background: loading ? "#9ca3af" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              marginBottom: "20px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = "#0056b3";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(0,123,255,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = "#007bff";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
          >
            {loading ? "Logging In..." : "Log In"}
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

          {/* Signup Link */}
          <div style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            Don't have an account?{" "}
            <span style={{
              color: "#007bff",
              cursor: "pointer",
              fontWeight: "600"
            }}>
              Sign up
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
      </div>
    </div>
  );
};

export default Login;
