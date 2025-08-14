// imageOptimization.js - Enhanced for higher quality output

/**
 * Enhanced image optimization with higher quality settings
 * Synced with CaptureComponent resolution improvements
 */

// Device detection for optimization decisions
const getDeviceInfo = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
  const isHighDPI = window.devicePixelRatio > 1.5;
  const hasHighMemory = navigator.deviceMemory > 4; // GB
  
  return { isIOS, isMobile, isHighDPI, hasHighMemory };
};

// ✅ UPDATED: Higher quality configurations aligned with CaptureComponent improvements
export const IMAGE_CONFIGS = {
  profile: { 
    maxWidth: 600, 
    maxHeight: 600, 
    quality: 0.9 
  },
  photo: { 
    maxWidth: 1600,  // ✅ INCREASED from 1200
    maxHeight: 1600, // ✅ INCREASED from 1200
    quality: 0.9     // ✅ INCREASED from 0.8
  },
  photoMobile: {     // ✅ NEW: Separate mobile config
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85    // ✅ INCREASED from 0.7
  },
  thumbnail: { 
    maxWidth: 400,   // ✅ INCREASED from 300
    maxHeight: 400,  // ✅ INCREASED from 300
    quality: 0.8     // ✅ INCREASED from 0.7
  },
  // ✅ NEW: High-end device configuration
  photoHighEnd: {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.95
  }
};

/**
 * ✅ ENHANCED: Smart config selection based on device capabilities
 */
const getOptimalConfig = (configType = 'photo') => {
  const { isMobile, hasHighMemory, isHighDPI } = getDeviceInfo();
  
  if (configType === 'photo') {
    // High-end devices get maximum quality
    if (!isMobile && hasHighMemory && isHighDPI) {
      return IMAGE_CONFIGS.photoHighEnd;
    }
    // Mobile devices get optimized mobile config
    if (isMobile) {
      return IMAGE_CONFIGS.photoMobile;
    }
    // Default to standard photo config
    return IMAGE_CONFIGS.photo;
  }
  
  return IMAGE_CONFIGS[configType] || IMAGE_CONFIGS.photo;
};

/**
 * ✅ ENHANCED: Format detection for modern browsers
 */
const getSupportedFormat = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // Check WebP support
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return { format: 'image/webp', extension: 'webp' };
  }
  
  // Fallback to JPEG
  return { format: 'image/jpeg', extension: 'jpg' };
};

/**
 * ✅ ENHANCED: Optimizes an image with smart quality selection
 */
export const optimizeImage = async (source, configType = 'photo', forceJPEG = false) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      try {
        const config = getOptimalConfig(configType);
        const { format } = forceJPEG ? { format: 'image/jpeg' } : getSupportedFormat();

        // Calculate optimal dimensions
        const { width, height } = calculateOptimalSize(
          img.width,
          img.height,
          config.maxWidth,
          config.maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // ✅ ENHANCED: Better rendering settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // ✅ NEW: High-DPI optimization
        const { isHighDPI } = getDeviceInfo();
        if (isHighDPI && width < config.maxWidth) {
          // Use higher internal resolution for crisp output on high-DPI displays
          const scaleFactor = Math.min(2, config.maxWidth / width);
          canvas.width = width * scaleFactor;
          canvas.height = height * scaleFactor;
          ctx.scale(scaleFactor, scaleFactor);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }

        // Draw optimized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized blob with higher quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(
                `📐 Image optimized: ${img.width}x${img.height} → ${width}x${height}`
              );
              console.log(
                `💾 Size: ${(source.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`
              );
              console.log(`🎨 Quality: ${config.quality}, Format: ${format}`);
              resolve(blob);
            } else {
              reject(new Error("Failed to optimize image"));
            }
          },
          format,
          config.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    // Handle different source types
    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else if (source instanceof HTMLCanvasElement) {
      img.src = source.toDataURL();
    } else {
      reject(new Error("Unsupported source type"));
    }
  });
};

/**
 * ✅ ENHANCED: Better aspect ratio preservation
 */
const calculateOptimalSize = (srcWidth, srcHeight, maxWidth, maxHeight) => {
  const aspectRatio = srcWidth / srcHeight;

  let width = srcWidth;
  let height = srcHeight;

  // Only scale down if source is larger than max
  if (width > maxWidth || height > maxHeight) {
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  // ✅ NEW: Ensure even dimensions for better compression
  return {
    width: Math.round(width / 2) * 2,
    height: Math.round(height / 2) * 2,
  };
};

/**
 * ✅ ENHANCED: Creates multiple image sizes with better quality
 */
export const createResponsiveImages = async (file) => {
  try {
    const { isMobile } = getDeviceInfo();
    
    const [original, thumbnail] = await Promise.all([
      optimizeImage(file, isMobile ? 'photoMobile' : 'photo'),
      optimizeImage(file, 'thumbnail'),
    ]);

    return {
      original,
      thumbnail,
      originalSize: file.size,
      optimizedSize: original.size,
      compressionRatio: (
        ((file.size - original.size) / file.size) * 100
      ).toFixed(1),
    };
  } catch (error) {
    console.error("Error creating responsive images:", error);
    throw error;
  }
};

/**
 * ✅ COMPLETELY UPDATED: Canvas capture optimization aligned with CaptureComponent
 */
export const optimizeCanvasCapture = (canvas, deviceInfo = null) => {
  const { isMobile, hasHighMemory, isIOS } = deviceInfo || getDeviceInfo();
  
  // ✅ UPDATED: Higher quality settings matching CaptureComponent improvements
  let quality, maxSize;
  
  if (!isMobile && hasHighMemory) {
    // Desktop with good specs - maximum quality
    quality = 0.95;
    maxSize = 1600;
  } else if (!isMobile) {
    // Desktop with unknown specs - high quality
    quality = 0.9;
    maxSize = 1600;
  } else if (isMobile && !isIOS) {
    // Android mobile - good quality
    quality = 0.85;
    maxSize = 1200;
  } else {
    // iOS mobile - balanced for compatibility
    quality = 0.8;
    maxSize = 1200;
  }

  console.log(`📸 Canvas capture: ${canvas.width}x${canvas.height}, Quality: ${quality}, Max: ${maxSize}`);

  // Create optimized canvas if original is too large
  if (canvas.width > maxSize || canvas.height > maxSize) {
    const optimizedCanvas = document.createElement("canvas");
    const ctx = optimizedCanvas.getContext("2d");

    const { width, height } = calculateOptimalSize(
      canvas.width,
      canvas.height,
      maxSize,
      maxSize
    );

    optimizedCanvas.width = width;
    optimizedCanvas.height = height;

    // ✅ ENHANCED: Better scaling quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, width, height);

    const result = optimizedCanvas.toDataURL("image/jpeg", quality);
    console.log(`📐 Canvas resized: ${canvas.width}x${canvas.height} → ${width}x${height}`);
    return result;
  }

  const result = canvas.toDataURL("image/jpeg", quality);
  console.log(`📐 Canvas used as-is: ${canvas.width}x${canvas.height}`);
  return result;
};

/**
 * ✅ NEW: Memory-aware quality adjustment
 */
export const getMemoryOptimizedQuality = () => {
  const memory = navigator.deviceMemory || 4; // Default to 4GB if unknown
  
  if (memory >= 8) return 0.95;      // 8GB+ RAM
  if (memory >= 4) return 0.9;       // 4GB+ RAM  
  if (memory >= 2) return 0.85;      // 2GB+ RAM
  return 0.8;                        // <2GB RAM
};

/**
 * ✅ NEW: Batch optimization for multiple images
 */
export const optimizeImageBatch = async (files, configType = 'photo', progressCallback = null) => {
  const results = [];
  const total = files.length;
  
  for (let i = 0; i < files.length; i++) {
    try {
      const optimized = await optimizeImage(files[i], configType);
      results.push({ success: true, original: files[i], optimized });
      
      if (progressCallback) {
        progressCallback(i + 1, total, results[i]);
      }
    } catch (error) {
      results.push({ success: false, original: files[i], error });
    }
  }
  
  return results;
};

/**
 * Progressive image loader for better perceived performance
 */
export const createProgressiveImageLoader = (src, placeholder = null) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Show placeholder immediately if provided
    if (placeholder) {
      resolve({ src: placeholder, isPlaceholder: true });
    }

    img.onload = () => {
      resolve({ src: img.src, isPlaceholder: false });
    };

    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Lazy loading intersection observer
 */
export const createLazyImageObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: "100px",
    threshold: 0.1,
  };

  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

// ✅ NEW: Export device info for use in other components
export { getDeviceInfo };

// Export default optimization function for backward compatibility
export default optimizeImage;
