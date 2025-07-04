import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  arrayContains,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Extract hashtags from a text string
 * @param {string} text - Text to parse (e.g., photo caption)
 * @returns {Array} Array of hashtags without # symbol
 */
export const extractHashtags = (text) => {
  if (!text || typeof text !== "string") return [];

  // Regex to find hashtags: # followed by letters, numbers, underscores
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);

  if (!matches) return [];

  // Remove # symbol and convert to lowercase for consistency
  const hashtags = matches.map((tag) => tag.slice(1).toLowerCase());

  // Remove duplicates and return
  return [...new Set(hashtags)];
};

/**
 * Format text with clickable hashtags for display
 * @param {string} text - Text containing hashtags
 * @param {Function} onHashtagClick - Function to call when hashtag is clicked
 * @returns {JSX.Element} Formatted text with clickable hashtags
 */
export const formatTextWithHashtags = (text, onHashtagClick) => {
  if (!text) return "";

  // Split text by hashtags while preserving them
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      const hashtag = part.slice(1); // Remove # symbol
      return (
        <span
          key={index}
          onClick={() => onHashtagClick && onHashtagClick(hashtag)}
          style={{
            color: "#007bff",
            fontWeight: "600",
            cursor: "pointer",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.target.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.target.style.textDecoration = "none";
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

/**
 * Search photos by hashtag
 * @param {string} hashtag - Hashtag to search for (without #)
 * @param {number} limitCount - Maximum number of results (default: 50)
 * @returns {Array} Array of photos containing the hashtag
 */
export const searchPhotosByHashtag = async (hashtag, limitCount = 50) => {
  try {
    console.log(`🔍 Searching for hashtag: #${hashtag}`);

    const photosQuery = query(
      collection(db, "photos"),
      where("hashtags", "array-contains", hashtag.toLowerCase()),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(photosQuery);
    const photos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Found ${photos.length} photos for #${hashtag}`);
    return photos;
  } catch (error) {
    console.error("Error searching photos by hashtag:", error);
    return [];
  }
};

/**
 * Get trending hashtags from recent photos
 * @param {number} daysBack - How many days back to look (default: 7)
 * @param {number} limitCount - Maximum hashtags to return (default: 20)
 * @returns {Array} Array of trending hashtags with counts
 */
export const getTrendingHashtags = async (daysBack = 7, limitCount = 20) => {
  try {
    console.log(`📈 Getting trending hashtags from last ${daysBack} days`);

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);

    // Get recent photos (simplified - in production you'd want a more efficient approach)
    const photosQuery = query(
      collection(db, "photos"),
      orderBy("timestamp", "desc"),
      limit(500) // Look at last 500 photos to find trends
    );

    const snapshot = await getDocs(photosQuery);
    const hashtagCounts = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const photoDate =
        data.timestamp?.toDate?.() || new Date(data.timestamp || 0);

      // Only count hashtags from recent photos
      if (photoDate >= dateThreshold && data.hashtags) {
        data.hashtags.forEach((hashtag) => {
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }
    });

    // Convert to array and sort by count
    const trendingHashtags = Object.entries(hashtagCounts)
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    console.log(`✅ Found ${trendingHashtags.length} trending hashtags`);
    return trendingHashtags;
  } catch (error) {
    console.error("Error getting trending hashtags:", error);
    return [];
  }
};

/**
 * Get hashtag suggestions based on partial input
 * @param {string} partial - Partial hashtag input
 * @param {number} limitCount - Maximum suggestions (default: 10)
 * @returns {Array} Array of suggested hashtags
 */
export const getHashtagSuggestions = async (partial, limitCount = 10) => {
  try {
    if (!partial || partial.length < 2) return [];

    const partialLower = partial.toLowerCase();
    console.log(`💡 Getting hashtag suggestions for: "${partialLower}"`);

    // Get trending hashtags and filter by partial match
    const trending = await getTrendingHashtags(30, 100); // Look back 30 days for suggestions

    const suggestions = trending
      .filter(({ hashtag }) => hashtag.includes(partialLower))
      .slice(0, limitCount)
      .map(({ hashtag, count }) => ({ hashtag, count }));

    console.log(`✅ Found ${suggestions.length} hashtag suggestions`);
    return suggestions;
  } catch (error) {
    console.error("Error getting hashtag suggestions:", error);
    return [];
  }
};

/**
 * Validate hashtag format
 * @param {string} hashtag - Hashtag to validate
 * @returns {boolean} True if valid hashtag format
 */
export const isValidHashtag = (hashtag) => {
  if (!hashtag || typeof hashtag !== "string") return false;

  // Remove # if present
  const cleanTag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;

  // Check format: letters, numbers, underscores only, 1-50 characters
  const hashtagRegex = /^[a-zA-Z0-9_]{1,50}$/;
  return hashtagRegex.test(cleanTag);
};

/**
 * Clean and normalize hashtags for storage
 * @param {Array} hashtags - Array of hashtags to clean
 * @returns {Array} Array of cleaned hashtags
 */
export const cleanHashtags = (hashtags) => {
  if (!Array.isArray(hashtags)) return [];

  return hashtags
    .map((tag) => {
      // Remove # symbol if present and convert to lowercase
      const cleaned = (tag.startsWith("#") ? tag.slice(1) : tag).toLowerCase();
      return cleaned;
    })
    .filter((tag) => isValidHashtag(tag)) // Only keep valid hashtags
    .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
};
