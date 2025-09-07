/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;
const IMAGE_CACHE = `images-${version}`;

// Cache size limits (in bytes)
const MAX_IMAGE_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

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

// Helper function to manage image cache size
async function manageImageCacheSize() {
	const cache = await caches.open(IMAGE_CACHE);
	const keys = await cache.keys();

	// Calculate total cache size
	let totalSize = 0;
	const cacheEntries = [];

	for (const request of keys) {
		const response = await cache.match(request);
		if (response) {
			const size = parseInt(response.headers.get('content-length') || '0');
			cacheEntries.push({
				request,
				size,
				lastModified: new Date(response.headers.get('last-modified') || Date.now())
			});
			totalSize += size;
		}
	}

	// If over limit, remove oldest entries (LRU)
	if (totalSize > MAX_IMAGE_CACHE_SIZE) {
		console.log(`[Service Worker] Image cache size (${totalSize}) exceeds limit, cleaning up...`);

		// Sort by last modified (oldest first)
		cacheEntries.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());

		// Remove oldest entries until under limit
		let removedSize = 0;
		for (const entry of cacheEntries) {
			if (totalSize - removedSize <= MAX_IMAGE_CACHE_SIZE * 0.8) break; // Keep 20% buffer

			await cache.delete(entry.request);
			removedSize += entry.size;
			console.log(`[Service Worker] Removed cached image: ${entry.request.url}`);
		}
	}
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activating...');

	event.waitUntil(
		(async () => {
			// Delete old caches
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name !== CACHE && name !== IMAGE_CACHE)
					.map((name) => caches.delete(name))
			);

			console.log('[Service Worker] Old caches cleaned up');
		})()
	);

	// Ensure all clients use this service worker immediately
	self.clients.claim();
});

// Helper function to check if URL is an image
function isImageRequest(url) {
	return (
		/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url) ||
		url.includes('firebasestorage.googleapis.com') ||
		url.includes('avatar') ||
		url.includes('photo')
	);
}

// Fetch event - implement cache strategies
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
			const imageCache = await caches.open(IMAGE_CACHE);
			const url = new URL(event.request.url);

			// Check if this is a route we want to cache
			const isRouteCached = ROUTES_TO_CACHE.some(
				(route) => url.pathname === route || url.pathname.startsWith(route + '/')
			);

			// Handle image requests with stale-while-revalidate strategy
			if (isImageRequest(event.request.url)) {
				// Try cache first for images
				const cachedResponse = await imageCache.match(event.request);

				if (cachedResponse) {
					console.log(`[Service Worker] Serving image from cache: ${event.request.url}`);

					// Return cached response immediately, but update in background
					event.waitUntil(
						(async () => {
							try {
								const networkResponse = await fetch(event.request);
								if (networkResponse.status === 200) {
									console.log(`[Service Worker] Updating cached image: ${event.request.url}`);
									await imageCache.put(event.request, networkResponse.clone());
									await manageImageCacheSize();
								}
							} catch {
								console.log(
									`[Service Worker] Background image update failed: ${event.request.url}`
								);
							}
						})()
					);

					return cachedResponse;
				}

				// If not in cache, fetch from network and cache
				try {
					const networkResponse = await fetch(event.request);
					if (networkResponse.status === 200) {
						await imageCache.put(event.request, networkResponse.clone());
						await manageImageCacheSize();
					}
					return networkResponse;
				} catch (error) {
					console.error(`[Service Worker] Failed to fetch image: ${event.request.url}`, error);
					throw error;
				}
			}

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
							} catch {
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
	} else if (event.data && event.data.type === 'CLEAR_CACHES') {
		// Clear all caches for logout
		event.waitUntil(
			(async () => {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map((name) => caches.delete(name)));
				console.log('[Service Worker] All caches cleared');
			})()
		);
	}
});

console.log('[Service Worker] Script loaded');
