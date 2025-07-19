import React, { useState, useRef, useCallback, useEffect } from "react";

const PullToRefresh = ({
  children,
  onRefresh,
  refreshThreshold = 60,
  maxPullDistance = 100,
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

  // ✅ FIXED: Much less aggressive approach - only set container properties
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only set properties on our container, not the entire document
    container.style.overscrollBehavior = 'none';
    container.style.overscrollBehaviorY = 'none';
    container.style.WebkitOverscrollBehavior = 'none';
    container.style.WebkitOverscrollBehaviorY = 'none';

    // ✅ REMOVED: All the aggressive document.body manipulation
    // No more messing with document.body.style.position = 'fixed'!

    return () => {
      // Clean up only our container
      if (container) {
        container.style.overscrollBehavior = '';
        container.style.overscrollBehaviorY = '';
        container.style.WebkitOverscrollBehavior = '';
        container.style.WebkitOverscrollBehaviorY = '';
      }
    };
  }, []);

  // ✅ Reliable scroll detection
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    
    const scrollTop = container.scrollTop;
    const isAtTop = scrollTop <= 3;
    
    console.log(`📱 Scroll: ${scrollTop}, AtTop: ${isAtTop}`);
    return isAtTop;
  }, []);

  // ✅ Simplified touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) {
      console.log('❌ Touch blocked:', { disabled, isRefreshing });
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      time: Date.now(),
    };

    const isAtTop = checkScrollPosition();
    canPullRef.current = isAtTop;
    
    console.log(`👆 Touch Start: Y=${touch.clientY}, CanPull=${isAtTop}`);
    
    // Reset states
    setPullDistance(0);
    setIsPulling(false);
    setShouldTriggerRefresh(false);
  }, [disabled, isRefreshing, checkScrollPosition]);

  // ✅ FIXED: Less aggressive touch move handling
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
      
      console.log(`👆 Touch Move: deltaY=${deltaY}, canPull=${canPullRef.current}`);

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
          console.log('🎯 Started pulling');
        } else {
          return;
        }
      }

      // ✅ FIXED: Less aggressive prevention - only when actively pulling
      if (deltaY > 20 && canPullRef.current) {
        try {
          e.preventDefault();
          
          if (!isPulling) {
            setIsPulling(true);
            console.log('🎯 Pull state activated');
          }
        } catch (error) {
          console.log('⚠️ preventDefault failed:', error.message);
        }
      }

      // Calculate pull distance
      let calculatedDistance = deltaY * 0.7;
      calculatedDistance = Math.min(calculatedDistance, maxPullDistance);

      setPullDistance(calculatedDistance);
      
      const shouldTrigger = calculatedDistance >= refreshThreshold;
      if (shouldTrigger !== shouldTriggerRefresh) {
        setShouldTriggerRefresh(shouldTrigger);
        
        if (shouldTrigger && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }

      console.log(`📏 Distance: ${calculatedDistance}, Trigger: ${shouldTrigger}`);
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

  // ✅ Enhanced touch end
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    console.log(`👆 Touch End: trigger=${shouldTriggerRefresh}, distance=${pullDistance}`);

    canPullRef.current = false;

    if (shouldTriggerRefresh && pullDistance >= refreshThreshold) {
      console.log('🔄 TRIGGERING REFRESH!');
      
      setIsRefreshing(true);
      setShouldTriggerRefresh(false);

      try {
        if (onRefresh) {
          console.log('📞 Calling onRefresh');
          await onRefresh();
          console.log('✅ Refresh completed');
        }

        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      } catch (error) {
        console.error('❌ Refresh error:', error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
          console.log('🏁 Reset complete');
        }, 300);
      }
    } else {
      console.log('↩️ Snapping back');
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

  // ✅ Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // ✅ Simpler indicator style
  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / refreshThreshold, 1);
    const opacity = Math.min(progress * 2, 1);
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
        // ✅ FIXED: Remove aggressive transform properties
        width: "100%", // Ensure it doesn't overflow
      }}
    >
      {/* ✅ Simplified refresh indicator */}
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
              animation: "pullSpin 1s linear infinite",
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

      {/* ✅ FIXED: Enhanced container with proper width constraints */}
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%", // ✅ FIXED: Ensure proper width
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "none",
          overscrollBehaviorY: "none",
          WebkitOverscrollBehavior: "none",
          WebkitOverscrollBehaviorY: "none",
          touchAction: "pan-y",
          // ✅ REMOVED: Aggressive transform properties
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
          @keyframes pullSpin {
            0% { transform: translateX(-50%) rotate(0deg); }
            100% { transform: translateX(-50%) rotate(360deg); }
          }
          
          /* ✅ REMOVED: Aggressive global overrides that break layout */
        `}
      </style>
    </div>
  );
};

export default PullToRefresh;
