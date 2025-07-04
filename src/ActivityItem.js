import React from 'react';

const ActivityItem = ({ activity, currentUser }) => {
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

  // Get activity message based on type
  const getActivityMessage = () => {
    switch (activity.type) {
      case 'like':
        return `${activity.actorName} liked your photo`;
      case 'new_photo_nearby':
        return `${activity.actorName} posted a photo ${activity.distance}m away`;
      default:
        return 'New activity';
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
      {/* Actor Avatar */}
      <div style={styles.avatarContainer}>
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
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    objectFit: 'cover',
    border: '2px solid #e9ecef',
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