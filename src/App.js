import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Signup from "./Signup";
import Login from "./Login";
import HomeFeed from "./HomeFeed";
import SearchPage from "./SearchPage";
import CaptureComponent from "./CaptureComponent";
import ProfilePage from "./ProfilePage";
import ActivityFeed from "./ActivityFeed";
import AdminPanel from "./AdminPanel";
import MobileBottomNavigation from "./MobileBottomNavigation";
import { LoadScript } from "@react-google-maps/api";

// Define libraries that need to be loaded
const googleMapsLibraries = ["places"];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [showLogin, setShowLogin] = useState(true); // NEW: State to toggle between login/signup

  // Detect CodeSandbox environment for navigation adjustments
  const isCodeSandbox =
    window.location.hostname.includes("csb.app") ||
    window.location.hostname.includes("codesandbox.io") ||
    window.parent !== window;

  // Calculate bottom padding based on environment
  const bottomPadding = isCodeSandbox ? "150px" : "90px"; // Extra 60px for CodeSandbox

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time photo updates for the feed
  useEffect(() => {
    if (user) {
      const photosRef = collection(db, "photos");
      const unsubscribe = onSnapshot(photosRef, (snapshot) => {
        const allPhotos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by timestamp (newest first)
        const sortedPhotos = allPhotos.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return bTime - aTime;
        });

        setPhotos(sortedPhotos);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Hide loading screen when app is ready
  useEffect(() => {
    if (!authLoading) {
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        loadingScreen.style.opacity = "0";
        setTimeout(() => {
          loadingScreen.style.display = "none";
          document.body.classList.add("app-loaded");
        }, 300);
      }
    }
  }, [authLoading]);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", color: "#343a40" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "300",
              marginBottom: "10px",
              color: "#007bff",
              letterSpacing: "1px",
            }}
          >
            Corkt
          </h1>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid #e9ecef",
              borderTop: "3px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "20px auto",
            }}
          />
          <p style={{ fontSize: "16px", opacity: 0.7, margin: 0 }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const googleMapsApiKey = "AIzaSyA868vL4wcDalIHwajFXLgTACs87w7apRE";

  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={googleMapsLibraries}
      loadingElement={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div style={{ textAlign: "center", color: "#343a40" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "300",
                marginBottom: "10px",
                color: "#007bff",
                letterSpacing: "1px",
              }}
            >
              Corkt
            </h1>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #e9ecef",
                borderTop: "3px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "20px auto",
              }}
            />
            <p style={{ fontSize: "16px", opacity: 0.7, margin: 0 }}>
              Loading Maps...
            </p>
          </div>
        </div>
      }
    >
      <Router>
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#f8f9fa",
            color: "#343a40",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: "flex",
            flexDirection: "column"
          }}
        >
          {user ? (
            <>
              {/* Main content area - dynamic padding for CodeSandbox */}
              <main
                style={{
                  flex: 1,
                  paddingBottom: bottomPadding, // Dynamic padding based on environment
                  overflow: "hidden",
                  position: "relative",
                  backgroundColor: "#f8f9fa", // Ensure solid background
                }}
              >
                <div
                  style={{
                    height: "100%",
                    overflow: "auto",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}
                >
                  <Routes>
                    <Route
                      path="/"
                      element={<HomeFeed photos={photos} currentUser={user} />}
                    />
                    <Route
                      path="/search"
                      element={
                        <SearchPage photos={photos} currentUser={user} />
                      }
                    />
                    <Route
                      path="/capture"
                      element={<CaptureComponent user={user} />}
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProfilePage currentUser={user} photos={photos} />
                      }
                    />
                    <Route
                      path="/activity"
                      element={<ActivityFeed currentUser={user} />}
                    />
                    <Route
                      path="/admin"
                      element={<AdminPanel currentUser={user} />}
                    />
                  </Routes>
                </div>
              </main>

              {/* Mobile-optimized bottom navigation with CodeSandbox detection */}
              <MobileBottomNavigation isCodeSandbox={isCodeSandbox} />
            </>
          ) : (
            // NEW: Authentication screens - show only one at a time
            <div
              className="auth-container"
              style={{
                minHeight: "100vh",
                height: "auto",
                background: "#e3f2fd",
                padding: "20px",
                paddingBottom: "40px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              }}
            >
              {showLogin ? (
                // Show Login component with working switch link
                <div 
                  className="auth-card"
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    padding: "40px 30px",
                    boxShadow: "0 10px 30px rgba(0,123,255,0.1)",
                    width: "100%",
                    maxWidth: "400px",
                    margin: "20px auto",
                    minHeight: "auto"
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

                  <Login />

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

                  {/* Switch to Signup */}
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "14px"
                  }}>
                    Don't have an account?{" "}
                    <span 
                      onClick={() => setShowLogin(false)}
                      style={{
                        color: "#007bff",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Sign up
                    </span>
                  </div>
                </div>
              ) : (
                // Show Signup component with working switch link
                <div 
                  className="auth-card"
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    padding: "40px 30px",
                    boxShadow: "0 10px 30px rgba(0,123,255,0.1)",
                    width: "100%",
                    maxWidth: "400px",
                    margin: "20px auto",
                    minHeight: "auto"
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

                  <Signup />

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

                  {/* Switch to Login */}
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "14px"
                  }}>
                    Already have an account?{" "}
                    <span 
                      onClick={() => setShowLogin(true)}
                      style={{
                        color: "#007bff",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Log in
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global mobile optimizations */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            /* Mobile-specific touch optimizations */
            * {
              -webkit-tap-highlight-color: transparent;
            }

            /* Smooth transitions for mobile */
            a, button {
              transition: all 0.15s ease;
            }

            /* Better mobile scrolling */
            .mobile-scroll {
              -webkit-overflow-scrolling: touch;
              overscroll-behavior: contain;
            }

            /* iOS Safari specific fixes */
            @supports (-webkit-touch-callout: none) {
              .ios-fix {
                -webkit-appearance: none;
                border-radius: 0;
              }
            }

            /* Mobile login fixes */
            @media (max-height: 600px) {
              /* For shorter screens like landscape mobile */
              .login-container {
                padding-top: 10px !important;
                padding-bottom: 10px !important;
              }
            }

            /* Fix for signup form scrolling */
            @media (max-height: 800px) {
              .auth-container {
                padding: 10px !important;
                padding-bottom: 60px !important;
              }
              .auth-card {
                margin: 10px auto !important;
                padding: 20px !important;
              }
            }

            /* Ensure body can scroll for auth pages */
            body {
              overflow-y: auto !important;
            }

            /* Mobile auth page fixes */
            @media (max-width: 480px) {
              .auth-container {
                padding: 10px !important;
                padding-bottom: 50px !important;
              }
              .auth-card {
                padding: 20px 15px !important;
                margin: 10px auto !important;
              }
            }
          `}
        </style>
      </Router>
    </LoadScript>
  );
}
