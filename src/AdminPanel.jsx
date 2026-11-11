import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import AdminInsights from './AdminInsights';

const AdminPanel = ({ currentUser }) => {
  const [photos, setPhotos] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState('photos'); // photos | activity | people | health

  // ✅ FIX: Track in-flight rotation updates so the onSnapshot listener
  // doesn't overwrite our optimistic UI before Firestore confirms the write.
  const pendingRotations = React.useRef({});
  // Same idea for multi-photo posts: per-image rotation arrays in flight.
  const pendingImageRotations = React.useRef({});

  const adminEmail = 'corktapp@gmail.com';
  const userEmail = currentUser?.email || '';
  const isAdmin = userEmail === adminEmail;

  const isPhotoFlagged = (photoId) => {
    return flags.some(flag => flag.photoId === photoId && flag.flagStatus === 'pending');
  };

  const getPhotoFlags = (photoId) => {
    return flags.filter(flag => flag.photoId === photoId);
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const photosRef = collection(db, 'photos');
      const photosQuery = query(photosRef, orderBy('timestamp', 'desc'));
      
      const photosUnsubscribe = onSnapshot(photosQuery, (snapshot) => {
        try {
          const allPhotos = snapshot.docs.map((doc) => {
            const data = doc.data();
            // ✅ FIX: If we have a pending rotation for this photo, use our
            // local value instead of whatever Firestore just sent back.
            // This prevents the snapshot from snapping the image back before
            // Firestore has confirmed the write.
            const merged = { id: doc.id, ...data };
            if (pendingRotations.current[doc.id] !== undefined) {
              merged.rotation = pendingRotations.current[doc.id];
            }
            if (pendingImageRotations.current[doc.id] !== undefined) {
              merged.imageRotations = pendingImageRotations.current[doc.id];
            }
            return merged;
          });
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

  const filteredPhotos = photos.filter(photo => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (photo.caption && photo.caption.toLowerCase().includes(searchLower)) ||
        (photo.uid && photo.uid.toLowerCase().includes(searchLower)) ||
        (photo.placeAddress && photo.placeAddress.toLowerCase().includes(searchLower)) ||
        (photo.placeName && photo.placeName.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    if (filter === 'flagged') {
      return isPhotoFlagged(photo.id);
    } else if (filter === 'recent') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const photoDate = photo.timestamp?.toDate?.() || new Date(photo.timestamp);
      return photoDate > oneDayAgo;
    } else if (filter === 'friends') {
      return photo.privacy === 'friends';
    } else if (filter === 'vault') {
      return photo.privacy === 'vault' || photo.privacy === 'invited' || photo.privacy === 'tagged';
    }
    
    return true;
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

  const handleFlagPhoto = async (photoId, flagged) => {
    try {
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

  const handleRotatePhoto = async (photoId, currentRotation, direction) => {
    const current = currentRotation || 0;
    let newRotation;

    if (direction === 'cw') {
      newRotation = (current + 90) % 360;
    } else if (direction === 'ccw') {
      newRotation = (current - 90 + 360) % 360;
    } else {
      newRotation = 0;
    }

    // ✅ FIX: Register the pending rotation BEFORE updating state or writing
    // to Firestore. The onSnapshot listener will see this and preserve our
    // value instead of overwriting it.
    pendingRotations.current[photoId] = newRotation;

    // Update local state immediately
    setPhotos(prev =>
      prev.map(p => p.id === photoId ? { ...p, rotation: newRotation } : p)
    );
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => ({ ...prev, rotation: newRotation }));
    }

    try {
      await updateDoc(doc(db, 'photos', photoId), { rotation: newRotation });
      setError('');
    } catch (error) {
      console.error('Error rotating photo:', error);
      setError('Error rotating photo: ' + error.message);
      // Revert on failure
      pendingRotations.current[photoId] = current;
      setPhotos(prev =>
        prev.map(p => p.id === photoId ? { ...p, rotation: current } : p)
      );
      if (selectedPhoto && selectedPhoto.id === photoId) {
        setSelectedPhoto(prev => ({ ...prev, rotation: current }));
      }
    } finally {
      // ✅ Clear the pending rotation after a short delay — enough time for
      // Firestore's onSnapshot to fire with the confirmed value.
      setTimeout(() => {
        delete pendingRotations.current[photoId];
      }, 3000);
    }
  };

  // ── Multi-photo posts ──────────────────────────────────────────────────
  // The native app stores multi-photo posts as an `images` array (with
  // `imageUrl` = images[0]). Photo #1 keeps using the existing `rotation`
  // field so the web feed and older app versions behave exactly as before.
  // Every photo also gets an entry in `imageRotations` (same order as
  // `images`); the native app reads entries 2+ from there.
  const getPostImages = (photo) =>
    photo.images && photo.images.length > 0
      ? photo.images
      : (photo.imageUrl ? [photo.imageUrl] : []);

  const getImageRotations = (photo) =>
    getPostImages(photo).map((_, i) =>
      i === 0 ? (photo.rotation || 0) : ((photo.imageRotations && photo.imageRotations[i]) || 0)
    );

  const handleRotateImage = async (photo, index, direction) => {
    const before = getImageRotations(photo);
    const current = before[index] || 0;
    let newRotation;
    if (direction === 'cw') newRotation = (current + 90) % 360;
    else if (direction === 'ccw') newRotation = (current - 90 + 360) % 360;
    else newRotation = 0;

    const after = [...before];
    after[index] = newRotation;

    const applyLocal = (rots) => {
      const patch = { imageRotations: rots, rotation: rots[0] };
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, ...patch } : p));
      setSelectedPhoto(prev => (prev && prev.id === photo.id ? { ...prev, ...patch } : prev));
    };

    pendingImageRotations.current[photo.id] = after;
    pendingRotations.current[photo.id] = after[0];
    applyLocal(after);

    try {
      await updateDoc(doc(db, 'photos', photo.id), {
        imageRotations: after,
        rotation: after[0]
      });
      setError('');
    } catch (err) {
      console.error('Error rotating photo:', err);
      setError('Error rotating photo: ' + err.message);
      pendingImageRotations.current[photo.id] = before;
      pendingRotations.current[photo.id] = before[0];
      applyLocal(before);
    } finally {
      setTimeout(() => {
        delete pendingImageRotations.current[photo.id];
        delete pendingRotations.current[photo.id];
      }, 3000);
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

  const formatLocation = (photo) => {
    if (photo.placeAddress) {
      const addressParts = photo.placeAddress.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        return `${addressParts[addressParts.length - 3]}, ${addressParts[addressParts.length - 2]}`;
      } else if (addressParts.length === 2) {
        return `${addressParts[0]}, ${addressParts[1]}`;
      } else {
        return photo.placeAddress;
      }
    }
    if (photo.placeName) return photo.placeName;
    if (photo.latitude && photo.longitude) {
      return `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`;
    }
    return 'No location';
  };

  const getDetailedLocation = (photo) => {
    let locationInfo = [];
    if (photo.placeName) locationInfo.push(`Place: ${photo.placeName}`);
    if (photo.placeAddress) locationInfo.push(`Address: ${photo.placeAddress}`);
    if (photo.latitude && photo.longitude) {
      locationInfo.push(`Coordinates: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`);
    }
    return locationInfo.length > 0 ? locationInfo.join(' • ') : 'No location data';
  };

  const getPrivacyColor = (privacy) => {
    if (privacy === 'vault' || privacy === 'invited' || privacy === 'tagged') return '#dc3545';
    if (privacy === 'friends') return '#ffc107';
    return '#28a745';
  };

  // ✅ No CSS transition — instant snap avoids the backwards-spin visual glitch
  const getRotationStyle = (rotation) => {
    if (!rotation || rotation === 0) return {};
    return { transform: `rotate(${rotation}deg)` };
  };

  const getImageWrapperStyle = (rotation) => {
    return {
      width: '100%',
      height: '200px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
    };
  };

  const flaggedCount = photos.filter(photo => isPhotoFlagged(photo.id)).length;

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: '#6c757d' }}>You don't have permission to access the admin panel.</p>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Current user: {userEmail}</p>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Required: {adminEmail}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div style={{
          width: '40px', height: '40px',
          border: '4px solid #e9ecef', borderTop: '4px solid #007bff',
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto'
        }} />
        <p style={{ color: '#6c757d' }}>Loading photos and flags...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderBottom: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 16px 0', color: '#343a40', fontSize: '28px', fontWeight: '600' }}>
          Corkt Admin Panel
        </h1>
        <div style={{ marginBottom: '16px', color: '#6c757d', fontSize: '14px' }}>
          Logged in as: <strong>{userEmail}</strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['photos', 'Photos'], ['activity', 'Activity'], ['people', 'People'], ['health', 'Health']].map(([key, label]) => (
            <button key={key} onClick={() => setSection(key)}
              style={{
                padding: '6px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
                border: '1px solid #ced4da',
                backgroundColor: section === key ? '#343a40' : '#fff',
                color: section === key ? '#fff' : '#343a40',
              }}>
              {label}
            </button>
          ))}
        </div>
        
        {error && (
          <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #f5c6cb' }}>
            {error}
          </div>
        )}
        
        {section === 'photos' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by caption, user ID, city, or place name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', flex: '1', minWidth: '250px' }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' }}
          >
            <option value="all">All Photos ({photos.length})</option>
            <option value="recent">Recent (24h)</option>
            <option value="flagged">Flagged ({flaggedCount})</option>
            <option value="friends">Friends-only ({photos.filter(p => p.privacy === 'friends').length})</option>
            <option value="vault">Vault ({photos.filter(p => p.privacy === 'vault' || p.privacy === 'invited' || p.privacy === 'tagged').length})</option>
          </select>
        </div>
        )}
      </div>

      {section !== 'photos' && (
        <AdminInsights
          tab={section}
          photos={photos}
          flags={flags}
          onViewPosts={(uid) => { setSearchTerm(uid); setFilter('all'); setSection('photos'); }}
        />
      )}

      {section === 'photos' && (<>
      {/* Stats Bar */}
      <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#343a40' }}>Total Photos:</strong> {photos.length}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#343a40' }}>Showing:</strong> {filteredPhotos.length}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#dc3545' }}>Flagged:</strong> {flaggedCount}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#ffc107' }}>Friends-only:</strong> {photos.filter(p => p.privacy === 'friends').length}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#dc3545' }}>Vault:</strong> {photos.filter(p => p.privacy === 'vault' || p.privacy === 'invited' || p.privacy === 'tagged').length}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#17a2b8' }}>User Reports:</strong> {flags.filter(f => f.flagStatus === 'pending').length}</div>
        <div style={{ color: '#6c757d', fontSize: '14px' }}><strong style={{ color: '#6f42c1' }}>Rotated:</strong> {photos.filter(p => p.rotation && p.rotation !== 0).length}</div>
      </div>

      {/* Photos Grid */}
      <div style={{ padding: '20px' }}>
        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
            <h3 style={{ marginBottom: '8px' }}>No photos found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredPhotos.map((photo) => {
              const photoFlags = getPhotoFlags(photo.id);
              const hasUserReports = photoFlags.length > 0;
              const pendingReports = photoFlags.filter(f => f.flagStatus === 'pending').length;
              const rotation = photo.rotation || 0;

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
                  {/* Photo with rotation */}
                  <div style={{ position: 'relative' }}>
                    <div style={getImageWrapperStyle(rotation)}>
                      <img
                        src={photo.imageUrl}
                        alt="User photo"
                        style={{
                          maxWidth: rotation === 90 || rotation === 270 ? '200px' : '100%',
                          maxHeight: rotation === 90 || rotation === 270 ? '100%' : '200px',
                          objectFit: 'contain',
                          cursor: 'pointer',
                          ...getRotationStyle(rotation)
                        }}
                        onClick={() => setSelectedPhoto(photo)}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Status badges */}
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {pendingReports > 0 && (
                        <div style={{ backgroundColor: '#dc3545', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {pendingReports} REPORT{pendingReports !== 1 ? 'S' : ''}
                        </div>
                      )}
                      {photo.flagged && (
                        <div style={{ backgroundColor: '#ffc107', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          ADMIN FLAGGED
                        </div>
                      )}
                      {photo.privacy && (
                        <div style={{ backgroundColor: getPrivacyColor(photo.privacy), color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {photo.privacy.toUpperCase()}
                        </div>
                      )}
                      {rotation !== 0 && (
                        <div style={{ backgroundColor: '#6f42c1', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {rotation}°
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#343a40', fontSize: '14px', marginBottom: '4px' }}>
                        User ID: {formatUserId(photo.uid)}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>
                        {formatDate(photo.timestamp)}
                      </div>
                    </div>

                    {photo.caption && (
                      <p style={{ margin: '0 0 12px 0', color: '#343a40', fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                        {photo.caption.length > 100 ? photo.caption.substring(0, 100) + '...' : photo.caption}
                      </p>
                    )}

                    <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '12px' }}>
                      📍 {formatLocation(photo)}
                    </div>

                    {photoFlags.length > 0 && (
                      <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
                        <strong>User Reports:</strong><br />
                        {photoFlags.map((flag) => (
                          <div key={flag.id} style={{ marginTop: '4px' }}>
                            • {flag.reason} ({flag.flagStatus}) - {flag.flaggedByEmail}
                          </div>
                        ))}
                      </div>
                    )}

                    {photo.taggedUsers && photo.taggedUsers.length > 0 && (
                      <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '12px' }}>
                        👥 Tagged: {photo.taggedUsers.length} user{photo.taggedUsers.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleRotatePhoto(photo.id, rotation, 'ccw')}
                        title="Rotate counter-clockwise"
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #ced4da',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: '#f8f9fa',
                          color: '#343a40'
                        }}
                      >
                        ↺
                      </button>
                      <button
                        onClick={() => handleRotatePhoto(photo.id, rotation, 'cw')}
                        title="Rotate clockwise"
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #ced4da',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: '#f8f9fa',
                          color: '#343a40'
                        }}
                      >
                        ↻
                      </button>

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
      </>)}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{ backgroundColor: '#fff', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rotation controls in modal */}
            {getPostImages(selectedPhoto).length > 1 ? (
              <div style={{ backgroundColor: '#000' }}>
                {getPostImages(selectedPhoto).map((url, idx) => {
                  const rot = getImageRotations(selectedPhoto)[idx] || 0;
                  return (
                    <div key={idx} style={{ borderBottom: '1px solid #343a40' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '10px 20px',
                        backgroundColor: '#f8f9fa',
                        borderBottom: '1px solid #dee2e6',
                        borderRadius: idx === 0 ? '12px 12px 0 0' : 0
                      }}>
                        <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: '500' }}>
                          Photo {idx + 1} of {getPostImages(selectedPhoto).length}
                        </span>
                        <button
                          onClick={() => handleRotateImage(selectedPhoto, idx, 'ccw')}
                          title="Rotate counter-clockwise"
                          style={{
                      padding: '6px 14px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      backgroundColor: '#fff',
                      color: '#343a40',
                      lineHeight: 1
                    }}
                        >
                          ↺
                        </button>
                        <span style={{ fontSize: '12px', color: '#6c757d', minWidth: '36px', textAlign: 'center' }}>
                          {rot}°
                        </span>
                        <button
                          onClick={() => handleRotateImage(selectedPhoto, idx, 'cw')}
                          title="Rotate clockwise"
                          style={{
                      padding: '6px 14px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      backgroundColor: '#fff',
                      color: '#343a40',
                      lineHeight: 1
                    }}
                        >
                          ↻
                        </button>
                        {rot !== 0 && (
                          <button
                            onClick={() => handleRotateImage(selectedPhoto, idx, 'reset')}
                            title="Reset rotation"
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #ced4da',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              backgroundColor: '#fff',
                              color: '#6c757d'
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '300px',
                        maxHeight: '420px',
                        backgroundColor: '#000',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          style={{
                            maxWidth: (rot === 90 || rot === 270) ? '300px' : '100%',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            ...getRotationStyle(rot)
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 20px',
              borderBottom: '1px solid #dee2e6',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px 12px 0 0'
            }}>
              <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: '500' }}>Rotate photo:</span>
              <button
                onClick={() => handleRotatePhoto(selectedPhoto.id, selectedPhoto.rotation || 0, 'ccw')}
                title="Rotate counter-clockwise"
                style={{
                  padding: '6px 14px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  color: '#343a40',
                  lineHeight: 1
                }}
              >
                ↺
              </button>
              <span style={{ fontSize: '12px', color: '#6c757d', minWidth: '36px', textAlign: 'center' }}>
                {selectedPhoto.rotation || 0}°
              </span>
              <button
                onClick={() => handleRotatePhoto(selectedPhoto.id, selectedPhoto.rotation || 0, 'cw')}
                title="Rotate clockwise"
                style={{
                  padding: '6px 14px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  color: '#343a40',
                  lineHeight: 1
                }}
              >
                ↻
              </button>
              {(selectedPhoto.rotation || 0) !== 0 && (
                <button
                  onClick={() => handleRotatePhoto(selectedPhoto.id, selectedPhoto.rotation || 0, 'reset')}
                  title="Reset rotation"
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    color: '#6c757d'
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Image in modal respects rotation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              maxHeight: '420px',
              backgroundColor: '#000',
              overflow: 'hidden'
            }}>
              <img
                src={selectedPhoto.imageUrl}
                alt="Full size photo"
                style={{
                  maxWidth: (selectedPhoto.rotation === 90 || selectedPhoto.rotation === 270) ? '300px' : '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  ...getRotationStyle(selectedPhoto.rotation || 0)
                }}
              />
            </div>

              </>
            )}

            <div style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Photo Details</h3>
              <p><strong>User ID:</strong> {selectedPhoto.uid}</p>
              <p><strong>Caption:</strong> {selectedPhoto.caption || 'No caption'}</p>
              <p><strong>Location:</strong> {getDetailedLocation(selectedPhoto)}</p>
              <p><strong>Privacy:</strong> {selectedPhoto.privacy || 'public'}</p>
              <p><strong>Posted:</strong> {formatDate(selectedPhoto.timestamp)}</p>
              <p><strong>Rotation:</strong> {selectedPhoto.rotation || 0}° {(selectedPhoto.rotation || 0) === 0 ? '(original)' : '(adjusted by admin)'}</p>
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
              {getPhotoFlags(selectedPhoto.id).length > 0 && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>User Reports:</strong></p>
                  {getPhotoFlags(selectedPhoto.id).map((flag) => (
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
