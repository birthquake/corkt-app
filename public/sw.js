const CACHE_NAME = 'corkt-v1.0.0';
const STATIC_CACHE_NAME = 'corkt-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'corkt-dynamic-v1.0.0';

// Files to cache immediately (critical app shell)
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add your critical CSS/JS files here
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static files');
        return cache.addAll(STATIC_FILES.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch((error) => {
        console.error('❌ Failed to cache static files:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (Firebase, Google Maps, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/static/')) {
    // Static assets - cache first strategy
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.pathname === '/' || url.pathname.includes('.html')) {
    // HTML pages - network first, fallback to cache
    event.respondWith(networkFirstStrategy(request));
  } else {
    // Other requests - network first
    event.respondWith(networkFirstStrategy(request));
  }
});

// Cache first strategy (for static assets)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

// Network first strategy (for dynamic content)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    return new Response('Content not available offline', { status: 503 });
  }
}

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'upload-photos') {
    event.waitUntil(uploadPendingPhotos());
  } else if (event.tag === 'sync-likes') {
    event.waitUntil(syncPendingLikes());
  }
});

// Upload photos that were queued while offline
async function uploadPendingPhotos() {
  try {
    console.log('📸 Syncing pending photo uploads...');
    
    // Send message to main app to handle uploads
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_UPLOADS'
      });
    });
  } catch (error) {
    console.error('❌ Failed to sync pending uploads:', error);
  }
}

// Sync likes that were made while offline
async function syncPendingLikes() {
  try {
    console.log('❤️ Syncing pending likes...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_LIKES'
      });
    });
  } catch (error) {
    console.error('❌ Failed to sync pending likes:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('📨 Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
