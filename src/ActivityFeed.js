import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from './firebaseConfig';
import ActivityItem from './ActivityItem';

const ActivityFeed = ({ currentUser }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <p style={styles.errorText}>{error}</p>
          <button 
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
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
          <p style={styles.emptyText}>Please log in to see your activity</p>
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
        {activities.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIcon}>🔔</div>
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
    paddingBottom: '80px', // Space for bottom nav
  },
  header: {
    padding: '20px 20px 10px 20px',
    borderBottom: '1px solid #e9ecef',
    position: 'sticky',
    top: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 10,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
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
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '16px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#343a40',
  },
  emptyText: {
    color: '#6c757d',
    fontSize: '16px',
    lineHeight: '1.5',
    maxWidth: '300px',
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