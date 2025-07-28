import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from './firebaseConfig';
import ActivityItem from './ActivityItem';
import SuggestedUsersComponent from './SuggestedUsersComponent';

// Minimal SVG icon components - matching MobileBottomNavigation style
const BellIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const BellOffIcon = ({ color = "#6c757d", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M6.87 6.87a6 6 0 0 1 8.13 8.13"/>
    <path d="M19 17v-6a7 7 0 0 0-1-3.67"/>
    <path d="M14.73 21a2 2 0 0 1-3.46 0"/>
    <path d="M3 17h4l-1-4"/>
    <path d="M14 3V1"/>
    <path d="M10 3V1"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const AlertCircleIcon = ({ color = "#dc3545", size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const RefreshIcon = ({ color = "#ffffff", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const ActivityFeed = ({ currentUser }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Determine if we should show follow suggestions
  const shouldShowSuggestions = () => {
    if (!currentUser) return false;
    
    // Always show for new users (following < 10 people OR account < 30 days old)
    const accountAge = currentUser.createdAt ? 
      (Date.now() - currentUser.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24) : 0;
    const followingCount = currentUser.followingCount || 0;
    
    if (followingCount < 10 || accountAge < 30) {
      return true;
    }
    
    // Show when activity feed is empty
    if (activities.length === 0 && !loading) {
      return true;
    }
    
    // 20% chance for established users (randomized per session)
    const sessionRandom = Math.random();
    return sessionRandom < 0.2;
  };

  // Update showSuggestions when dependencies change
  useEffect(() => {
    setShowSuggestions(shouldShowSuggestions());
  }, [currentUser, activities.length, loading]);

  // Handle user profile navigation
  const handleUserClick = (userId) => {
    // Navigate to user profile - adjust this based on your routing setup
    window.location.href = `/profile/${userId}`;
    // Or use your router: navigate(`/profile/${userId}`);
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Create query for activities for the current user
    const activitiesQuery = query(
      collection(db, 'activities'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50) // Limit to 50 most recent activities
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        try {
          const activitiesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setActivities(activitiesData);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing activities:', err);
          setError('Failed to load activities');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to activities:', err);
        setError('Failed to load activities');
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Activity</h2>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Activity</h2>
        </div>
        <div style={styles.errorContainer}>
          <div style={styles.errorIconContainer}>
            <AlertCircleIcon color="#dc3545" size={48} />
          </div>
          <p style={styles.errorText}>{error}</p>
          <button 
            style={styles.retryButton}
            onClick={() => window.location.reload()}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#007bff';
            }}
          >
            <RefreshIcon color="#ffffff" size={16} />
            <span style={{ marginLeft: '6px' }}>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Activity</h2>
        </div>
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIconContainer}>
            <BellIcon color="#6c757d" size={48} />
          </div>
          <h3 style={styles.emptyTitle}>Please log in</h3>
          <p style={styles.emptyText}>
            Sign in to see your activity notifications
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Activity</h2>
      </div>
      
      <div style={styles.feedContainer}>
        {/* Follow Suggestions */}
        {showSuggestions && (
          <div style={{ padding: '0 20px' }}>
            <SuggestedUsersComponent
              currentUser={currentUser}
              currentLocation={null} // Will be enhanced with location later
              onUserClick={handleUserClick}
              compact={true}
              maxSuggestions={3}
            />
          </div>
        )}

        {activities.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIconContainer}>
              <BellOffIcon color="#6c757d" size={48} />
            </div>
            <h3 style={styles.emptyTitle}>No activity yet</h3>
            <p style={styles.emptyText}>
              When people like your photos or post nearby, you'll see it here
            </p>
          </div>
        ) : (
          <div style={styles.activitiesList}>
            {activities.map(activity => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    color: '#343a40',
    paddingBottom: '120px', // Increased space for bottom nav
    maxWidth: '500px',
    margin: '0 auto',
  },
  header: {
    padding: '20px 20px 10px 20px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#343a40',
  },
  feedContainer: {
    flex: 1,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e9ecef',
    borderTop: '3px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#6c757d',
    fontSize: '16px',
    margin: 0,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  errorIconContainer: {
    marginBottom: '16px',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '16px',
    marginBottom: '20px',
    textAlign: 'center',
    margin: '0 0 20px 0',
  },
  retryButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyIconContainer: {
    marginBottom: '20px',
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#343a40',
    margin: '0 0 10px 0',
  },
  emptyText: {
    color: '#6c757d',
    fontSize: '16px',
    lineHeight: '1.5',
    maxWidth: '300px',
    margin: 0,
  },
  activitiesList: {
    padding: '0',
  },
};

// Add CSS animation for loading spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ActivityFeed;
