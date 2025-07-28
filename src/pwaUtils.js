// PWA Utilities for Corkt App (Simplified - No Push Notifications)
// Add this file to your src/ directory

// Service Worker Registration - FIXED VERSION
export const registerServiceWorker = () => {
  console.log('🔧 PWA: registerServiceWorker function called');
  
  if ('serviceWorker' in navigator) {
    console.log('🔧 PWA: Service Worker API available');
    
    // Register immediately instead of waiting for 'load' event
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateAvailableNotification();
            }
          });
        });
        
        return registration;
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  } else {
    console.log('❌ Service Worker not supported in this browser');
  }
};

// Show update notification
const showUpdateAvailableNotification = () => {
  // You can integrate this with your existing notification system
  if (window.confirm('A new version of Corkt is available. Reload to update?')) {
    window.location.reload();
  }
};

// Install Prompt Management
class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.setupInstallPrompt();
  }
  
  setupInstallPrompt() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
    
    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ App installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
    
    // Check for iOS standalone mode
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
  }
  
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return false;
    }
    
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('📱 Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
      }
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
      return false;
    }
  }
  
  showInstallButton() {
    // Dispatch custom event for your React components to listen to
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }
  
  hideInstallButton() {
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  }
  
  canInstall() {
    return !!this.deferredPrompt && !this.isInstalled;
  }
}

export const pwaInstaller = new PWAInstallManager();

// Offline Storage for pending actions
export class OfflineManager {
  constructor() {
    this.dbName = 'CorktOfflineDB';
    this.version = 1;
    this.db = null;
    this.initDB();
  }
  
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for pending photo uploads
        if (!db.objectStoreNames.contains('pendingUploads')) {
          const uploadsStore = db.createObjectStore('pendingUploads', { keyPath: 'id', autoIncrement: true });
          uploadsStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store for pending likes
        if (!db.objectStoreNames.contains('pendingLikes')) {
          const likesStore = db.createObjectStore('pendingLikes', { keyPath: 'id', autoIncrement: true });
          likesStore.createIndex('photoId', 'photoId');
        }
      };
    });
  }
  
  async addPendingUpload(photoData) {
    const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
    const store = transaction.objectStore('pendingUploads');
    
    const uploadData = {
      ...photoData,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    return store.add(uploadData);
  }
  
  async getPendingUploads() {
    const transaction = this.db.transaction(['pendingUploads'], 'readonly');
    const store = transaction.objectStore('pendingUploads');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async removePendingUpload(id) {
    const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
    const store = transaction.objectStore('pendingUploads');
    return store.delete(id);
  }
  
  async addPendingLike(photoId, userId, action) {
    const transaction = this.db.transaction(['pendingLikes'], 'readwrite');
    const store = transaction.objectStore('pendingLikes');
    
    const likeData = {
      photoId,
      userId,
      action, // 'like' or 'unlike'
      timestamp: Date.now()
    };
    
    return store.add(likeData);
  }
  
  async getPendingLikes() {
    const transaction = this.db.transaction(['pendingLikes'], 'readonly');
    const store = transaction.objectStore('pendingLikes');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async removePendingLike(id) {
    const transaction = this.db.transaction(['pendingLikes'], 'readwrite');
    const store = transaction.objectStore('pendingLikes');
    return store.delete(id);
  }
}

export const offlineManager = new OfflineManager();

// Network status monitoring
export class NetworkManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
      this.syncOfflineActions();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }
  
  async syncOfflineActions() {
    if (!this.isOnline) return;
    
    console.log('🔄 Syncing offline actions...');
    
    // Trigger background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('upload-photos');
      await registration.sync.register('sync-likes');
    }
  }
}

export const networkManager = new NetworkManager();
