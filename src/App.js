import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Signup from "./Signup";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
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
  const [authView, setAuthView] = useState('login'); // 'login', 'signup', 'forgot'

  // Detect CodeSandbox environment for navigation adjustments
  const isCodeSandbox =
    window.location.hostname.includes("csb.app") ||
    window.location.hostname.includes("codesandbox.io") ||
    window.parent !== window;

  // Calculate bottom padding based on environment
  const bottomPadding = isCodeSandbox ? "150px" : "90px";

  // 📊 Admin check for analytics access
  const isAdmin = user?.email === 'corktapp@gmail.com';

  // ✅ PWA Service Worker Registration
  useEffect(() => {
    console.log('🔧 APP: PWA useEffect starting...');
    console.log('🔧 APP: registerServiceWorker type:', typeof registerServiceWorker);
    
    try {
      console.log('🔧 APP: About to call registerServiceWorker...');
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
          backgroundColor: "var(--color-bg-primary)",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--color-text-primary)" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "300",
              marginBottom: "10px",
              color: "var(--color-primary)",
              letterSpacing: "1px",
            }}
          >
            Corkt
          </h1>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
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
            backgroundColor: "var(--color-bg-primary)",
          }}
        >
          <div style={{ textAlign: "center", color: "var(--color-text-primary)" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "300",
                marginBottom: "10px",
                color: "var(--color-primary)",
                letterSpacing: "1px",
              }}
            >
              Corkt
            </h1>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-primary)",
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
              backgroundColor: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
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
                backgroundColor: "var(--color-bg-primary)",
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
          // ✅ Enhanced landing page with app explanation + auth
          <div style={{
            background: "var(--color-bg-primary)",
            minHeight: "100vh",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            {/* Hero Section */}
            <div style={{
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(255, 107, 53, 0.06) 100%)",
              padding: "48px 20px 32px 20px",
              textAlign: "center",
              borderBottom: "1px solid var(--color-border)"
            }}>
              <h1 style={{
                fontSize: "42px",
                color: "var(--color-primary)",
                fontWeight: "700",
                margin: "0 0 8px 0",
                letterSpacing: "1px"
              }}>
                Corkt
              </h1>
              <p style={{
                color: "var(--color-text-primary)",
                fontSize: "18px",
                fontWeight: "500",
                margin: "0 0 8px 0"
              }}>
                Live photo sharing, powered by location
              </p>
              <p style={{
                color: "var(--color-text-muted)",
                fontSize: "14px",
                margin: "0",
                maxWidth: "340px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5"
              }}>
                See and share photos with everyone at the same place in real time — no follows needed, just be there.
              </p>
            </div>

            {/* How It Works Section */}
            <div style={{
              padding: "28px 20px",
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              <h3 style={{
                color: "var(--color-text-primary)",
                fontSize: "15px",
                fontWeight: "600",
                textAlign: "center",
                margin: "0 0 20px 0",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                How It Works
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Feature 1 - Local Feed */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)"
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(34, 197, 94, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      margin: "0 0 4px 0",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "var(--color-text-primary)"
                    }}>
                      Local Feed
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      lineHeight: "1.4"
                    }}>
                      See photos from everyone at your bar, venue, or event right now — perfect for watch parties and live moments.
                    </p>
                  </div>
                </div>

                {/* Feature 2 - Global Feed */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)"
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(6, 182, 212, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      margin: "0 0 4px 0",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "var(--color-text-primary)"
                    }}>
                      Global Feed
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      lineHeight: "1.4"
                    }}>
                      Switch to global and see what people are sharing from watch parties and venues everywhere. One community, every location.
                    </p>
                  </div>
                </div>

                {/* Feature 3 - Hashtags */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)"
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255, 107, 53, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      margin: "0 0 4px 0",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "var(--color-text-primary)"
                    }}>
                      Hashtags & Discovery
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      lineHeight: "1.4"
                    }}>
                      Tag your moments with #AO26, #MatchDay, or anything else — find trending content and connect with your community.
                    </p>
                  </div>
                </div>
              </div>

              {/* No Download Callout */}
              <div style={{
                textAlign: "center",
                padding: "16px 0 8px 0",
                marginTop: "8px"
              }}>
                <p style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Works in your browser — no app download needed
                </p>
              </div>
            </div>

            {/* Screenshot Showcase */}
            <div style={{
              padding: "8px 0 28px 0",
              maxWidth: "100%",
              overflow: "hidden"
            }}>
              <h3 style={{
                color: "var(--color-text-primary)",
                fontSize: "15px",
                fontWeight: "600",
                textAlign: "center",
                margin: "0 0 16px 0",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                See It In Action
              </h3>

              <div style={{
                display: "flex",
                gap: "16px",
                overflowX: "auto",
                padding: "0 20px 12px 20px",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                msOverflowStyle: "none",
                scrollbarWidth: "none"
              }}>
                {/* Screenshot 1 - Local / Bar */}
                <div style={{
                  flexShrink: 0,
                  width: "220px",
                  scrollSnapAlign: "center"
                }}>
                  <div style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "2px solid var(--color-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    backgroundColor: "var(--color-bg-secondary)"
                  }}>
                    <img
                      src="/screenshot-local.jpg"
                      alt="Corkt local feed at a bar"
                      style={{
                        width: "100%",
                        height: "380px",
                        objectFit: "cover",
                        objectPosition: "top",
                        display: "block"
                      }}
                    />
                  </div>
                  <p style={{
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "12px",
                    marginTop: "8px",
                    fontWeight: "500"
                  }}>
                    Live feed at your venue
                  </p>
                </div>

                {/* Screenshot 2 - Global Feed */}
                <div style={{
                  flexShrink: 0,
                  width: "220px",
                  scrollSnapAlign: "center"
                }}>
                  <div style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "2px solid var(--color-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    backgroundColor: "var(--color-bg-secondary)"
                  }}>
                    <img
                      src="/screenshot-global.jpg"
                      alt="Corkt global feed showing posts from different cities"
                      style={{
                        width: "100%",
                        height: "380px",
                        objectFit: "cover",
                        objectPosition: "top",
                        display: "block"
                      }}
                    />
                  </div>
                  <p style={{
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "12px",
                    marginTop: "8px",
                    fontWeight: "500"
                  }}>
                    Global feed from everywhere
                  </p>
                </div>

                {/* Screenshot 3 - Profile */}
                <div style={{
                  flexShrink: 0,
                  width: "220px",
                  scrollSnapAlign: "center"
                }}>
                  <div style={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "2px solid var(--color-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    backgroundColor: "var(--color-bg-secondary)"
                  }}>
                    <img
                      src="/screenshot-profile.jpg"
                      alt="Corkt profile page with photo map"
                      style={{
                        width: "100%",
                        height: "380px",
                        objectFit: "cover",
                        objectPosition: "top",
                        display: "block"
                      }}
                    />
                  </div>
                  <p style={{
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                    fontSize: "12px",
                    marginTop: "8px",
                    fontWeight: "500"
                  }}>
                    Your profile & photo map
                  </p>
                </div>
              </div>
            </div>

            {/* Auth Section */}
            <div style={{
              padding: "0 20px 300px 20px"
            }}>
              <div style={{
                maxWidth: "400px",
                margin: "0 auto"
              }}>
                {/* ✅ Login View */}
                {authView === 'login' && (
                  <div style={{
                    background: "var(--color-bg-secondary)",
                    borderRadius: "20px",
                    padding: "32px 30px",
                    boxShadow: "0 10px 30px rgba(var(--color-primary-rgb), 0.1)"
                  }}>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                      <h2 style={{
                        fontSize: "20px",
                        color: "var(--color-text-primary)",
                        fontWeight: "600",
                        margin: "0 0 4px 0"
                      }}>
                        Welcome back
                      </h2>
                      <p style={{
                        color: "var(--color-text-muted)",
                        fontSize: "14px",
                        margin: "0"
                      }}>
                        Log in to start sharing
                      </p>
                    </div>

                    <Login />

                    <div style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      margin: "24px 0 16px 0"
                    }}>
                      <span 
                        onClick={() => setAuthView('forgot')}
                        style={{
                          color: "var(--color-primary)",
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
                      color: "var(--color-text-muted)",
                      margin: "16px 0",
                      position: "relative"
                    }}>
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "0",
                        right: "0",
                        height: "1px",
                        background: "var(--color-border)"
                      }}></div>
                      <span style={{
                        background: "var(--color-bg-secondary)",
                        padding: "0 16px"
                      }}>
                        or
                      </span>
                    </div>

                    <div style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      fontSize: "14px"
                    }}>
                      Don't have an account?{" "}
                      <span 
                        onClick={() => setAuthView('signup')}
                        style={{
                          color: "var(--color-primary)",
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
                    background: "var(--color-bg-secondary)",
                    borderRadius: "20px",
                    padding: "32px 30px",
                    boxShadow: "0 10px 30px rgba(var(--color-primary-rgb), 0.1)"
                  }}>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                      <h2 style={{
                        fontSize: "20px",
                        color: "var(--color-text-primary)",
                        fontWeight: "600",
                        margin: "0 0 4px 0"
                      }}>
                        Create your account
                      </h2>
                      <p style={{
                        color: "var(--color-text-muted)",
                        fontSize: "14px",
                        margin: "0"
                      }}>
                        Join the feed in seconds
                      </p>
                    </div>

                    <Signup />

                    <div style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      margin: "24px 0",
                      position: "relative"
                    }}>
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "0",
                        right: "0",
                        height: "1px",
                        background: "var(--color-border)"
                      }}></div>
                      <span style={{
                        background: "var(--color-bg-secondary)",
                        padding: "0 16px"
                      }}>
                        or
                      </span>
                    </div>

                    <div style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      fontSize: "14px"
                    }}>
                      Already have an account?{" "}
                      <span 
                        onClick={() => setAuthView('login')}
                        style={{
                          color: "var(--color-primary)",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Log in
                      </span>
                    </div>
                  </div>
                )}

                {/* ✅ Forgot Password View */}
                {authView === 'forgot' && (
                  <div style={{
                    background: "var(--color-bg-secondary)",
                    borderRadius: "20px",
                    padding: "32px 30px",
                    boxShadow: "0 10px 30px rgba(var(--color-primary-rgb), 0.1)"
                  }}>
                    <ForgotPassword 
                      onBackToLogin={() => setAuthView('login')} 
                    />
                  </div>
                )}
              </div>
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

            /* Hide scrollbar on screenshot carousel */
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
      </Router>
    </LoadScript>
  );

  console.log('🔧 APP: App component render completed');
}
