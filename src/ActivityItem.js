import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActivityItem = ({ activity, currentUser }) => {
  const navigate = useNavigate();

  const handleUserClick = (e, userId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (userId === currentUser?.uid) {
      navigate('/profile');
    } else {
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
    
    return activityTime.toLocaleDateString();
  };

  // Get activity message with clickable username
  const getActivityMessage = () => {
    const actorName = activity.actorName || 'Someone';
    const actorId = activity.actorId;
    
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

  // Handle activity item tap
  const handleActivityTap = () => {
    console.log('Activity tapped:', activity);
  };

  return (
    <div 
      style={{
        ...styles.container,
        backgroundColor: activity.read ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
      }}
      onClick={handleActivityTap}
    >
      {/* Clickable Actor Avatar */}
      <div 
        style={styles.avatarContainer}
        onClick={(e) => handleUserClick(e, activity.actorId)}
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
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    backgroundColor: 'var(--color-bg-secondary)',
  },
  avatarContainer: {
    marginRight: '12px',
    flexShrink: 0,
    cursor: 'pointer',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    objectFit: 'cover',
    border: '2px solid var(--color-border)',
    transition: 'transform 0.2s ease',
  },
  defaultAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    border: '2px solid var(--color-border)',
    transition: 'transform 0.2s ease',
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
    color: 'var(--color-text-primary)',
    fontWeight: '500',
    lineHeight: '1.3',
  },
  clickableUsername: {
    color: 'var(--color-primary)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    ':hover': {
      color: 'var(--color-primary)',
      opacity: '0.8',
      textDecoration: 'underline',
    },
  },
  timestamp: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  photoContainer: {
    flexShrink: 0,
  },
  photoThumbnail: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid var(--color-border)',
  },
  unreadDot: {
    position: 'absolute',
    top: '50%',
    right: '8px',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: 'var(--color-primary)',
  },
};

export default ActivityItem;
