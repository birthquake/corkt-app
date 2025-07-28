// DiscoveryService.js - Smart content discovery and trending algorithms
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

class DiscoveryService {
  constructor() {
    this.trendingCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = null;
  }

  // Calculate trending score based on engagement velocity
  calculateTrendingScore(photo, likes = [], comments = []) {
    const now = new Date();
    const photoAge = now - (photo.timestamp?.toDate?.() || new Date(photo.timestamp));
    const ageInHours = photoAge / (1000 * 60 * 60);
    
    // Prevent division by zero and set minimum age
    const normalizedAge = Math.max(ageInHours, 0.5);
    
    // Count recent engagement (last 24 hours)
    const recentLikes = likes.filter(like => {
      const likeAge = now - (like.timestamp?.toDate?.() || new Date(like.timestamp));
      return likeAge < 24 * 60 * 60 * 1000; // 24 hours
    }).length;
    
    const recentComments = comments.filter(comment => {
      const commentAge = now - (comment.timestamp?.toDate?.() || new Date(comment.timestamp));
      return commentAge < 24 * 60 * 60 * 1000; // 24 hours
    }).length;
    
    // Weighted engagement score
    const engagementScore = (recentLikes * 1.0) + (recentComments * 2.0);
    
    // Velocity = engagement per hour, with decay for older photos
    const velocity = engagementScore / normalizedAge;
    
    // Apply time decay (newer photos get bonus)
    const timeDecayFactor = Math.exp(-ageInHours / 24); // Decay over 24 hours
    
    // Final trending score
    const trendingScore = velocity * (1 + timeDecayFactor);
    
    return {
      score: trendingScore,
      engagementScore,
      velocity,
      timeDecayFactor,
      ageInHours: normalizedAge,
      recentLikes,
      recentComments
    };
  }

  // Get trending photos with smart caching
  async getTrendingPhotos(options = {}) {
    const {
      limit: resultLimit = 20,
      timeframe = '24h', // '24h', '7d', '30d'
      location = null,
      radius = 25000 // 25km default
    } = options;

    // Check cache first
    const cacheKey = `trending_${timeframe}_${location?.latitude || 'global'}_${resultLimit}`;
    const cached = this.trendingCache.get(cacheKey);
    
    if (cached && (Date.now() - this.lastCacheUpdate) < this.cacheExpiry) {
      console.log('📊 Returning cached trending photos');
      return cached;
    }

    try {
      console.log('📊 Computing fresh trending photos...');
      
      // Get timeframe boundary
      const timeframeBoundary = this.getTimeframeBoundary(timeframe);
      
      // Query photos from the timeframe
      const photosRef = collection(db, "photos");
      let photosQuery = query(
        photosRef,
        where("timestamp", ">=", Timestamp.fromDate(timeframeBoundary)),
        orderBy("timestamp", "desc"),
        limit(100) // Get more photos to analyze
      );

      const photosSnapshot = await getDocs(photosQuery);
      const photos = photosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by location if specified
      const locationFilteredPhotos = location 
        ? this.filterPhotosByLocation(photos, location, radius)
        : photos;

      // Get engagement data for each photo
      const photosWithTrendingScores = await Promise.all(
        locationFilteredPhotos.map(async (photo) => {
          const [likes, comments] = await Promise.all([
            this.getPhotoLikes(photo.id),
            this.getPhotoComments(photo.id)
          ]);

          const trendingData = this.calculateTrendingScore(photo, likes, comments);
          
          return {
            ...photo,
            trending: trendingData,
            totalLikes: likes.length,
            totalComments: comments.length,
            recentActivity: trendingData.recentLikes + trendingData.recentComments
          };
        })
      );

      // Sort by trending score and limit results
      const trendingPhotos = photosWithTrendingScores
        .sort((a, b) => b.trending.score - a.trending.score)
        .slice(0, resultLimit);

      // Cache results
      this.trendingCache.set(cacheKey, trendingPhotos);
      this.lastCacheUpdate = Date.now();

      console.log(`📊 Found ${trendingPhotos.length} trending photos`);
      return trendingPhotos;

    } catch (error) {
      console.error('Error getting trending photos:', error);
      return [];
    }
  }

  // Get photos popular in a specific location
  async getPopularNearby(userLocation, options = {}) {
    const {
      radius = 5000, // 5km default for "nearby"
      limit: resultLimit = 15,
      timeframe = '7d'
    } = options;

    try {
      console.log(`📍 Finding popular photos within ${radius}m of user location...`);
      
      const trendingPhotos = await this.getTrendingPhotos({
        limit: 50, // Get more to filter by location
        timeframe,
        location: userLocation,
        radius
      });

      // Further filter by strict proximity and minimum engagement
      const nearbyPopular = trendingPhotos
        .filter(photo => {
          const hasLocation = photo.latitude && photo.longitude;
          const hasEngagement = photo.totalLikes > 0 || photo.totalComments > 0;
          return hasLocation && hasEngagement;
        })
        .slice(0, resultLimit);

      console.log(`📍 Found ${nearbyPopular.length} popular photos nearby`);
      return nearbyPopular;

    } catch (error) {
      console.error('Error getting popular nearby photos:', error);
      return [];
    }
  }

  // Discover photos from followed users' activity
  async getFollowingActivity(userId, followingList, options = {}) {
    const { limit: resultLimit = 10, timeframe = '24h' } = options;
    
    if (!followingList || followingList.length === 0) {
      return [];
    }

    try {
      const timeframeBoundary = this.getTimeframeBoundary(timeframe);
      
      // Get recent photos from followed users
      const photosRef = collection(db, "photos");
      const recentPhotos = [];

      // Query in batches (Firestore 'in' limit is 10)
      const batches = this.chunkArray(followingList, 10);
      
      for (const batch of batches) {
        const batchQuery = query(
          photosRef,
          where("uid", "in", batch),
          where("timestamp", ">=", Timestamp.fromDate(timeframeBoundary)),
          orderBy("timestamp", "desc"),
          limit(30)
        );
        
        const snapshot = await getDocs(batchQuery);
        const batchPhotos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        recentPhotos.push(...batchPhotos);
      }

      // Sort by timestamp and add engagement data
      const sortedPhotos = recentPhotos
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return bTime - aTime;
        })
        .slice(0, resultLimit);

      return sortedPhotos;

    } catch (error) {
      console.error('Error getting following activity:', error);
      return [];
    }
  }

  // Get photo likes from likes collection
  async getPhotoLikes(photoId) {
    try {
      const likesRef = collection(db, "likes");
      const likesQuery = query(likesRef, where("photoId", "==", photoId));
      const snapshot = await getDocs(likesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting likes for photo ${photoId}:`, error);
      return [];
    }
  }

  // Get photo comments from comments collection (if exists)
  async getPhotoComments(photoId) {
    try {
      const commentsRef = collection(db, "comments");
      const commentsQuery = query(commentsRef, where("photoId", "==", photoId));
      const snapshot = await getDocs(commentsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      // Comments collection might not exist yet
      return [];
    }
  }

  // Filter photos by geographic proximity
  filterPhotosByLocation(photos, userLocation, radiusInMeters) {
    return photos.filter(photo => {
      if (!photo.latitude || !photo.longitude) return false;
      
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        photo.latitude,
        photo.longitude
      );
      
      return distance <= radiusInMeters;
    });
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get timeframe boundary date
  getTimeframeBoundary(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 1 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  // Utility: Split array into chunks
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.trendingCache.clear();
    this.lastCacheUpdate = null;
    console.log('📊 Discovery cache cleared');
  }

  // Get discovery insights for analytics
  getDiscoveryAnalytics() {
    return {
      cacheSize: this.trendingCache.size,
      lastUpdate: this.lastCacheUpdate,
      cacheAge: this.lastCacheUpdate ? Date.now() - this.lastCacheUpdate : null
    };
  }
}

// Create singleton instance
const discoveryService = new DiscoveryService();

export default discoveryService;
