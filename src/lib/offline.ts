import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Online/offline state management
export const isOnline = writable(browser ? navigator.onLine : true);
export const hasOfflineData = writable(false);

if (browser) {
	// Listen for online/offline events
	window.addEventListener('online', () => {
		console.log('[Offline Manager] Back online');
		isOnline.set(true);
		syncOfflineData();
	});
	
	window.addEventListener('offline', () => {
		console.log('[Offline Manager] Gone offline');
		isOnline.set(false);
	});
}

// Cache keys for different data types
const CACHE_KEYS = {
	POSTS: 'famille_posts_cache',
	USER_PROFILES: 'famille_users_cache',
	AYAT: 'famille_ayat_cache',
	GAMES: 'famille_games_cache'
} as const;

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
	POSTS: 5 * 60 * 1000, // 5 minutes
	USER_PROFILES: 30 * 60 * 1000, // 30 minutes
	AYAT: 7 * 24 * 60 * 60 * 1000, // 7 days
	GAMES: 10 * 60 * 1000 // 10 minutes
} as const;

interface CacheItem {
	data: any;
	timestamp: number;
	version: string;
}

/**
 * Store data in localStorage with timestamp and version
 */
export function cacheData(key: string, data: any, version = '1.0'): void {
	if (!browser) return;
	
	try {
		const cacheItem: CacheItem = {
			data,
			timestamp: Date.now(),
			version
		};
		localStorage.setItem(key, JSON.stringify(cacheItem));
		console.log(`[Offline Manager] Cached data for key: ${key}`);
	} catch (error) {
		console.error('[Offline Manager] Failed to cache data:', error);
	}
}

/**
 * Retrieve data from localStorage if not expired
 */
export function getCachedData(key: string, maxAge: number): any | null {
	if (!browser) return null;
	
	try {
		const cached = localStorage.getItem(key);
		if (!cached) return null;
		
		const cacheItem: CacheItem = JSON.parse(cached);
		const age = Date.now() - cacheItem.timestamp;
		
		if (age > maxAge) {
			localStorage.removeItem(key);
			return null;
		}
		
		console.log(`[Offline Manager] Retrieved cached data for key: ${key}`);
		return cacheItem.data;
	} catch (error) {
		console.error('[Offline Manager] Failed to retrieve cached data:', error);
		return null;
	}
}

/**
 * Check if we have fresh cached data
 */
export function hasFreshCache(key: string, maxAge: number): boolean {
	return getCachedData(key, maxAge) !== null;
}

/**
 * Store posts in cache
 */
export function cachePosts(posts: any[]): void {
	cacheData(CACHE_KEYS.POSTS, posts);
	hasOfflineData.set(true);
}

/**
 * Get cached posts
 */
export function getCachedPosts(): any[] | null {
	return getCachedData(CACHE_KEYS.POSTS, CACHE_EXPIRY.POSTS);
}

/**
 * Store user profiles in cache
 */
export function cacheUserProfiles(users: any[]): void {
	cacheData(CACHE_KEYS.USER_PROFILES, users);
}

/**
 * Get cached user profiles
 */
export function getCachedUserProfiles(): any[] | null {
	return getCachedData(CACHE_KEYS.USER_PROFILES, CACHE_EXPIRY.USER_PROFILES);
}

/**
 * Store Ayat in cache (for offline access)
 */
export function cacheAyat(ayat: any[]): void {
	cacheData(CACHE_KEYS.AYAT, ayat);
}

/**
 * Get cached Ayat
 */
export function getCachedAyat(): any[] | null {
	return getCachedData(CACHE_KEYS.AYAT, CACHE_EXPIRY.AYAT);
}

/**
 * Store game data in cache
 */
export function cacheGames(games: any[]): void {
	cacheData(CACHE_KEYS.GAMES, games);
}

/**
 * Get cached games
 */
export function getCachedGames(): any[] | null {
	return getCachedData(CACHE_KEYS.GAMES, CACHE_EXPIRY.GAMES);
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
	if (!browser) return;
	
	Object.values(CACHE_KEYS).forEach(key => {
		localStorage.removeItem(key);
	});
	hasOfflineData.set(false);
	console.log('[Offline Manager] Cleared all cached data');
}

/**
 * Get cache size and statistics
 */
export function getCacheStats(): { size: number; items: number; keys: string[] } {
	if (!browser) return { size: 0, items: 0, keys: [] };
	
	let totalSize = 0;
	let itemCount = 0;
	const keys: string[] = [];
	
	Object.values(CACHE_KEYS).forEach(key => {
		const item = localStorage.getItem(key);
		if (item) {
			totalSize += item.length;
			itemCount++;
			keys.push(key);
		}
	});
	
	return {
		size: totalSize,
		items: itemCount,
		keys
	};
}

/**
 * Sync offline data when coming back online
 * This function should be called when the app detects it's back online
 */
async function syncOfflineData(): Promise<void> {
	console.log('[Offline Manager] Starting offline data sync...');
	
	// This is where you would implement conflict resolution
	// For now, we'll just invalidate cache to force fresh data fetch
	// In a more sophisticated implementation, you would:
	// 1. Compare local cached data with server data
	// 2. Resolve conflicts (server wins according to requirements)
	// 3. Upload any pending local changes
	
	// For this implementation, we'll clear cache to force fresh data fetch
	clearAllCache();
	
	console.log('[Offline Manager] Offline data sync completed');
}

/**
 * Register service worker for offline support
 */
export async function registerServiceWorker(): Promise<void> {
	if (!browser || !('serviceWorker' in navigator)) {
		console.log('[Offline Manager] Service Worker not supported');
		return;
	}
	
	try {
		console.log('[Offline Manager] Registering Service Worker...');
		const registration = await navigator.serviceWorker.register('/service-worker.js');
		
		registration.addEventListener('updatefound', () => {
			console.log('[Offline Manager] Service Worker update found');
			const newWorker = registration.installing;
			
			if (newWorker) {
				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						console.log('[Offline Manager] New Service Worker available');
						// Optionally notify user about update
					}
				});
			}
		});
		
		console.log('[Offline Manager] Service Worker registered successfully');
	} catch (error) {
		console.error('[Offline Manager] Service Worker registration failed:', error);
	}
}