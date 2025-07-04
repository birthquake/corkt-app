import React, { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";

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
      icon: "🏠",
      tooltip: "Home",
      activeIcon: "🏠",
    },
    {
      id: "search",
      path: "/search",
      icon: "🔍",
      tooltip: "Search",
      activeIcon: "🔍",
    },
    {
      id: "capture",
      path: "/capture",
      icon: "📸",
      tooltip: "Camera",
      activeIcon: "📸",
      isSpecial: true, // This will be the prominent center button
    },
    {
      id: "activity",
      path: "/activity",
      icon: "❤️",
      tooltip: "Activity",
      activeIcon: "💖",
      hasNotification: hasNewNotifications,
    },
    {
      id: "profile",
      path: "/profile",
      icon: "👤",
      tooltip: "Profile",
      activeIcon: "👤",
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
        backgroundColor: active ? "#0056b3" : "#007bff",
        transform: pressed ? "scale(0.9)" : "scale(1)",
        transition: "all 0.15s ease",
        boxShadow: pressed
          ? "0 2px 8px rgba(0,123,255,0.4)"
          : "0 4px 12px rgba(0,123,255,0.3)",
        border: "3px solid white",
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
      borderRadius: "50%",
      backgroundColor: active ? "rgba(0,123,255,0.1)" : "transparent",
      color: active ? "#007bff" : "#6c757d",
      transform: pressed ? "scale(0.9)" : "scale(1)",
      transition: "all 0.15s ease",
    };
  };

  const getIconStyle = (item) => {
    const active = isActive(item.path);

    return {
      fontSize: item.isSpecial ? "24px" : "22px",
      color: item.isSpecial ? "white" : active ? "#007bff" : "#6c757d",
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
          background: "linear-gradient(transparent, rgba(248, 249, 250, 0.95))",
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
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          padding: "12px 0 24px 0", // Adjusted padding for icon-only design
          zIndex: 1000,
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center", // Center align since no text labels
            maxWidth: "500px",
            margin: "0 auto",
            paddingBottom: "env(safe-area-inset-bottom)", // iOS safe area
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              title={item.tooltip} // Tooltip for accessibility
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
                    border: "2px solid white",
                    animation: "pulse 2s infinite",
                  }}
                />
              )}

              {/* Icon */}
              <div style={getIconStyle(item)}>
                {isActive(item.path) ? item.activeIcon : item.icon}
              </div>

              {/* Active Indicator Dot - only for regular buttons */}
              {isActive(item.path) && !item.isSpecial && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    backgroundColor: "#007bff",
                    borderRadius: "50%",
                  }}
                />
              )}
            </Link>
          ))}
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
