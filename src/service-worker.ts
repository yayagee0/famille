/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE_NAME = `famille-cache-${version}`;

// Routes to cache for offline access
const ROUTES_TO_CACHE = [
	'/',
	'/dashboard',
	'/feed',
	'/playground', 
	'/profile'
];

// Files to cache (static assets)
const FILES_TO_CACHE = [
	...build, // SvelteKit build files
	...files  // Static files from /static
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
	console.log('Service Worker installing...');
	
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('Caching essential files');
			return cache.addAll([...FILES_TO_CACHE, ...ROUTES_TO_CACHE]);
		})
	);
	
	// Force the waiting service worker to become the active service worker
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('Service Worker activated');
	
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => {
						console.log('Deleting old cache:', cacheName);
						return caches.delete(cacheName);
					})
			);
		})
	);
	
	// Take control of all clients immediately
	self.clients.claim();
});

// Fetch event - implement cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests and external requests
	if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
		return;
	}

	// Handle navigation requests (HTML pages)
	if (event.request.mode === 'navigate') {
		event.respondWith(handleNavigationRequest(event.request));
		return;
	}

	// Handle static assets
	event.respondWith(handleAssetRequest(event.request));
});

/**
 * Handle navigation requests with cache-first, then network strategy
 */
async function handleNavigationRequest(request) {
	try {
		// Try cache first for faster loading
		const cachedResponse = await caches.match(request);
		
		if (cachedResponse) {
			// Serve cached version immediately
			console.log('Serving from cache:', request.url);
			
			// Try to fetch fresh data in background and update cache
			fetchAndUpdateCache(request).catch(console.error);
			
			return cachedResponse;
		}

		// If not in cache, try network
		const networkResponse = await fetch(request);
		
		if (networkResponse.ok) {
			// Cache successful network responses
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, networkResponse.clone());
			console.log('Cached fresh response:', request.url);
		}
		
		return networkResponse;
		
	} catch (error) {
		console.error('Network and cache failed for:', request.url, error);
		
		// Fallback to a cached route or offline page
		const cache = await caches.open(CACHE_NAME);
		const fallback = await cache.match('/') || await cache.match('/dashboard');
		
		if (fallback) {
			return fallback;
		}
		
		// Last resort: return a basic offline response
		return new Response(
			'<html><body><h1>Offline</h1><p>You are offline and this page is not cached.</p></body></html>',
			{ 
				headers: { 'Content-Type': 'text/html' },
				status: 503,
				statusText: 'Service Unavailable'
			}
		);
	}
}

/**
 * Handle static asset requests
 */
async function handleAssetRequest(request) {
	try {
		// Try cache first for static assets
		const cachedResponse = await caches.match(request);
		
		if (cachedResponse) {
			return cachedResponse;
		}

		// If not cached, fetch from network
		const networkResponse = await fetch(request);
		
		if (networkResponse.ok) {
			// Cache the asset
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, networkResponse.clone());
		}
		
		return networkResponse;
		
	} catch (error) {
		console.error('Failed to fetch asset:', request.url, error);
		
		// For failed asset requests, just return the error
		// Don't try to serve HTML fallback for JS/CSS/images
		return new Response('', { status: 404, statusText: 'Not Found' });
	}
}

/**
 * Fetch fresh data in background and update cache
 */
async function fetchAndUpdateCache(request) {
	try {
		const networkResponse = await fetch(request);
		
		if (networkResponse.ok) {
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, networkResponse.clone());
			console.log('Background cache update:', request.url);
			
			// Notify clients about fresh data
			const clients = await self.clients.matchAll();
			clients.forEach(client => {
				client.postMessage({
					type: 'CACHE_UPDATED',
					url: request.url
				});
			});
		}
		
	} catch (error) {
		console.log('Background fetch failed:', request.url, error);
	}
}