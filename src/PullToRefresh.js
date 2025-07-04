import React, { useState, useRef, useCallback, useEffect } from "react";

const PullToRefresh = ({
  children,
  onRefresh,
  refreshThreshold = 60, // ✅ Lower for iOS
  maxPullDistance = 100, // ✅ Lower for iOS
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [shouldTriggerRefresh, setShouldTriggerRefresh] = useState(false);

  const containerRef = useRef(null);
  const touchStartRef = useRef({ y: 0, time: 0 });
  const canPullRef = useRef(false);
  const rafRef = useRef(null);

  // ✅ iOS Safari: Aggressive native pull-to-refresh prevention
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // iOS Safari specific overrides
    const preventNativeRefresh = (e) => {
      // Only prevent if we're handling the pull
      if (canPullRef.current && isPulling) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // iOS Safari: Set multiple properties to prevent native refresh
    container.style.overscrollBehavior = 'none';
    container.style.overscrollBehaviorY = 'none';
    container.style.WebkitOverscrollBehavior = 'none';
    container.style.WebkitOverscrollBehaviorY = 'none';
    
    // iOS Safari: Try to prevent native refresh at document level
    document.addEventListener('touchstart', preventNativeRefresh, { passive: false });
    document.addEventListener('touchmove', preventNativeRefresh, { passive: false });
    document.addEventListener('touchend', preventNativeRefresh, { passive: false });

    // iOS Safari: Prevent page bounce
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('touchstart', preventNativeRefresh);
      document.removeEventListener('touchmove', preventNativeRefresh);
      document.removeEventListener('touchend', preventNativeRefresh);
      
      // Restore body styles
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, [isPulling]);

  // ✅ iOS Safari: More reliable scroll detection
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    
    const scrollTop = container.scrollTop;
    const isAtTop = scrollTop <= 3; // Very small buffer for iOS
    
    console.log(`📱 iOS Safari - Scroll: ${scrollTop}, AtTop: ${isAtTop}`);
    return isAtTop;
  }, []);

  // ✅ iOS Safari: Simplified touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) {
      console.log('❌ iOS Safari - Touch blocked:', { disabled, isRefreshing });
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      time: Date.now(),
    };

    const isAtTop = checkScrollPosition();
    canPullRef.current = isAtTop;
    
    console.log(`👆 iOS Safari - Touch Start: Y=${touch.clientY}, CanPull=${isAtTop}`);
    
    // Reset states
    setPullDistance(0);
    setIsPulling(false);
    setShouldTriggerRefresh(false);
  }, [disabled, isRefreshing, checkScrollPosition]);

  // ✅ iOS Safari: Optimized touch move with RAF
  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing) return;

    // Cancel previous RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Use RAF for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      
      console.log(`👆 iOS Safari - Touch Move: deltaY=${deltaY}, canPull=${canPullRef.current}`);

      // Only handle downward pulls
      if (deltaY <= 0) {
        if (isPulling) {
          setPullDistance(0);
          setIsPulling(false);
          setShouldTriggerRefresh(false);
          canPullRef.current = false;
        }
        return;
      }

      // Check if we can start pulling
      if (!canPullRef.current && deltaY > 5) {
        const isAtTop = checkScrollPosition();
        if (isAtTop) {
          canPullRef.current = true;
          console.log('🎯 iOS Safari - Started pulling');
        } else {
          return;
        }
      }

      // iOS Safari: Aggressive prevention
      if (deltaY > 10 && canPullRef.current) {
        try {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (!isPulling) {
            setIsPulling(true);
            console.log('🎯 iOS Safari - Pull state activated');
          }
        } catch (error) {
          console.log('⚠️ iOS Safari - preventDefault failed:', error.message);
        }
      }

      // Calculate pull distance
      let calculatedDistance = deltaY * 0.7; // More responsive for iOS
      calculatedDistance = Math.min(calculatedDistance, maxPullDistance);

      setPullDistance(calculatedDistance);
      
      const shouldTrigger = calculatedDistance >= refreshThreshold;
      if (shouldTrigger !== shouldTriggerRefresh) {
        setShouldTriggerRefresh(shouldTrigger);
        
        if (shouldTrigger && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }

      console.log(`📏 iOS Safari - Distance: ${calculatedDistance}, Trigger: ${shouldTrigger}`);
    });
  }, [
    disabled,
    isRefreshing,
    isPulling,
    maxPullDistance,
    refreshThreshold,
    shouldTriggerRefresh,
    checkScrollPosition,
  ]);

  // ✅ iOS Safari: Enhanced touch end
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    console.log(`👆 iOS Safari - Touch End: trigger=${shouldTriggerRefresh}, distance=${pullDistance}`);

    canPullRef.current = false;

    if (shouldTriggerRefresh && pullDistance >= refreshThreshold) {
      console.log('🔄 iOS Safari - TRIGGERING REFRESH!');
      
      setIsRefreshing(true);
      setShouldTriggerRefresh(false);

      try {
        if (onRefresh) {
          console.log('📞 iOS Safari - Calling onRefresh');
          await onRefresh();
          console.log('✅ iOS Safari - Refresh completed');
        }

        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      } catch (error) {
        console.error('❌ iOS Safari - Refresh error:', error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
          console.log('🏁 iOS Safari - Reset complete');
        }, 300); // Shorter delay for iOS
      }
    } else {
      console.log('↩️ iOS Safari - Snapping back');
      setPullDistance(0);
      setIsPulling(false);
      setShouldTriggerRefresh(false);
    }
  }, [
    disabled,
    isRefreshing,
    shouldTriggerRefresh,
    pullDistance,
    refreshThreshold,
    onRefresh,
  ]);

  // ✅ iOS Safari: Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // ✅ iOS Safari: Simpler indicator style
  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / refreshThreshold, 1);
    const opacity = Math.min(progress * 2, 1); // Show earlier on iOS
    const scale = Math.min(0.7 + progress * 0.3, 1);

    return {
      transform: `translateY(${Math.max(0, pullDistance - 30)}px) scale(${scale})`,
      opacity,
      transition: isPulling && !isRefreshing ? "none" : "all 0.2s ease",
    };
  };

  const getContainerStyle = () => {
    const translateY = isPulling || isRefreshing ? pullDistance : 0;

    return {
      transform: `translateY(${translateY}px)`,
      transition: isPulling && !isRefreshing ? "none" : "transform 0.2s ease",
    };
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        // iOS Safari: Additional containment
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      {/* ✅ iOS Safari: Simplified refresh indicator */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          ...getRefreshIndicatorStyle(),
        }}
      >
        {isRefreshing ? (
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "2px solid #e9ecef",
              borderTop: "2px solid #007bff",
              borderRadius: "50%",
              animation: "iosSpin 1s linear infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: shouldTriggerRefresh ? "#007bff" : "#f8f9fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: shouldTriggerRefresh ? "white" : "#6c757d",
              border: `2px solid ${shouldTriggerRefresh ? "#007bff" : "#e9ecef"}`,
            }}
          >
            {shouldTriggerRefresh ? "↻" : "↓"}
          </div>
        )}

        {isPulling && (
          <div
            style={{
              fontSize: "11px",
              color: "#6c757d",
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {isRefreshing
              ? "Refreshing..."
              : shouldTriggerRefresh
              ? "Release"
              : "Pull down"}
          </div>
        )}
      </div>

      {/* ✅ iOS Safari: Enhanced container */}
      <div
        ref={containerRef}
        style={{
          height: "100%",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "none",
          overscrollBehaviorY: "none",
          WebkitOverscrollBehavior: "none",
          WebkitOverscrollBehaviorY: "none",
          touchAction: "pan-y",
          WebkitTransform: "translateZ(0)", // Force hardware acceleration
          transform: "translateZ(0)",
          ...getContainerStyle(),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>

      <style>
        {`
          @keyframes iosSpin {
            0% { transform: translateX(-50%) rotate(0deg); }
            100% { transform: translateX(-50%) rotate(360deg); }
          }
          
          /* iOS Safari: Additional overrides */
          html {
            overscroll-behavior: none !important;
            -webkit-overscroll-behavior: none !important;
          }
          
          body {
            overscroll-behavior: none !important;
            -webkit-overscroll-behavior: none !important;
          }
        `}
      </style>
    </div>
  );
};

export default PullToRefresh;