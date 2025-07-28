import React, { useState, useEffect } from 'react';

const IOSInstallPrompt = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if it's iOS Safari and not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Show prompt if: iOS + Safari + not installed + not previously dismissed
    if (isIOS && isSafari && !isStandalone) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Show if never dismissed or dismissed more than 7 days ago
      if (!dismissed || daysSinceDismissed > 7) {
        // Wait a bit for user to engage with app first
        setTimeout(() => {
          setShowIOSPrompt(true);
        }, 10000); // Show after 10 seconds
      }
    }
  }, []);

  const dismissPrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  if (!showIOSPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '16px',
        right: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e1e5e9',
        zIndex: 1000,
        maxWidth: '380px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#007bff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}
        >
          <span style={{ fontSize: '20px' }}>📱</span>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#1d1d1f'
          }}>
            Install Corkt
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '13px', 
            color: '#86868b',
            lineHeight: '1.3'
          }}>
            Add to your home screen for a better experience
          </p>
        </div>
        <button
          onClick={dismissPrompt}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            color: '#86868b',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#1d1d1f', 
          margin: '0 0 12px 0',
          lineHeight: '1.4'
        }}>
          To install this app:
        </p>
        
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            marginRight: '12px',
            flexShrink: 0
          }}>
            1
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#1d1d1f', marginRight: '8px' }}>
              Tap the Share button
            </span>
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#f5f5f7',
              borderRadius: '6px',
              border: '1px solid #d2d2d7'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16,6 12,2 8,6" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="2" x2="12" y2="15" stroke="#007bff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            marginRight: '12px',
            flexShrink: 0
          }}>
            2
          </div>
          <span style={{ fontSize: '14px', color: '#1d1d1f' }}>
            Select "Add to Home Screen"
          </span>
        </div>
      </div>

      {/* Share button animation hint */}
      <div style={{
        backgroundColor: '#f5f5f7',
        borderRadius: '12px',
        padding: '12px',
        textAlign: 'center',
        border: '1px solid #d2d2d7'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#86868b', marginRight: '8px' }}>
            Look for this button at the bottom:
          </span>
          <div style={{
            padding: '6px 10px',
            backgroundColor: '#007bff',
            borderRadius: '8px',
            animation: 'pulse 2s infinite'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16,6 12,2 8,6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="2" x2="12" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <p style={{ 
          fontSize: '11px', 
          color: '#86868b', 
          margin: 0,
          lineHeight: '1.3'
        }}>
          The share button is in Safari's bottom toolbar
        </p>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default IOSInstallPrompt;
