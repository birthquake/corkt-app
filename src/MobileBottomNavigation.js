import React, { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";

// Minimal SVG icon components
const HomeIcon = ({ color = "var(--color-text-muted)", size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const SearchIcon = ({ color = "var(--color-text-muted)", size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

const CameraIcon = ({ color = "#ffffff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const HeartIcon = ({ color = "var(--color-text-muted)", size = 22, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const ProfileIcon = ({ color = "var(--color-text-muted)", size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MobileBottomNavigation = ({ hasNewNotifications = false }) => {
  const location = useLocation();
  const [pressedButton, setPressedButton] = useState(null);

  const isActive = (path) => location.pathname === path;

  // Enhanced touch feedback
  const handleTouchStart = useCallback((buttonId) => {
    setPressedButton(buttonId);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setPressedButton(null), 150);
  }, []);

  const navItems = [
    {
      id: "home",
      path: "/",
      icon: HomeIcon,
      tooltip: "Home",
    },
    {
      id: "search",
      path: "/search",
      icon: SearchIcon,
      tooltip: "Search",
    },
    {
      id: "capture",
      path: "/capture",
      icon: CameraIcon,
      tooltip: "Camera",
      isSpecial: true, // This will be the prominent center button
    },
    {
      id: "activity",
      path: "/activity",
      icon: HeartIcon,
      tooltip: "Activity",
      hasNotification: hasNewNotifications,
    },
    {
      id: "profile",
      path: "/profile",
      icon: ProfileIcon,
      tooltip: "Profile",
    },
  ];

  const getButtonStyle = (item) => {
    const active = isActive(item.path);
    const pressed = pressedButton === item.id;

    if (item.isSpecial) {
      // Special styling for capture button
      return {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        backgroundColor: "var(--color-primary)",
        transform: pressed ? "scale(0.9)" : "scale(1)",
        transition: "all 0.15s ease",
        boxShadow: pressed
          ? "0 2px 8px rgba(0, 0, 0, 0.3)"
          : "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "3px solid var(--color-bg-secondary)",
        marginTop: "-8px", // Lift it slightly above other buttons
      };
    }

    // Regular button styling - cleaner and more minimal
    return {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textDecoration: "none",
      width: "48px",
      height: "48px",
      borderRadius: "12px", // Slightly rounded for modern look
      backgroundColor: active ? "rgba(var(--color-primary-rgb), 0.08)" : "transparent",
      transform: pressed ? "scale(0.9)" : "scale(1)",
      transition: "all 0.15s ease",
    };
  };

  // Detect CodeSandbox environment
  const isCodeSandbox =
    window.location.hostname.includes("csb.app") ||
    window.location.hostname.includes("codesandbox.io") ||
    window.parent !== window; // Also catches iframe environments

  // Additional bottom padding for CodeSandbox
  const extraBottomPadding = isCodeSandbox ? "60px" : "0px";

  return (
    <>
      {/* Background blur for better separation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: `calc(90px + ${extraBottomPadding})`,
          background: "linear-gradient(transparent, var(--color-bg-secondary))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          pointerEvents: "none",
          zIndex: 999,
        }}
      />

      {/* Navigation Bar */}
      <nav
        style={{
          position: "fixed",
          bottom: extraBottomPadding,
          left: 0,
          right: 0,
          backgroundColor: "rgba(var(--color-bg-secondary-rgb), 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid var(--color-border)",
          padding: "12px 0 24px 0",
          zIndex: 1000,
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            maxWidth: "500px",
            margin: "0 auto",
            paddingBottom: "env(safe-area-inset-bottom)", // iOS safe area
          }}
        >
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            // Color logic for each icon
            const getIconColor = () => {
              if (item.isSpecial) return "#ffffff"; // Camera is always white
              return active ? "var(--color-primary)" : "var(--color-text-muted)"; // Active primary, inactive muted
            };

            const iconSize = item.isSpecial ? 24 : 22;

            return (
              <Link
                key={item.id}
                to={item.path}
                title={item.tooltip}
                style={getButtonStyle(item)}
                onTouchStart={() => handleTouchStart(item.id)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(item.id)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
              >
                {/* Notification Badge */}
                {item.hasNotification && (
                  <div
                    style={{
                      position: "absolute",
                      top: item.isSpecial ? "4px" : "8px",
                      right: item.isSpecial ? "4px" : "8px",
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#ff3040",
                      borderRadius: "50%",
                      border: "2px solid var(--color-bg-secondary)",
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}

                {/* Icon */}
                <IconComponent 
                  color={getIconColor()} 
                  size={iconSize}
                  filled={item.id === "activity" && active} // Fill heart when active
                />

                {/* Active Indicator Dot - only for regular buttons */}
                {active && !item.isSpecial && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-6px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "4px",
                      height: "4px",
                      backgroundColor: "var(--color-primary)",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          /* iOS safe area support */
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .mobile-nav {
              padding-bottom: calc(24px + env(safe-area-inset-bottom));
            }
          }

          /* Prevent tap highlight on mobile */
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }

          /* Re-enable text selection for content areas */
          .selectable-text {
            -webkit-user-select: text;
            -khtml-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
        `}
      </style>
    </>
  );
};

export default MobileBottomNavigation;
