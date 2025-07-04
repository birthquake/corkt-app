import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useUsersData, useUserSearch } from "./useUserData";

// CodeSandbox-optimized debounce hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
};

// CodeSandbox-optimized users data hook with caching
export const useOptimizedUsersData = (userIds) => {
  const [cache, setCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(new Map());

  // Memoize unique user IDs to prevent unnecessary re-fetches
  const uniqueUserIds = useMemo(() => {
    if (!userIds || userIds.length === 0) return [];
    return [...new Set(userIds)].filter(Boolean);
  }, [userIds?.join(",") || ""]);

  // Identify uncached user IDs
  const uncachedUserIds = useMemo(() => {
    return uniqueUserIds.filter((id) => !cacheRef.current.has(id));
  }, [uniqueUserIds]);

  // Use the existing useUsersData hook for fetching
  const { usersData: fetchedUsers, loading: fetchLoading } =
    useUsersData(uncachedUserIds);

  // Update cache when new data arrives
  useEffect(() => {
    if (fetchedUsers && Object.keys(fetchedUsers).length > 0) {
      // Update both refs for immediate access and state for re-renders
      Object.entries(fetchedUsers).forEach(([userId, userData]) => {
        cacheRef.current.set(userId, userData);
      });

      setCache(new Map(cacheRef.current));
    }
  }, [fetchedUsers]);

  // Memoize final users data object
  const usersData = useMemo(() => {
    const result = {};
    uniqueUserIds.forEach((userId) => {
      const cached = cacheRef.current.get(userId);
      if (cached) {
        result[userId] = cached;
      }
    });
    return result;
  }, [uniqueUserIds, cache]);

  // Memory cleanup for CodeSandbox
  useEffect(() => {
    return () => {
      // Keep cache size reasonable for CodeSandbox
      if (cacheRef.current.size > 100) {
        const entries = Array.from(cacheRef.current.entries());
        const recent = entries.slice(-50); // Keep last 50 entries
        cacheRef.current = new Map(recent);
        setCache(new Map(recent));
      }
    };
  }, []);

  return {
    usersData,
    loading: fetchLoading || loading,
  };
};

// CodeSandbox-optimized user search hook with smart caching
export const useOptimizedUserSearch = (searchQuery) => {
  const [searchCache, setSearchCache] = useState(new Map());
  const searchCacheRef = useRef(new Map());
  const lastQueryRef = useRef("");

  // Debounce search query for CodeSandbox performance
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Use existing user search hook
  const { searchResults, loading, error } = useUserSearch(debouncedQuery);

  // Cache search results to reduce API calls
  useEffect(() => {
    if (debouncedQuery && searchResults.length >= 0) {
      const cacheKey = debouncedQuery.toLowerCase().trim();
      searchCacheRef.current.set(cacheKey, {
        results: searchResults,
        timestamp: Date.now(),
      });
      setSearchCache(new Map(searchCacheRef.current));
      lastQueryRef.current = cacheKey;
    }
  }, [debouncedQuery, searchResults]);

  // Optimized search results with cache fallback
  const optimizedResults = useMemo(() => {
    if (!debouncedQuery || loading) {
      return searchResults;
    }

    const cacheKey = debouncedQuery.toLowerCase().trim();
    const cached = searchCacheRef.current.get(cacheKey);

    // Use cached results if available and recent (within 5 minutes)
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.results;
    }

    return searchResults;
  }, [debouncedQuery, searchResults, loading, searchCache]);

  // Memory management for CodeSandbox
  useEffect(() => {
    const cleanup = () => {
      // Keep cache size manageable
      if (searchCacheRef.current.size > 20) {
        const entries = Array.from(searchCacheRef.current.entries());
        const recent = entries.slice(-10); // Keep last 10 searches
        searchCacheRef.current = new Map(recent);
        setSearchCache(new Map(recent));
      }
    };

    const timer = setTimeout(cleanup, 30000); // Cleanup every 30 seconds
    return () => clearTimeout(timer);
  }, [searchCache]);

  return {
    searchResults: optimizedResults,
    loading,
    error,
  };
};

// Performance monitoring hook for CodeSandbox debugging
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;

    // Log performance metrics in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔍 ${componentName} render #${renderCount.current} (${
          Date.now() - startTime.current
        }ms since mount)`
      );
    }
  });

  const logAction = useCallback(
    (actionName, duration) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`⚡ ${componentName}: ${actionName} took ${duration}ms`);
      }
    },
    [componentName]
  );

  return { logAction, renderCount: renderCount.current };
};

// Memory-efficient image loading hook for CodeSandbox
export const useOptimizedImageLoading = (imageUrls) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const loadingRef = useRef(new Set());

  const preloadImage = useCallback(
    (url) => {
      if (
        !url ||
        loadedImages.has(url) ||
        failedImages.has(url) ||
        loadingRef.current.has(url)
      ) {
        return Promise.resolve();
      }

      loadingRef.current.add(url);

      return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
          loadingRef.current.delete(url);
          setLoadedImages((prev) => new Set([...prev, url]));
          resolve();
        };

        img.onerror = () => {
          loadingRef.current.delete(url);
          setFailedImages((prev) => new Set([...prev, url]));
          resolve();
        };

        // Timeout for CodeSandbox network constraints
        setTimeout(() => {
          if (loadingRef.current.has(url)) {
            loadingRef.current.delete(url);
            setFailedImages((prev) => new Set([...prev, url]));
            resolve();
          }
        }, 10000); // 10 second timeout

        img.src = url;
      });
    },
    [loadedImages, failedImages]
  );

  // Preload images in batches for CodeSandbox
  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    const batchSize = 3; // Small batches for CodeSandbox
    let currentBatch = 0;

    const loadBatch = async () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, imageUrls.length);
      const batch = imageUrls.slice(start, end);

      await Promise.all(batch.map(preloadImage));

      currentBatch++;
      if (end < imageUrls.length) {
        // Small delay between batches for CodeSandbox
        setTimeout(loadBatch, 100);
      }
    };

    loadBatch();
  }, [imageUrls, preloadImage]);

  // Memory cleanup
  useEffect(() => {
    return () => {
      // Clear large sets on unmount
      if (loadedImages.size > 50) {
        setLoadedImages(new Set());
      }
      if (failedImages.size > 20) {
        setFailedImages(new Set());
      }
    };
  }, []);

  return {
    loadedImages,
    failedImages,
    preloadImage,
    isLoaded: (url) => loadedImages.has(url),
    hasFailed: (url) => failedImages.has(url),
  };
};

export default {
  useDebounce,
  useOptimizedUsersData,
  useOptimizedUserSearch,
  usePerformanceMonitor,
  useOptimizedImageLoading,
};
