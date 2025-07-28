// FollowSuggestionsService.js - Intelligent follow recommendation engine
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

class FollowSuggestionsService {
  constructor() {
    this.suggestionsCache = new Map();
    this.followingCache = new Map(); // Cache for following lists
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    this.followingCacheExpiry = 5 * 60 * 1000; // 5 minutes for following lists
    this.lastCacheUpdate = new Map();
    this.lastFollowingCacheUpdate = new Map();
  }

  // Main function to get personalized follow suggestions
  async getFollowSuggestions(userId, options = {}) {
    const {
      limit: resultLimit = 10,
      includeLocationBased = true,
      includeMutualFriends = true,
      includeActivityBased = true,
      userLocation = null
    } = options;

    // Check cache first
    const cacheKey = `suggestions_${userId}`;
    const cached = this.suggestionsCache.get(cacheKey);
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    
    if (cached && lastUpdate && (Date.now() - lastUpdate) < this.cacheExpiry) {
      console.log('🤝 Returning cached follow suggestions');
      return cached.slice(0, resultLimit);
    }

    try {
      console.log('🤝 Computing fresh follow suggestions for user:', userId);
      
      // Get user's current following list and basic info
      const [userFollowing, userProfile, userPhotos] = await Promise.all([
        this.getUserFollowing(userId),
        this.getUserProfile(userId),
        this.getUserRecentPhotos(userId, 50)
      ]);

      console.log(`User ${userId} is currently following ${userFollowing.length} people`);

      // Get all potential suggestions with scores
      const suggestions = await this.generateSuggestionCandidates(
        userId,
        userFollowing,
        userProfile,
        userPhotos,
        userLocation,
        {
          includeLocationBased,
          includeMutualFriends,
          includeActivityBased
        }
      );

      // Sort by score and limit
      const rankedSuggestions = suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(resultLimit * 2, 50)); // Get extra for diversity

      // Add diversity and final filtering
      const diverseSuggestions = this.addDiversityToSuggestions(rankedSuggestions, resultLimit);

      // Cache results
      this.suggestionsCache.set(cacheKey, diverseSuggestions);
      this.lastCacheUpdate.set(cacheKey, Date.now());

      console.log(`🤝 Generated ${diverseSuggestions.length} follow suggestions`);
      return diverseSuggestions;

    } catch (error) {
      console.error('Error generating follow suggestions:', error);
      return [];
    }
  }

  // Generate candidate suggestions with scoring
  async generateSuggestionCandidates(userId, userFollowing, userProfile, userPhotos, userLocation, options) {
    const candidates = new Map(); // userId -> suggestion object
    
    // 1. Location-based suggestions
    if (options.includeLocationBased && userLocation) {
      const locationSuggestions = await this.getLocationBasedSuggestions(
        userId,
        userFollowing,
        userLocation,
        userPhotos
      );
      
      locationSuggestions.forEach(suggestion => {
        this.addOrMergeSuggestion(candidates, suggestion);
      });
    }

    // 2. Mutual friends suggestions
    if (options.includeMutualFriends && userFollowing.length > 0) {
      const mutualSuggestions = await this.getMutualFriendsBasedSuggestions(
        userId,
        userFollowing
      );
      
      mutualSuggestions.forEach(suggestion => {
        this.addOrMergeSuggestion(candidates, suggestion);
      });
    }

    // 3. Activity-based suggestions (users who interact with similar content)
    if (options.includeActivityBased) {
      const activitySuggestions = await this.getActivityBasedSuggestions(
        userId,
        userPhotos,
        userProfile
      );
      
      activitySuggestions.forEach(suggestion => {
        this.addOrMergeSuggestion(candidates, suggestion);
      });
    }

    // 4. Popular users in user's areas of interest
    const popularSuggestions = await this.getPopularUserSuggestions(
      userId,
      userFollowing,
      userLocation,
      userPhotos
    );
    
    popularSuggestions.forEach(suggestion => {
      this.addOrMergeSuggestion(candidates, suggestion);
    });

    // Final filter to ensure no already-followed users slip through
    const finalCandidates = [];
    for (const candidate of Array.from(candidates.values())) {
      if (!userFollowing.includes(candidate.userId) && candidate.userId !== userId) {
        finalCandidates.push(candidate);
      } else {
        console.log(`Filtered out already-followed user or self: ${candidate.userId}`);
      }
    }

    return finalCandidates;
  }

  // Location-based suggestions: users who post near the user
  async getLocationBasedSuggestions(userId, userFollowing, userLocation, userPhotos) {
    const suggestions = [];
    const radius = 10000; // 10km radius
    
    try {
      // Get recent photos near user's location or where user has posted
      const searchLocations = [userLocation];
      
      // Add locations where user has posted photos
      userPhotos.forEach(photo => {
        if (photo.latitude && photo.longitude) {
          searchLocations.push({
            latitude: photo.latitude,
            longitude: photo.longitude
          });
        }
      });

      // For each location, find users who have posted nearby
      for (const location of searchLocations.slice(0, 5)) { // Limit to 5 locations
        const nearbyPhotos = await this.getPhotosNearLocation(location, radius, 100);
        
        // Count posts per user in this location
        const userPostCounts = {};
        nearbyPhotos.forEach(photo => {
          if (photo.uid && photo.uid !== userId && !userFollowing.includes(photo.uid)) {
            userPostCounts[photo.uid] = (userPostCounts[photo.uid] || 0) + 1;
          }
        });

        // Create suggestions for active users in this location
        Object.entries(userPostCounts).forEach(([suggestedUserId, postCount]) => {
          if (postCount >= 2) { // At least 2 posts in this area
            const distance = this.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              location.latitude,
              location.longitude
            );
            
            const locationScore = this.calculateLocationScore(postCount, distance);
            
            suggestions.push({
              userId: suggestedUserId,
              score: locationScore,
              reasons: [`${postCount} posts near you`],
              type: 'location',
              metadata: {
                postsInArea: postCount,
                distance: Math.round(distance),
                location: location
              }
            });
          }
        });
      }

      return suggestions;

    } catch (error) {
      console.error('Error getting location-based suggestions:', error);
      return [];
    }
  }

  // Mutual friends suggestions: friends of friends
  async getMutualFriendsBasedSuggestions(userId, userFollowing) {
    const suggestions = [];
    
    try {
      // For each user the person follows, get who THEY follow
      const mutualCounts = {};
      
      // Process in batches to avoid overwhelming Firestore
      const batches = this.chunkArray(userFollowing, 5);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (followedUserId) => {
          const theirFollowing = await this.getUserFollowing(followedUserId);
          
          theirFollowing.forEach(theirFollowedUser => {
            // Don't suggest people we already follow or ourselves
            if (theirFollowedUser !== userId && !userFollowing.includes(theirFollowedUser)) {
              mutualCounts[theirFollowedUser] = (mutualCounts[theirFollowedUser] || 0) + 1;
            }
          });
        });
        
        await Promise.all(batchPromises);
      }

      // Create suggestions for users with mutual connections
      Object.entries(mutualCounts).forEach(([suggestedUserId, mutualCount]) => {
        if (mutualCount >= 2) { // At least 2 mutual connections
          const mutualScore = this.calculateMutualFriendsScore(mutualCount);
          
          suggestions.push({
            userId: suggestedUserId,
            score: mutualScore,
            reasons: [`${mutualCount} mutual connections`],
            type: 'mutual',
            metadata: {
              mutualConnections: mutualCount
            }
          });
        }
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting mutual friends suggestions:', error);
      return [];
    }
  }

  // Activity-based suggestions: users who interact with similar content
  async getActivityBasedSuggestions(userId, userPhotos, userProfile) {
    const suggestions = [];
    
    try {
      // Get users who have liked the current user's photos
      const userInteractions = {};
      
      for (const photo of userPhotos.slice(0, 20)) { // Check last 20 photos
        const likes = await this.getPhotoLikes(photo.id);
        
        likes.forEach(like => {
          if (like.userId && like.userId !== userId) {
            userInteractions[like.userId] = (userInteractions[like.userId] || 0) + 1;
          }
        });
      }

      // Create suggestions for users who frequently interact
      Object.entries(userInteractions).forEach(([suggestedUserId, interactionCount]) => {
        if (interactionCount >= 3) { // At least 3 interactions
          const activityScore = this.calculateActivityScore(interactionCount);
          
          suggestions.push({
            userId: suggestedUserId,
            score: activityScore,
            reasons: [`Liked ${interactionCount} of your photos`],
            type: 'activity',
            metadata: {
              interactions: interactionCount
            }
          });
        }
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting activity-based suggestions:', error);
      return [];
    }
  }

  // Popular users suggestions: trending creators in user's area
  async getPopularUserSuggestions(userId, userFollowing, userLocation, userPhotos) {
    const suggestions = [];
    
    try {
      // Get users with high recent engagement
      const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last week
      
      const photosRef = collection(db, "photos");
      const recentPhotosQuery = query(
        photosRef,
        where("timestamp", ">=", recentDate),
        orderBy("timestamp", "desc"),
        limit(200)
      );
      
      const recentPhotos = await getDocs(recentPhotosQuery);
      const userEngagement = {};
      
      // Calculate engagement for each user
      for (const doc of recentPhotos.docs) {
        const photo = { id: doc.id, ...doc.data() };
        
        if (photo.uid && photo.uid !== userId && !userFollowing.includes(photo.uid)) {
          const likes = await this.getPhotoLikes(photo.id);
          const engagementScore = likes.length * 1.0; // Simple engagement scoring
          
          userEngagement[photo.uid] = (userEngagement[photo.uid] || 0) + engagementScore;
        }
      }

      // Sort by engagement and create suggestions
      const topUsers = Object.entries(userEngagement)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      topUsers.forEach(([suggestedUserId, engagement]) => {
        if (engagement >= 5) { // Minimum engagement threshold
          const popularityScore = this.calculatePopularityScore(engagement);
          
          suggestions.push({
            userId: suggestedUserId,
            score: popularityScore,
            reasons: ['Popular creator'],
            type: 'popular',
            metadata: {
              recentEngagement: Math.round(engagement)
            }
          });
        }
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting popular user suggestions:', error);
      return [];
    }
  }

  // Utility functions
  addOrMergeSuggestion(candidates, newSuggestion) {
    const existing = candidates.get(newSuggestion.userId);
    
    if (existing) {
      // Merge suggestions - combine scores and reasons
      existing.score = Math.max(existing.score, newSuggestion.score) + (newSuggestion.score * 0.3);
      existing.reasons = [...existing.reasons, ...newSuggestion.reasons];
      existing.types = [...(existing.types || [existing.type]), newSuggestion.type];
    } else {
      candidates.set(newSuggestion.userId, newSuggestion);
    }
  }

  addDiversityToSuggestions(suggestions, limit) {
    const diverse = [];
    const typeCount = {};
    
    for (const suggestion of suggestions) {
      const type = suggestion.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
      
      // Limit each type to maintain diversity
      if (typeCount[type] <= Math.ceil(limit / 3) || diverse.length < limit) {
        diverse.push(suggestion);
        
        if (diverse.length >= limit) break;
      }
    }
    
    return diverse;
  }

  // Scoring functions
  calculateLocationScore(postCount, distance) {
    const postScore = Math.min(postCount * 10, 50); // Max 50 points for posts
    const distanceScore = Math.max(50 - (distance / 200), 10); // Closer = higher score
    return postScore + distanceScore;
  }

  calculateMutualFriendsScore(mutualCount) {
    return Math.min(mutualCount * 15, 80); // Max 80 points for mutual friends
  }

  calculateActivityScore(interactionCount) {
    return Math.min(interactionCount * 8, 60); // Max 60 points for activity
  }

  calculatePopularityScore(engagement) {
    return Math.min(engagement * 2, 40); // Max 40 points for popularity
  }

  // Data fetching helpers with improved caching
  async getUserFollowing(userId) {
    try {
      // Check cache first
      const cacheKey = `following_${userId}`;
      const cached = this.followingCache.get(cacheKey);
      const lastUpdate = this.lastFollowingCacheUpdate.get(cacheKey);
      
      if (cached && lastUpdate && (Date.now() - lastUpdate) < this.followingCacheExpiry) {
        return cached;
      }

      const followingRef = collection(db, "follows");
      const followingQuery = query(followingRef, where("followerId", "==", userId));
      const snapshot = await getDocs(followingQuery);
      
      const following = snapshot.docs.map(doc => doc.data().followingId);
      
      // Cache the result
      this.followingCache.set(cacheKey, following);
      this.lastFollowingCacheUpdate.set(cacheKey, Date.now());
      
      console.log(`User ${userId} is following ${following.length} people`);
      return following;
    } catch (error) {
      console.error(`Error getting following for user ${userId}:`, error);
      return [];
    }
  }

  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      return userDoc.exists() ? { id: userId, ...userDoc.data() } : null;
    } catch (error) {
      console.error(`Error getting profile for user ${userId}:`, error);
      return null;
    }
  }

  async getUserRecentPhotos(userId, limit = 20) {
    try {
      const photosRef = collection(db, "photos");
      const photosQuery = query(
        photosRef,
        where("uid", "==", userId),
        orderBy("timestamp", "desc"),
        limit(limit)
      );
      
      const snapshot = await getDocs(photosQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error getting photos for user ${userId}:`, error);
      return [];
    }
  }

  async getPhotosNearLocation(location, radiusInMeters, limit = 50) {
    try {
      // Simple bounding box query (more efficient than true radius)
      const latDelta = radiusInMeters / 111000; // Rough conversion to degrees
      const lngDelta = radiusInMeters / (111000 * Math.cos(location.latitude * Math.PI / 180));
      
      const photosRef = collection(db, "photos");
      const photosQuery = query(
        photosRef,
        where("latitude", ">=", location.latitude - latDelta),
        where("latitude", "<=", location.latitude + latDelta),
        orderBy("latitude"),
        limit(limit)
      );
      
      const snapshot = await getDocs(photosQuery);
      const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by actual distance
      return photos.filter(photo => {
        if (!photo.longitude) return false;
        
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          photo.latitude,
          photo.longitude
        );
        
        return distance <= radiusInMeters;
      });
      
    } catch (error) {
      console.error('Error getting photos near location:', error);
      return [];
    }
  }

  async getPhotoLikes(photoId) {
    try {
      const likesRef = collection(db, "likes");
      const likesQuery = query(likesRef, where("photoId", "==", photoId));
      const snapshot = await getDocs(likesQuery);
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error getting likes for photo ${photoId}:`, error);
      return [];
    }
  }

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

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Enhanced cache clearing for specific user
  clearCacheForUser(userId) {
    const suggestionsCacheKey = `suggestions_${userId}`;
    const followingCacheKey = `following_${userId}`;
    
    this.suggestionsCache.delete(suggestionsCacheKey);
    this.lastCacheUpdate.delete(suggestionsCacheKey);
    this.followingCache.delete(followingCacheKey);
    this.lastFollowingCacheUpdate.delete(followingCacheKey);
    
    console.log(`🤝 Follow suggestions and following cache cleared for user: ${userId}`);
  }

  // Clear all cache (useful for testing)
  clearCache() {
    this.suggestionsCache.clear();
    this.lastCacheUpdate.clear();
    this.followingCache.clear();
    this.lastFollowingCacheUpdate.clear();
    console.log('🤝 All follow suggestions cache cleared');
  }

  // Track suggestion analytics
  async trackSuggestionEvent(userId, suggestedUserId, action, suggestionType) {
    // Integration with your analytics service
    const eventData = {
      user_id: userId,
      suggested_user_id: suggestedUserId,
      action: action, // 'viewed', 'followed', 'dismissed'
      suggestion_type: suggestionType,
      timestamp: new Date().toISOString()
    };
    
    console.log('🤝 Suggestion event:', eventData);
    // Add to your analytics service here
  }
}

// Create singleton instance
const followSuggestionsService = new FollowSuggestionsService();

export default followSuggestionsService;
