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

  // ✅ MINIMAL: Only set properties on our specific container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only apply to our container - no global styles
    const originalOverscroll = container.style.overscrollBehavior;
    const originalWebkitOverscroll = container.style.WebkitOverscrollBehavior;

    container.style.overscrollBehavior = 'none';
    container.style.WebkitOverscrollBehavior = 'none';

    return () => {
      // Restore original values
      container.style.overscrollBehavior = originalOverscroll;
      container.style.WebkitOverscrollBehavior = originalWebkitOverscroll;
    };
  }, []);

  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    return container.scrollTop <= 5;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;

    const touch = e.touches[0];
    touchStartRef.current = { y: touch.clientY, time: Date.now() };
    canPullRef.current = checkScrollPosition();
    
    setPullDistance(0);
    setIsPulling(false);
    setShouldTriggerRefresh(false);
  }, [disabled, isRefreshing, checkScrollPosition]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (deltaY <= 0) {
        if (isPulling) {
          setPullDistance(0);
          setIsPulling(false);
          setShouldTriggerRefresh(false);
          canPullRef.current = false;
        }
        return;
      }

      if (!canPullRef.current && deltaY > 10) {
        const isAtTop = checkScrollPosition();
        if (isAtTop) {
          canPullRef.current = true;
        } else {
          return;
        }
      }

      if (deltaY > 20 && canPullRef.current) {
        try {
          e.preventDefault();
          if (!isPulling) {
            setIsPulling(true);
          }
        } catch (error) {
          // Ignore preventDefault errors
        }
      }

      let calculatedDistance = deltaY * 0.6;
      calculatedDistance = Math.min(calculatedDistance, maxPullDistance);
      setPullDistance(calculatedDistance);
      
      const shouldTrigger = calculatedDistance >= refreshThreshold;
      if (shouldTrigger !== shouldTriggerRefresh) {
        setShouldTriggerRefresh(shouldTrigger);
        if (shouldTrigger && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    });
  }, [disabled, isRefreshing, isPulling, maxPullDistance, refreshThreshold, shouldTriggerRefresh, checkScrollPosition]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    canPullRef.current = false;

    if (shouldTriggerRefresh && pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      setShouldTriggerRefresh(false);

      try {
        if (onRefresh) {
          await onRefresh();
        }
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }, 300);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
      setShouldTriggerRefresh(false);
    }
  }, [disabled, isRefreshing, shouldTriggerRefresh, pullDistance, refreshThreshold, onRefresh]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const getRefreshIndicatorStyle = () => {
    const progress = Math.min(pullDistance / refreshThreshold, 1);
    const opacity = Math.min(progress * 2, 1);
    const scale = Math.min(0.8 + progress * 0.2, 1);

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
        width: "100%",
        overflow: "hidden",
        maxWidth: "100%", // Prevent overflow
        boxSizing: "border-box", // Include padding/border in width
      }}
    >
      {/* Refresh indicator */}
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
              animation: "refreshSpin 1s linear infinite",
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
              whiteSpace: "nowrap",
            }}
          >
            {isRefreshing ? "Refreshing..." : shouldTriggerRefresh ? "Release" : "Pull down"}
          </div>
        )}
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%",
          maxWidth: "100%", // Prevent overflow
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          boxSizing: "border-box",
          ...getContainerStyle(),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>

      {/* ✅ COMPLETELY CLEAN: Only animation, no global styles */}
      <style>
        {`
          @keyframes refreshSpin {
            0% { transform: translateX(-50%) rotate(0deg); }
            100% { transform: translateX(-50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PullToRefresh;
