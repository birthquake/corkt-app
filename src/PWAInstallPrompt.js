import React, { useState, useEffect } from 'react';
import { pwaInstaller, networkManager } from './pwaUtils';

// Icons
const InstallIcon = ({ color = "#007bff", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = ({ color = "#6c757d", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PWAInstallPrompt = ({ currentUser }) => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installLoading, setInstallLoading] = useState(false);

  useEffect(() => {
    // Listen for PWA install availability
    const handleInstallAvailable = () => {
      setShowInstallPrompt(true);
    };

    const handleInstallCompleted = () => {
      setShowInstallPrompt(false);
    };

    // Listen for network status changes
    const handleNetworkChange = (status) => {
      setIsOnline(status === 'online');
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);
    networkManager.addListener(handleNetworkChange);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
      networkManager.removeListener(handleNetworkChange);
    };
  }, [currentUser]);

  const handleInstallClick = async () => {
    setInstallLoading(true);
    try {
      const installed = await pwaInstaller.showInstallPrompt();
      if (installed) {
        setShowInstallPrompt(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setInstallLoading(false);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for 3 days
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Network Status Indicator */}
      {!isOnline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '8px',
            textAlign: 'center',
            fontSize: '14px',
            zIndex: 9999,
            fontWeight: '500'
          }}
        >
          📱 You're offline. Some features may be limited.
        </div>
      )}

      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '16px',
            right: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e9ecef',
            zIndex: 1000,
            maxWidth: '400px',
            margin: '0 auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                backgroundColor: '#007bff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <InstallIcon color="white" size={20} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                Install Corkt
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                Get the full experience with offline access
              </p>
            </div>
            
            <button
              onClick={dismissInstallPrompt}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6c757d'
              }}
            >
              <CloseIcon size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={dismissInstallPrompt}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6c757d',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstallClick}
              disabled={installLoading}
              style={{
                flex: 2,
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: installLoading ? 'not-allowed' : 'pointer',
                opacity: installLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {installLoading ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  Installing...
                </>
              ) : (
                <>
                  <InstallIcon color="white" size={16} />
                  Install App
                </>
              )}
            </button>
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
    </>
  );
};

export default PWAInstallPrompt;
