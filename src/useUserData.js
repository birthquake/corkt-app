import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Hook to fetch a single user's data
export const useUserData = (userId) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          setUserData({
            id: userId,
            ...userDoc.data(),
          });
        } else {
          // Fallback for users who don't have profiles yet
          setUserData({
            id: userId,
            realName: `User ${userId.slice(0, 6)}`,
            displayScreenName: `user_${userId.slice(0, 6)}`,
            profilePicture: "",
          });
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err.message);
        // Fallback on error
        setUserData({
          id: userId,
          realName: `User ${userId.slice(0, 6)}`,
          displayScreenName: `user_${userId.slice(0, 6)}`,
          profilePicture: "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  return { userData, loading, error };
};

// Hook to fetch multiple users' data efficiently
export const useUsersData = (userIds) => {
  const [usersData, setUsersData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setUsersData({});
      setLoading(false);
      return;
    }

    const fetchUsersData = async () => {
      try {
        setLoading(true);
        const uniqueUserIds = [...new Set(userIds)]; // Remove duplicates
        const usersMap = {};

        // Fetch all users in parallel
        const promises = uniqueUserIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              usersMap[userId] = {
                id: userId,
                ...userDoc.data(),
              };
            } else {
              // Fallback for users without profiles
              usersMap[userId] = {
                id: userId,
                realName: `User ${userId.slice(0, 6)}`,
                displayScreenName: `user_${userId.slice(0, 6)}`,
                profilePicture: "",
              };
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
            usersMap[userId] = {
              id: userId,
              realName: `User ${userId.slice(0, 6)}`,
              displayScreenName: `user_${userId.slice(0, 6)}`,
              profilePicture: "",
            };
          }
        });

        await Promise.all(promises);
        setUsersData(usersMap);
        setError(null);
      } catch (err) {
        console.error("Error fetching users data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersData();
  }, [userIds]);

  return { usersData, loading, error };
};

// Hook to search users by name or screen name with live search
export const useUserSearch = (searchQuery) => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Cache for client-side filtering

  // Fetch all users on first load for fast client-side search
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, "users"),
          orderBy("realName"),
          limit(100) // Limit to prevent performance issues
        );

        const snapshot = await getDocs(usersQuery);
        const users = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAllUsers(users);
      } catch (err) {
        console.error("Error fetching all users:", err);
        // Fallback to individual search queries if bulk fetch fails
      }
    };

    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        setLoading(true);
        const query_lower = searchQuery.toLowerCase().trim();

        console.log("🔍 Live searching for:", query_lower);

        let results = [];

        // Strategy 1: Client-side search if we have users cached (fastest for live search)
        if (allUsers.length > 0) {
          results = allUsers.filter((user) => {
            const realName = (user.realName || "").toLowerCase();
            const screenName = (
              user.displayScreenName ||
              user.screenName ||
              ""
            ).toLowerCase();
            const username = (user.username || "").toLowerCase();

            // Search in multiple fields for better matching
            return (
              realName.includes(query_lower) ||
              screenName.includes(query_lower) ||
              username.includes(query_lower) ||
              screenName.startsWith(query_lower) ||
              realName.startsWith(query_lower)
            );
          });

          // Sort by relevance (exact matches first, then starts-with, then contains)
          results.sort((a, b) => {
            const aName = (a.realName || "").toLowerCase();
            const bName = (b.realName || "").toLowerCase();
            const aScreen = (
              a.displayScreenName ||
              a.screenName ||
              ""
            ).toLowerCase();
            const bScreen = (
              b.displayScreenName ||
              b.screenName ||
              ""
            ).toLowerCase();

            // Exact matches first
            if (aName === query_lower || aScreen === query_lower) return -1;
            if (bName === query_lower || bScreen === query_lower) return 1;

            // Starts with matches second
            if (
              aName.startsWith(query_lower) ||
              aScreen.startsWith(query_lower)
            )
              return -1;
            if (
              bName.startsWith(query_lower) ||
              bScreen.startsWith(query_lower)
            )
              return 1;

            // Alphabetical for the rest
            return aName.localeCompare(bName);
          });

          // Limit results for performance
          results = results.slice(0, 20);
        } else {
          // Strategy 2: Firestore search (fallback when client-side cache isn't available)
          // Use multiple queries for better partial matching
          const searchPromises = [];

          // Search by real name starting with query
          if (query_lower.length >= 2) {
            const nameQuery = query(
              collection(db, "users"),
              where("realName", ">=", searchQuery),
              where("realName", "<", searchQuery + "\uf8ff"),
              limit(10)
            );
            searchPromises.push(getDocs(nameQuery));

            // Search by screen name starting with query
            const screenQuery = query(
              collection(db, "users"),
              where("displayScreenName", ">=", searchQuery.toLowerCase()),
              where(
                "displayScreenName",
                "<",
                searchQuery.toLowerCase() + "\uf8ff"
              ),
              limit(10)
            );
            searchPromises.push(getDocs(screenQuery));
          }

          const snapshots = await Promise.all(searchPromises);
          const userMap = new Map();

          snapshots.forEach((snapshot) => {
            snapshot.docs.forEach((doc) => {
              if (!userMap.has(doc.id)) {
                userMap.set(doc.id, {
                  id: doc.id,
                  ...doc.data(),
                });
              }
            });
          });

          results = Array.from(userMap.values());

          // Additional client-side filtering for better matching
          results = results.filter((user) => {
            const realName = (user.realName || "").toLowerCase();
            const screenName = (
              user.displayScreenName ||
              user.screenName ||
              ""
            ).toLowerCase();
            return (
              realName.includes(query_lower) || screenName.includes(query_lower)
            );
          });
        }

        console.log("✅ Live search results:", results.length, "users found");
        setSearchResults(results);
        setError(null);
      } catch (err) {
        console.error("❌ Error in live search:", err);
        setError(err.message);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Reduced debounce for more responsive live search
    const timeoutId = setTimeout(performSearch, 150);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, allUsers]);

  return { searchResults, loading, error };
};

// Utility function to create search terms for better indexing
export const createSearchTerms = (realName, screenName, username) => {
  const terms = new Set();

  // Add original terms
  if (realName) {
    terms.add(realName.toLowerCase());
    // Add individual words
    realName
      .toLowerCase()
      .split(" ")
      .forEach((word) => {
        if (word.length > 1) terms.add(word);
      });
  }

  if (screenName) {
    terms.add(screenName.toLowerCase());
  }

  if (username) {
    terms.add(username.toLowerCase());
  }

  // Add partial terms for better prefix matching
  [realName, screenName, username].forEach((term) => {
    if (term && term.length > 2) {
      const lowerTerm = term.toLowerCase();
      for (let i = 2; i <= lowerTerm.length; i++) {
        terms.add(lowerTerm.substring(0, i));
      }
    }
  });

  return Array.from(terms);
};

// Utility function to get display name for a user
export const getDisplayName = (userData, currentUserId) => {
  if (!userData) return "Unknown User";

  if (userData.id === currentUserId) {
    return "You";
  }

  return (
    userData.realName ||
    userData.username ||
    `User ${userData.id?.slice(0, 6) || "Unknown"}`
  );
};

// Utility function to get screen name for a user
export const getScreenName = (userData) => {
  if (!userData) return "unknown";

  return (
    userData.displayScreenName ||
    userData.screenName ||
    userData.username ||
    `user_${userData.id?.slice(0, 6) || "unknown"}`
  );
};
