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

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "var(--color-primary)";
    e.target.style.background = "var(--color-bg-secondary)";
    e.target.style.boxShadow = "0 0 0 3px rgba(var(--color-primary-rgb), 0.1)";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "var(--color-border)";
    e.target.style.background = "var(--color-bg-tertiary)";
    e.target.style.boxShadow = "none";
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        {/* Email Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            color: "var(--color-text-primary)",
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
              border: "2px solid var(--color-border)",
              borderRadius: "12px",
              fontSize: "16px",
              background: "var(--color-bg-tertiary)",
              color: "var(--color-text-primary)",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
              outline: "none",
              opacity: loading ? 0.6 : 1
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            color: "var(--color-text-primary)",
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
              border: "2px solid var(--color-border)",
              borderRadius: "12px",
              fontSize: "16px",
              background: "var(--color-bg-tertiary)",
              color: "var(--color-text-primary)",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
              outline: "none",
              opacity: loading ? 0.6 : 1
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "18px",
            background: loading ? "var(--color-text-muted)" : "var(--color-primary)",
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
              e.target.style.background = "rgba(var(--color-primary-rgb), 0.85)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.background = "var(--color-primary)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }
          }}
        >
          {loading ? "Logging In..." : "Log In"}
        </button>
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
    </>
  );
};

export default Login;
