import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Signup from "./Signup";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword"; // ✅ New import
import HomeFeed from "./HomeFeed";
import SearchPage from "./SearchPage";
import CaptureComponent from "./CaptureComponent";
import ProfilePage from "./ProfilePage";
import ActivityFeed from "./ActivityFeed";
import AdminPanel from "./AdminPanel";
import AnalyticsDashboard from "./AnalyticsDashboard";
import MobileBottomNavigation from "./MobileBottomNavigation";
import { LoadScript } from "@react-google-maps/api";
import './styles.css';

console.log('🔧 APP: App.js file loading...');

// ✅ PWA Imports with debugging
console.log('🔧 APP: About to import PWA utilities...');
import { registerServiceWorker } from './pwaUtils';
import PWAInstallPrompt from './PWAInstallPrompt';
import IOSInstallPrompt from './IOSInstallPrompt';
console.log('🔧 APP: PWA imports completed');
console.log('🔧 APP: registerServiceWorker function:', typeof registerServiceWorker);

// Define libraries that need to be loaded
const googleMapsLibraries = ["places", "visualization"];

export default function App() {
  console.log('🔧 APP: App component function called');
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  // ✅ Updated: Replace showLogin boolean with authView string for 3 states
  const [authView, setAuthView] = useState('login'); // 'login', 'signup', 'forgot'

  // Detect CodeSandbox environment for navigation adjustments
  const isCodeSandbox =
    window.location.hostname.includes("csb.app") ||
    window.location.hostname.includes("codesandbox.io") ||
    window.parent !== window;

  // Calculate bottom padding based on environment
  const bottomPadding = isCodeSandbox ? "150px" : "90px";

  // 📊 Admin check for analytics access
  const isAdmin = user?.email === 'corktapp@gmail.com'; // Replace with your actual email

  // ✅ PWA Service Worker Registration with Enhanced Debugging
  useEffect(() => {
    console.log('🔧 APP: PWA useEffect starting...');
    console.log('🔧 APP: registerServiceWorker type:', typeof registerServiceWorker);
    
    try {
      console.log('🔧 APP: About to call registerServiceWorker...');
      // Register service worker for PWA functionality
      registerServiceWorker();
      console.log('🔧 APP: registerServiceWorker called successfully');
    } catch (error) {
      console.error('❌ APP: Error calling registerServiceWorker:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🔧 APP: Firebase auth useEffect starting...');
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log('🔧 APP: User logged in:', currentUser.email);
        setUser(currentUser);
      } else {
        console.log('🔧 APP: No user logged in');
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time photo updates for the feed
  useEffect(() => {
    if (user) {
      console.log('🔧 APP: Setting up photos listener...');
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

        console.log('🔧 APP: Photos updated, count:', sortedPhotos.length);
        setPhotos(sortedPhotos);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Hide loading screen when app is ready
  useEffect(() => {
    if (!authLoading) {
      console.log('🔧 APP: Auth loading complete, hiding loading screen...');
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

  console.log('🔧 APP: App component rendering, authLoading:', authLoading);

  if (authLoading) {
    console.log('🔧 APP: Showing loading screen...');
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

  console.log('🔧 APP: Rendering main app...');
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
          // ✅ Updated: Enhanced authentication section with password recovery
          <div style={{
            background: "#e3f2fd",
            padding: "20px 20px 300px 20px", // HUGE bottom padding for iOS
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            <div style={{
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              {/* ✅ Login View */}
              {authView === 'login' && (
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

                  {/* ✅ Updated: Navigation section with forgot password */}
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    margin: "24px 0 16px 0"
                  }}>
                    <span 
                      onClick={() => setAuthView('forgot')}
                      style={{
                        color: "#007bff",
                        cursor: "pointer",
                        fontSize: "14px",
                        textDecoration: "underline"
                      }}
                    >
                      Forgot your password?
                    </span>
                  </div>

                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    margin: "16px 0",
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
                      onClick={() => setAuthView('signup')}
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
              )}

              {/* ✅ Signup View */}
              {authView === 'signup' && (
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
                      onClick={() => setAuthView('login')}
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

              {/* ✅ New: Forgot Password View */}
              {authView === 'forgot' && (
                <div style={{
                  background: "white",
                  borderRadius: "20px",
                  padding: "40px 30px",
                  boxShadow: "0 10px 30px rgba(0,123,255,0.1)"
                }}>
                  <ForgotPassword 
                    onBackToLogin={() => setAuthView('login')} 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ PWA Install Prompt Components */}
        <PWAInstallPrompt currentUser={user} />
        <IOSInstallPrompt />

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

  console.log('🔧 APP: App component render completed');
}
