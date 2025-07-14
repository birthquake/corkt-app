import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig'; // Adjust import path as needed

const AdminPanel = ({ currentUser }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, flagged, recent
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Check if current user is admin (you'll need to implement this check)
  const isAdmin = currentUser?.email === 'corktapp@gmail.com'; // Replace with your email

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const photosRef = collection(db, 'photos');
    const photosQuery = query(photosRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
      const allPhotos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPhotos(allPhotos);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching photos:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Filter photos based on current filter
  const filteredPhotos = photos.filter(photo => {
    // Text search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        photo.caption?.toLowerCase().includes(searchLower) ||
        photo.userEmail?.toLowerCase().includes(searchLower) ||
        photo.location?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filter === 'flagged') {
      return photo.flagged === true;
    } else if (filter === 'recent') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const photoDate = photo.timestamp?.toDate?.() || new Date(photo.timestamp);
      return photoDate > oneDayAgo;
    }
    
    return true; // 'all' filter
  });

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'photos', photoId));
      alert('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo: ' + error.message);
    }
  };

  const handleFlagPhoto = async (photoId, flagged) => {
    try {
      await updateDoc(doc(db, 'photos', photoId), {
        flagged: flagged,
        flaggedAt: flagged ? new Date() : null,
        flaggedBy: flagged ? currentUser.email : null
      });
      alert(flagged ? 'Photo flagged successfully' : 'Photo unflagged successfully');
    } catch (error) {
      console.error('Error flagging photo:', error);
      alert('Error updating photo: ' + error.message);
    }
  };

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
        <p style={{ color: '#6c757d' }}>Loading admin panel...</p>
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
        
        {/* Search and Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search photos, users, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              flex: '1',
              minWidth: '200px'
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
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Stats Bar */}
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
          <strong style={{ color: '#dc3545' }}>Flagged:</strong> {photos.filter(p => p.flagged).length}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: photo.flagged ? '2px solid #dc3545' : '1px solid #dee2e6'
                }}
              >
                {/* Photo */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={photo.photoURL}
                    alt="User photo"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedPhoto(photo)}
                  />
                  {photo.flagged && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      FLAGGED
                    </div>
                  )}
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
                      {photo.userEmail || 'Unknown User'}
                    </div>
                    <div style={{ 
                      color: '#6c757d', 
                      fontSize: '12px'
                    }}>
                      {photo.timestamp?.toDate?.()?.toLocaleString() || 'No timestamp'}
                    </div>
                  </div>

                  {photo.caption && (
                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#343a40',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {photo.caption}
                    </p>
                  )}

                  {photo.location && (
                    <div style={{
                      color: '#6c757d',
                      fontSize: '12px',
                      marginBottom: '12px'
                    }}>
                      📍 {photo.location}
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
                      {photo.flagged ? 'Unflag' : 'Flag'}
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
            ))}
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
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.photoURL}
              alt="Full size photo"
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
            <div style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Photo Details</h3>
              <p><strong>User:</strong> {selectedPhoto.userEmail}</p>
              <p><strong>Caption:</strong> {selectedPhoto.caption || 'No caption'}</p>
              <p><strong>Location:</strong> {selectedPhoto.location || 'No location'}</p>
              <p><strong>Posted:</strong> {selectedPhoto.timestamp?.toDate?.()?.toLocaleString()}</p>
              {selectedPhoto.flagged && (
                <p style={{ color: '#dc3545' }}>
                  <strong>Flagged by:</strong> {selectedPhoto.flaggedBy} on {selectedPhoto.flaggedAt?.toDate?.()?.toLocaleString()}
                </p>
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
