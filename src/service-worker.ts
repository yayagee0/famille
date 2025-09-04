/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

// Define routes to cache
const ROUTES_TO_CACHE = ['/', '/dashboard', '/feed', '/playground', '/profile'];

// Define static assets to cache (SvelteKit provides these in the 'files' array)
const ASSETS_TO_CACHE = [
	...build, // The app build files
	...files // Static files from the static directory
];

// Install event - cache all necessary files
self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installing...');

	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);

			// Cache static assets
			await cache.addAll(ASSETS_TO_CACHE);

			// Cache routes by fetching them (this will trigger SvelteKit's SSR)
			for (const route of ROUTES_TO_CACHE) {
				try {
					const response = await fetch(route);
					if (response.status === 200) {
						await cache.put(route, response);
					}
				} catch (error) {
					console.warn(`[Service Worker] Failed to cache route: ${route}`, error);
				}
			}

			console.log('[Service Worker] Cached all static assets and routes');
		})()
	);

	// Force the waiting service worker to become the active service worker
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activating...');

	event.waitUntil(
		(async () => {
			// Delete old caches
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames.filter((name) => name !== CACHE).map((name) => caches.delete(name))
			);

			console.log('[Service Worker] Old caches cleaned up');
		})()
	);

	// Ensure all clients use this service worker immediately
	self.clients.claim();
});

// Fetch event - implement cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
	// Only handle GET requests
	if (event.request.method !== 'GET') return;

	// Skip non-HTTP requests
	if (!event.request.url.startsWith('http')) return;

	// Skip Firebase API requests - let them handle their own caching
	if (
		event.request.url.includes('firebaseapp.com') ||
		event.request.url.includes('googleapis.com') ||
		event.request.url.includes('firestore.googleapis.com')
	) {
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const url = new URL(event.request.url);

			// Check if this is a route we want to cache
			const isRouteCached = ROUTES_TO_CACHE.some(
				(route) => url.pathname === route || url.pathname.startsWith(route + '/')
			);

			// For cached routes and static assets, use cache-first strategy
			if (isRouteCached || ASSETS_TO_CACHE.some((asset) => event.request.url.endsWith(asset))) {
				// Try cache first
				const cachedResponse = await cache.match(event.request);

				if (cachedResponse) {
					console.log(`[Service Worker] Serving from cache: ${event.request.url}`);

					// Return cached response immediately
					// But also try to update cache in background (stale-while-revalidate)
					event.waitUntil(
						(async () => {
							try {
								const networkResponse = await fetch(event.request);
								if (networkResponse.status === 200) {
									console.log(`[Service Worker] Updating cache for: ${event.request.url}`);
									await cache.put(event.request, networkResponse.clone());
								}
							} catch (error) {
								console.log(`[Service Worker] Background update failed for: ${event.request.url}`);
							}
						})()
					);

					return cachedResponse;
				}
			}

			// If not in cache, or not a cached resource, fetch from network
			try {
				console.log(`[Service Worker] Fetching from network: ${event.request.url}`);
				const networkResponse = await fetch(event.request);

				// Cache successful responses for cached routes
				if (networkResponse.status === 200 && isRouteCached) {
					await cache.put(event.request, networkResponse.clone());
				}

				return networkResponse;
			} catch (error) {
				console.error(`[Service Worker] Network request failed: ${event.request.url}`, error);

				// For navigation requests, return a cached version or offline page
				if (event.request.mode === 'navigate') {
					const cachedResponse = (await cache.match('/')) || (await cache.match('/dashboard'));
					if (cachedResponse) {
						return cachedResponse;
					}
				}

				// For other requests, throw the error
				throw error;
			}
		})()
	);
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

console.log('[Service Worker] Script loaded');
