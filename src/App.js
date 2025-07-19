import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import AnalyticsDashboard from "./AnalyticsDashboard";
import MobileBottomNavigation from "./MobileBottomNavigation";
import { LoadScript } from "@react-google-maps/api";

// Define libraries that need to be loaded
const googleMapsLibraries = ["places"];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [showLogin, setShowLogin] = useState(true);

  // Detect CodeSandbox environment for navigation adjustments
  const isCodeSandbox =
    window.location.hostname.includes("csb.app") ||
    window.location.hostname.includes("codesandbox.io") ||
    window.parent !== window;

  // Calculate bottom padding based on environment
  const bottomPadding = isCodeSandbox ? "150px" : "90px";

  // 📊 Admin check for analytics access
  const isAdmin = user?.email === 'corktapp@gmail.com'; // Replace with your actual email

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
        {user ? (
          // Authenticated user - main app
          <div
            style={{
              height: "100vh",
              backgroundColor: "#f8f9fa",
              color: "#343a40",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* 📊 Admin Navigation Bar - Only visible to admins */}
            {isAdmin && (
              <div
                style={{
                  backgroundColor: "#17a2b8",
                  color: "white",
                  padding: "8px 16px",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  zIndex: 1000
                }}
              >
                <span style={{ fontWeight: "500" }}>👨‍💻 Admin Mode</span>
                <div style={{ display: "flex", gap: "16px" }}>
                  <a
                    href="/admin"
                    style={{
                      color: "white",
                      textDecoration: "none",
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: window.location.pathname === "/admin" ? "rgba(255,255,255,0.2)" : "transparent",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (window.location.pathname !== "/admin") {
                        e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (window.location.pathname !== "/admin") {
                        e.target.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    ⚙️ Admin Panel
                  </a>
                  <a
                    href="/analytics"
                    style={{
                      color: "white",
                      textDecoration: "none",
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: window.location.pathname === "/analytics" ? "rgba(255,255,255,0.2)" : "transparent",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (window.location.pathname !== "/analytics") {
                        e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (window.location.pathname !== "/analytics") {
                        e.target.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    📊 Analytics
                  </a>
                  <a
                    href="/"
                    style={{
                      color: "white",
                      textDecoration: "none",
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: "transparent",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    🏠 Back to App
                  </a>
                </div>
              </div>
            )}

            <main
              style={{
                flex: 1,
                paddingBottom: bottomPadding,
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#f8f9fa",
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
                    element={<SearchPage photos={photos} currentUser={user} />}
                  />
                  <Route
                    path="/capture"
                    element={<CaptureComponent user={user} />}
                  />
                  {/* Updated profile route to handle user-specific profiles */}
                  <Route
                    path="/profile/:userId?"
                    element={<ProfilePage currentUser={user} photos={photos} />}
                  />
                  <Route
                    path="/activity"
                    element={<ActivityFeed currentUser={user} />}
                  />
                  <Route
                    path="/admin"
                    element={<AdminPanel currentUser={user} />}
                  />
                  
                  {/* 📊 Analytics Dashboard - Admin Only */}
                  <Route
                    path="/analytics"
                    element={
                      isAdmin ? (
                        <AnalyticsDashboard />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                </Routes>
              </div>
            </main>
            <MobileBottomNavigation isCodeSandbox={isCodeSandbox} />
          </div>
        ) : (
          // iOS-friendly auth section
          <div style={{
            background: "#e3f2fd",
            padding: "20px 20px 300px 20px", // HUGE bottom padding for iOS
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            <div style={{
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              {showLogin ? (
                <div style={{
                  background: "white",
                  borderRadius: "20px",
                  padding: "40px 30px",
                  boxShadow: "0 10px 30px rgba(0,123,255,0.1)"
                }}>
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
                <div style={{
                  background: "white",
                  borderRadius: "20px",
                  padding: "40px 30px",
                  boxShadow: "0 10px 30px rgba(0,123,255,0.1)"
                }}>
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
          </div>
        )}

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            /* iOS WebKit fixes */
            html, body {
              height: auto !important;
              min-height: 100vh !important;
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }

            /* Remove tap highlights */
            * {
              -webkit-tap-highlight-color: transparent;
            }

            /* Smooth transitions */
            a, button {
              transition: all 0.15s ease;
            }

            /* iOS input fixes */
            input {
              -webkit-appearance: none !important;
              border-radius: 12px !important;
            }

            /* Ensure no height constraints on root */
            #root {
              height: auto !important;
              min-height: 100vh !important;
            }
          `}
        </style>
      </Router>
    </LoadScript>
  );
}
