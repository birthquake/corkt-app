import React from 'react';

const AdminPanel = ({ currentUser }) => {
  // REPLACE WITH YOUR ACTUAL EMAIL
  const adminEmail = 'corktapp@gmail.com';
  const userEmail = currentUser?.email || '';
  const isAdmin = userEmail === adminEmail;

  // Safe console logging
  try {
    console.log('AdminPanel Debug:');
    console.log('User email:', userEmail);
    console.log('Admin email:', adminEmail);
    console.log('Is admin:', isAdmin);
  } catch (e) {
    console.log('Console logging failed');
  }

  return (
    <div style={{ 
      padding: '20px', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          color: '#333', 
          marginBottom: '20px',
          fontSize: '24px'
        }}>
          Admin Panel Status
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Current User:</strong> {userEmail || 'Not logged in'}</p>
          <p><strong>Required Admin:</strong> {adminEmail}</p>
          <p><strong>Admin Access:</strong> {isAdmin ? 'GRANTED ✅' : 'DENIED ❌'}</p>
        </div>

        {!currentUser ? (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            padding: '15px', 
            borderRadius: '5px',
            border: '1px solid orange',
            marginTop: '20px'
          }}>
            <strong>Please log in first</strong>
          </div>
        ) : !isAdmin ? (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            padding: '15px', 
            borderRadius: '5px',
            border: '1px solid red',
            marginTop: '20px'
          }}>
            <strong>Access Denied</strong><br/>
            Make sure the email in AdminPanel.js matches your login email exactly.
          </div>
        ) : (
          <div style={{ 
            backgroundColor: '#d4edda', 
            padding: '15px', 
            borderRadius: '5px',
            border: '1px solid green',
            marginTop: '20px'
          }}>
            <strong>Admin Access Granted!</strong><br/>
            Ready to add full admin panel functionality.
          </div>
        )}

        <div style={{ 
          marginTop: '30px', 
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Debug Info:</strong><br/>
          - React error fixed<br/>
          - Safe object handling<br/>
          - No Google Maps dependencies<br/>
          - Simplified component structure
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
