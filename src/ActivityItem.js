import React from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ NEW: Import useNavigate

const ActivityItem = ({ activity, currentUser }) => {
  const navigate = useNavigate(); // ✅ NEW: Initialize navigation hook

  // ✅ NEW: Handle user click to navigate to profile
  const handleUserClick = (e, userId) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent activity tap from firing
    
    if (userId === currentUser?.uid) {
      // Navigate to own profile without userId parameter
      navigate('/profile');
    } else {
      // Navigate to other user's profile with userId parameter
      navigate(`/profile/${userId}`);
    }
  };

  // Format timestamp to relative time (e.g., "2h ago")
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const activityTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMs = now - activityTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    // For older activities, show actual date
    return activityTime.toLocaleDateString();
  };

  // ✅ UPDATED: Get activity message with clickable username
  const getActivityMessage = () => {
    const actorName = activity.actorName || 'Someone';
    const actorId = activity.actorId; // Assuming this field exists
    
    switch (activity.type) {
      case 'like':
        return (
          <span>
            <span 
              style={styles.clickableUsername}
              onClick={(e) => handleUserClick(e, actorId)}
            >
              {actorName}
            </span>
            {' liked your photo'}
          </span>
        );
      case 'new_photo_nearby':
        return (
          <span>
            <span 
              style={styles.clickableUsername}
              onClick={(e) => handleUserClick(e, actorId)}
            >
              {actorName}
            </span>
            {` posted a photo ${activity.distance}m away`}
          </span>
        );
      default:
        return (
          <span>
            <span 
              style={styles.clickableUsername}
              onClick={(e) => handleUserClick(e, actorId)}
            >
              {actorName}
            </span>
            {' has new activity'}
          </span>
        );
    }
  };

  // Get activity icon based on type
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'like':
        return '❤️';
      case 'new_photo_nearby':
        return '📍';
      default:
        return '🔔';
    }
  };

  // Handle activity item tap (for future navigation)
  const handleActivityTap = () => {
    // Future: Navigate to photo detail or other relevant screen
    console.log('Activity tapped:', activity);
  };

  return (
    <div 
      style={{
        ...styles.container,
        backgroundColor: activity.read ? '#ffffff' : '#f8f9fa', // Slightly darker for unread
      }}
      onClick={handleActivityTap}
    >
      {/* ✅ UPDATED: Clickable Actor Avatar */}
      <div 
        style={styles.avatarContainer}
        onClick={(e) => handleUserClick(e, activity.actorId)} // ✅ NEW: Make avatar clickable
      >
        {activity.actorAvatar ? (
          <img 
            src={activity.actorAvatar} 
            alt={activity.actorName}
            style={styles.avatar}
          />
        ) : (
          <div style={styles.defaultAvatar}>
            {activity.actorName ? activity.actorName[0].toUpperCase() : '?'}
          </div>
        )}
      </div>

      {/* Activity Content */}
      <div style={styles.content}>
        <div style={styles.messageContainer}>
          <span style={styles.icon}>{getActivityIcon()}</span>
          <span style={styles.message}>{getActivityMessage()}</span>
        </div>
        <div style={styles.timestamp}>{formatTimestamp(activity.timestamp)}</div>
      </div>

      {/* Photo Thumbnail */}
      {activity.photoUrl && (
        <div style={styles.photoContainer}>
          <img 
            src={activity.photoUrl} 
            alt="Photo"
            style={styles.photoThumbnail}
          />
        </div>
      )}

      {/* Unread Indicator */}
      {!activity.read && <div style={styles.unreadDot}></div>}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e9ecef',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  avatarContainer: {
    marginRight: '12px',
    flexShrink: 0,
    cursor: 'pointer', // ✅ NEW: Show pointer cursor for clickable avatar
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    objectFit: 'cover',
    border: '2px solid #e9ecef',
    transition: 'transform 0.2s ease', // ✅ NEW: Smooth hover effect
  },
  defaultAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    border: '2px solid #e9ecef',
    transition: 'transform 0.2s ease', // ✅ NEW: Smooth hover effect
  },
  content: {
    flex: 1,
    marginRight: '12px',
  },
  messageContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  icon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  message: {
    fontSize: '15px',
    color: '#343a40',
    fontWeight: '500',
    lineHeight: '1.3',
  },
  // ✅ NEW: Style for clickable usernames
  clickableUsername: {
    color: '#007bff',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    ':hover': {
      color: '#0056b3',
      textDecoration: 'underline',
    },
  },
  timestamp: {
    fontSize: '13px',
    color: '#6c757d',
  },
  photoContainer: {
    flexShrink: 0,
  },
  photoThumbnail: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #e9ecef',
  },
  unreadDot: {
    position: 'absolute',
    top: '50%',
    right: '8px',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#007AFF', // iOS blue for unread indicator
  },
};

export default ActivityItem;
