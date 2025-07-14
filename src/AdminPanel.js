import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const AdminPanel = ({ currentUser }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);

  // REPLACE WITH YOUR ACTUAL EMAIL
  const adminEmail = 'corktapp@gmail.com';
  const userEmail = currentUser?.email || '';
  const isAdmin = userEmail === adminEmail;

  const addDebugInfo = (message) => {
    console.log('DEBUG:', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addDebugInfo('useEffect started');
    
    if (!isAdmin) {
      addDebugInfo('User is not admin, stopping');
      setLoading(false);
      return;
    }

    addDebugInfo('User is admin, starting photo query');

    try {
      addDebugInfo('Creating photos collection reference');
      const photosRef = collection(db, 'photos');
      
      addDebugInfo('Creating query with orderBy');
      const photosQuery = query(photosRef, orderBy('timestamp', 'desc'));
      
      addDebugInfo('Setting up onSnapshot listener');
      const unsubscribe = onSnapshot(
        photosQuery, 
        (snapshot) => {
          addDebugInfo(`onSnapshot success - got ${snapshot.docs.length} documents`);
          
          try {
            const allPhotos = snapshot.docs.map((doc) => {
              const data = doc.data();
              addDebugInfo(`Processing photo ${doc.id} - has data: ${!!data}`);
              return {
                id: doc.id,
                ...data,
              };
            });
            
            addDebugInfo(`Successfully processed ${allPhotos.length} photos`);
            setPhotos(allPhotos);
            setLoading(false);
            setError('');
          } catch (processingError) {
            addDebugInfo(`Error processing photos: ${processingError.message}`);
            setError('Error processing photos: ' + processingError.message);
            setLoading(false);
          }
        }, 
        (queryError) => {
          addDebugInfo(`onSnapshot error: ${queryError.message}`);
          setError('Firebase query error: ' + queryError.message);
          setLoading(false);
        }
      );

      addDebugInfo('onSnapshot listener set up successfully');
      
      return () => {
        addDebugInfo('Cleanup: unsubscribing from listener');
        unsubscribe();
      };
    } catch (setupError) {
      addDebugInfo(`Error setting up query: ${setupError.message}`);
      setError('Error setting up Firebase query: ' + setupError.message);
      setLoading(false);
    }
  }, [isAdmin]);

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

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          color: '#343a40',
          fontSize: '28px',
          fontWeight: '600'
        }}>
          Admin Panel Debug
        </h1>
        
        <div style={{
          marginBottom: '16px',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Logged in as: <strong>{userEmail}</strong>
        </div>

        {/* Status */}
        <div style={{
          backgroundColor: loading ? '#fff3cd' : error ? '#f8d7da' : '#d4edda',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${loading ? '#ffeaa7' : error ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          <strong>Status:</strong> {loading ? 'Loading photos...' : error ? 'Error occurred' : `Success - ${photos.length} photos loaded`}
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
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Debug Info */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '16px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#343a40' }}>Debug Log:</h4>
          {debugInfo.map((info, index) => (
            <div key={index} style={{
              fontSize: '12px',
              color: '#6c757d',
              marginBottom: '4px',
              fontFamily: 'monospace'
            }}>
              {info}
            </div>
          ))}
        </div>

        {/* Photos Preview */}
        {!loading && !error && photos.length > 0 && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '6px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#343a40' }}>Photos Found: {photos.length}</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '10px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {photos.slice(0, 10).map((photo, index) => (
                <div key={photo.id} style={{
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                  fontSize: '12px'
                }}>
                  <div><strong>#{index + 1}</strong></div>
                  <div>ID: {photo.id.substring(0, 8)}...</div>
                  <div>User: {photo.userEmail ? photo.userEmail.substring(0, 15) + '...' : 'No email'}</div>
                  <div>Has image: {photo.imageUrl || photo.photoURL ? '✅' : '❌'}</div>
                  <div>Caption: {photo.caption ? photo.caption.substring(0, 20) + '...' : 'No caption'}</div>
                </div>
              ))}
              {photos.length > 10 && (
                <div style={{
                  backgroundColor: '#e9ecef',
                  padding: '8px',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#6c757d'
                }}>
                  +{photos.length - 10} more photos
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Photos Message */}
        {!loading && !error && photos.length === 0 && (
          <div style={{
            backgroundColor: '#fff3cd',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #ffeaa7'
          }}>
            <strong>No photos found in the database.</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              This could mean:
            </p>
            <ul style={{ margin: '8px 0 0 16px', fontSize: '14px' }}>
              <li>No photos have been uploaded yet</li>
              <li>Photos are in a different collection</li>
              <li>Database structure is different than expected</li>
            </ul>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e9ecef',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '20px auto'
            }} />
            <p style={{ color: '#6c757d' }}>Loading photos...</p>
          </div>
        )}
      </div>

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
