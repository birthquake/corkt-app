import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const AdminPanel = ({ currentUser }) => {
  const [photos, setPhotos] = useState([]);
  const [flags, setFlags] = useState([]); // ✅ NEW: Track flags from flags collection
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [error, setError] = useState('');

  // REPLACE WITH YOUR ACTUAL EMAIL
  const adminEmail = 'corktapp@gmail.com';
  const userEmail = currentUser?.email || '';
  const isAdmin = userEmail === adminEmail;

  // ✅ NEW: Helper function to check if photo is flagged
  const isPhotoFlagged = (photoId) => {
    return flags.some(flag => flag.photoId === photoId && flag.flagStatus === 'pending');
  };

  // ✅ NEW: Get flag details for a photo
  const getPhotoFlags = (photoId) => {
    return flags.filter(flag => flag.photoId === photoId);
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      // ✅ EXISTING: Load photos
      const photosRef = collection(db, 'photos');
      const photosQuery = query(photosRef, orderBy('timestamp', 'desc'));
      
      const photosUnsubscribe = onSnapshot(photosQuery, (snapshot) => {
        try {
          const allPhotos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPhotos(allPhotos);
          setError('');
        } catch (err) {
          console.error('Error processing photos:', err);
          setError('Error loading photos: ' + err.message);
        }
      }, (err) => {
        console.error('Error fetching photos:', err);
        setError('Error fetching photos: ' + err.message);
        setLoading(false);
      });

      // ✅ NEW: Load flags from flags collection
      const flagsRef = collection(db, 'flags');
      const flagsQuery = query(flagsRef, orderBy('timestamp', 'desc'));
      
      const flagsUnsubscribe = onSnapshot(flagsQuery, (snapshot) => {
        try {
          const allFlags = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(doc.data().timestamp || Date.now())
          }));
          setFlags(allFlags);
          setLoading(false);
          console.log('📊 AdminPanel: Loaded flags:', allFlags.length);
        } catch (err) {
          console.error('Error processing flags:', err);
          setError('Error loading flags: ' + err.message);
          setLoading(false);
        }
      }, (err) => {
        console.error('Error fetching flags:', err);
        setError('Error fetching flags: ' + err.message);
        setLoading(false);
      });

      return () => {
        photosUnsubscribe();
        flagsUnsubscribe();
      };
    } catch (err) {
      console.error('Error setting up listeners:', err);
      setError('Error setting up listeners: ' + err.message);
      setLoading(false);
    }
  }, [isAdmin]);

  // ✅ UPDATED: Filter photos based on current filter and search (now uses new flagging system)
  const filteredPhotos = photos.filter(photo => {
    // Text search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (photo.caption && photo.caption.toLowerCase().includes(searchLower)) ||
        (photo.uid && photo.uid.toLowerCase().includes(searchLower)) ||
        (photo.placeAddress && photo.placeAddress.toLowerCase().includes(searchLower)) ||
        (photo.placeName && photo.placeName.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filter === 'flagged') {
      return isPhotoFlagged(photo.id); // ✅ NEW: Use new flagging system
    } else if (filter === 'recent') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const photoDate = photo.timestamp?.toDate?.() || new Date(photo.timestamp);
      return photoDate > oneDayAgo;
    } else if (filter === 'private') {
      return photo.privacy === 'private';
    }
    
    return true; // 'all' filter
  });

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'photos', photoId));
      setError('');
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError('Error deleting photo: ' + error.message);
    }
  };

  // ✅ UPDATED: Handle flagging using new system (this is now for manual admin flagging)
  const handleFlagPhoto = async (photoId, flagged) => {
    try {
      // This updates the old flagged field for backwards compatibility
      // The new user-reported flags are handled in the AnalyticsDashboard
      await updateDoc(doc(db, 'photos', photoId), {
        flagged: flagged,
        flaggedAt: flagged ? new Date() : null,
        flaggedBy: flagged ? currentUser.email : null
      });
      setError('');
    } catch (error) {
      console.error('Error flagging photo:', error);
      setError('Error updating photo: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'No date';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatUserId = (uid) => {
    if (!uid) return 'Unknown User';
    return uid.length > 15 ? uid.substring(0, 15) + '...' : uid;
  };

  // Format location to show City, State instead of coordinates
  const formatLocation = (photo) => {
    // First try to get city/state from placeAddress
    if (photo.placeAddress) {
      // Extract city, state from full address (e.g., "123 Main St, New York, NY 10001")
      const addressParts = photo.placeAddress.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        // Return "City, State" (skip street address and zip)
        return `${addressParts[addressParts.length - 3]}, ${addressParts[addressParts.length - 2]}`;
      } else if (addressParts.length === 2) {
        // Return "City, State"
        return `${addressParts[0]}, ${addressParts[1]}`;
      } else {
        // Return full address if can't parse
        return photo.placeAddress;
      }
    }
    
    // Fallback to place name
    if (photo.placeName) return photo.placeName;
    
    // Last resort: coordinates
    if (photo.latitude && photo.longitude) {
      return `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`;
    }
    
    return 'No location';
  };

  // Get detailed location info for photo modal
  const getDetailedLocation = (photo) => {
    let locationInfo = [];
    
    if (photo.placeName) {
      locationInfo.push(`Place: ${photo.placeName}`);
    }
    
    if (photo.placeAddress) {
      locationInfo.push(`Address: ${photo.placeAddress}`);
    }
    
    if (photo.latitude && photo.longitude) {
      locationInfo.push(`Coordinates: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`);
    }
    
    return locationInfo.length > 0 ? locationInfo.join(' • ') : 'No location data';
  };

  const getPrivacyColor = (privacy) => {
    if (privacy === 'private') return '#dc3545';
    if (privacy === 'friends') return '#ffc107';
    return '#28a745'; // public
  };

  // ✅ NEW: Calculate flagged count using new system
  const flaggedCount = photos.filter(photo => isPhotoFlagged(photo.id)).length;

  if (!isAdmin) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: '#6c757d' }}>You don't have permission to access the admin panel.</p>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Current user: {userEmail}</p>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Required: {adminEmail}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }} />
        <p style={{ color: '#6c757d' }}>Loading photos and flags...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          color: '#343a40',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Corkt Admin Panel
        </h1>
        
        <div style={{ 
          marginBottom: '16px',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Logged in as: <strong>{userEmail}</strong>
        </div>
        
        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}
        
        {/* Search and Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search by caption, user ID, city, or place name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              flex: '1',
              minWidth: '250px'
            }}
          />
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff'
            }}
          >
            <option value="all">All Photos ({photos.length})</option>
            <option value="recent">Recent (24h)</option>
            <option value="flagged">Flagged ({flaggedCount})</option>
            <option value="private">Private Photos ({photos.filter(p => p.privacy === 'private').length})</option>
          </select>
        </div>
      </div>

      {/* ✅ UPDATED: Stats Bar with new flagging count */}
      <div style={{
        backgroundColor: '#fff',
        padding: '16px 20px',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          <strong style={{ color: '#343a40' }}>Total Photos:</strong> {photos.length}
        </div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          <strong style={{ color: '#343a40' }}>Showing:</strong> {filteredPhotos.length}
        </div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          <strong style={{ color: '#dc3545' }}>Flagged:</strong> {flaggedCount}
        </div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          <strong style={{ color: '#ffc107' }}>Private:</strong> {photos.filter(p => p.privacy === 'private').length}
        </div>
        {/* ✅ NEW: Show total user reports */}
        <div style={{ color: '#6c757d', fontSize: '14px' }}>
          <strong style={{ color: '#17a2b8' }}>User Reports:</strong> {flags.filter(f => f.flagStatus === 'pending').length}
        </div>
      </div>

      {/* Photos Grid */}
      <div style={{ padding: '20px' }}>
        {filteredPhotos.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#6c757d'
          }}>
            <h3 style={{ marginBottom: '8px' }}>No photos found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {filteredPhotos.map((photo) => {
              const photoFlags = getPhotoFlags(photo.id);
              const hasUserReports = photoFlags.length > 0;
              const pendingReports = photoFlags.filter(f => f.flagStatus === 'pending').length;
              
              return (
                <div
                  key={photo.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: hasUserReports ? '2px solid #dc3545' : 
                           photo.flagged ? '2px solid #ffc107' : '1px solid #dee2e6'
                  }}
                >
                  {/* Photo */}
                  <div style={{ position: 'relative' }}>
                    <img
                      src={photo.imageUrl}
                      alt="User photo"
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedPhoto(photo)}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{
                      display: 'none',
                      width: '100%',
                      height: '200px',
                      backgroundColor: '#f8f9fa',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6c757d',
                      fontSize: '14px'
                    }}>
                      Image failed to load
                    </div>
                    
                    {/* ✅ UPDATED: Status badges with user reports */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      display: 'flex',
                      gap: '4px',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      {pendingReports > 0 && (
                        <div style={{
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {pendingReports} REPORT{pendingReports !== 1 ? 'S' : ''}
                        </div>
                      )}
                      {photo.flagged && (
                        <div style={{
                          backgroundColor: '#ffc107',
                          color: '#000',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ADMIN FLAGGED
                        </div>
                      )}
                      {photo.privacy && (
                        <div style={{
                          backgroundColor: getPrivacyColor(photo.privacy),
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {photo.privacy.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#343a40',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        User ID: {formatUserId(photo.uid)}
                      </div>
                      <div style={{ 
                        color: '#6c757d', 
                        fontSize: '12px'
                      }}>
                        {formatDate(photo.timestamp)}
                      </div>
                    </div>

                    {photo.caption && (
                      <p style={{
                        margin: '0 0 12px 0',
                        color: '#343a40',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {photo.caption.length > 100 ? 
                          photo.caption.substring(0, 100) + '...' : 
                          photo.caption
                        }
                      </p>
                    )}

                    <div style={{
                      color: '#6c757d',
                      fontSize: '12px',
                      marginBottom: '12px'
                    }}>
                      📍 {formatLocation(photo)}
                    </div>

                    {/* ✅ NEW: Show user report details */}
                    {photoFlags.length > 0 && (
                      <div style={{
                        backgroundColor: '#fef2f2',
                        padding: '8px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontSize: '12px'
                      }}>
                        <strong>User Reports:</strong><br />
                        {photoFlags.map((flag, index) => (
                          <div key={flag.id} style={{ marginTop: '4px' }}>
                            • {flag.reason} ({flag.flagStatus}) - {flag.flaggedByEmail}
                          </div>
                        ))}
                      </div>
                    )}

                    {photo.taggedUsers && photo.taggedUsers.length > 0 && (
                      <div style={{
                        color: '#6c757d',
                        fontSize: '12px',
                        marginBottom: '12px'
                      }}>
                        👥 Tagged: {photo.taggedUsers.length} user{photo.taggedUsers.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => handleFlagPhoto(photo.id, !photo.flagged)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          backgroundColor: photo.flagged ? '#28a745' : '#ffc107',
                          color: photo.flagged ? '#fff' : '#000'
                        }}
                      >
                        {photo.flagged ? 'Unflag' : 'Admin Flag'}
                      </button>
                      
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          backgroundColor: '#dc3545',
                          color: '#fff'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.imageUrl}
              alt="Full size photo"
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
            <div style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Photo Details</h3>
              <p><strong>User ID:</strong> {selectedPhoto.uid}</p>
              <p><strong>Caption:</strong> {selectedPhoto.caption || 'No caption'}</p>
              <p><strong>Location:</strong> {getDetailedLocation(selectedPhoto)}</p>
              <p><strong>Privacy:</strong> {selectedPhoto.privacy || 'public'}</p>
              <p><strong>Posted:</strong> {formatDate(selectedPhoto.timestamp)}</p>
              {selectedPhoto.taggedUsers && selectedPhoto.taggedUsers.length > 0 && (
                <p><strong>Tagged Users:</strong> {selectedPhoto.taggedUsers.join(', ')}</p>
              )}
              {selectedPhoto.placeTypes && selectedPhoto.placeTypes.length > 0 && (
                <p><strong>Place Types:</strong> {selectedPhoto.placeTypes.join(', ')}</p>
              )}
              {selectedPhoto.flagged && (
                <p style={{ color: '#dc3545' }}>
                  <strong>Admin Flagged by:</strong> {selectedPhoto.flaggedBy} on {formatDate(selectedPhoto.flaggedAt)}
                </p>
              )}
              {/* ✅ NEW: Show user reports in modal */}
              {getPhotoFlags(selectedPhoto.id).length > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>User Reports:</strong></p>
                  {getPhotoFlags(selectedPhoto.id).map((flag, index) => (
                    <div key={flag.id} style={{ fontSize: '14px', marginBottom: '4px' }}>
                      • <strong>{flag.reason}</strong> - Reported by {flag.flaggedByEmail} on {formatDate(flag.timestamp)} ({flag.flagStatus})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminPanel;
