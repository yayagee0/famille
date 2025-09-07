import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import { FAMILY_ID } from './config';

// Online/offline state management
export const isOnline = writable(browser ? navigator.onLine : true);
export const hasOfflineData = writable(false);
export const syncStatus = writable<'idle' | 'syncing' | 'synced' | 'error'>('idle');

// Offline action queue
const OFFLINE_QUEUE_KEY = 'famille_offline_queue';

interface OfflineAction {
	id: string;
	type: 'post' | 'like' | 'comment';
	timestamp: number;
	data: any;
	retries: number;
}

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

	Object.values(CACHE_KEYS).forEach((key) => {
		localStorage.removeItem(key);
	});
	hasOfflineData.set(false);
	console.log('[Offline Manager] Cleared all cached data');
}

/**
 * Add an action to the offline queue
 */
export function queueOfflineAction(type: OfflineAction['type'], data: any): string {
	if (!browser) return '';

	const action: OfflineAction = {
		id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		type,
		timestamp: Date.now(),
		data,
		retries: 0
	};

	try {
		const queue = getOfflineQueue();
		queue.push(action);
		localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
		hasOfflineData.set(queue.length > 0);
		console.log(`[Offline Manager] Queued ${type} action:`, action.id);
		return action.id;
	} catch (error) {
		console.error('[Offline Manager] Failed to queue action:', error);
		return '';
	}
}

/**
 * Get the current offline queue
 */
function getOfflineQueue(): OfflineAction[] {
	if (!browser) return [];

	try {
		const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
		return queue ? JSON.parse(queue) : [];
	} catch (error) {
		console.error('[Offline Manager] Failed to get offline queue:', error);
		return [];
	}
}

/**
 * Clear the offline queue
 */
function clearOfflineQueue(): void {
	if (!browser) return;

	localStorage.removeItem(OFFLINE_QUEUE_KEY);
	hasOfflineData.set(false);
}

/**
 * Process offline actions when back online
 */
async function processOfflineQueue(): Promise<void> {
	const queue = getOfflineQueue();
	if (queue.length === 0) return;

	console.log(`[Offline Manager] Processing ${queue.length} offline actions...`);
	
	const successfulActions: string[] = [];
	
	for (const action of queue) {
		try {
			await processOfflineAction(action);
			successfulActions.push(action.id);
			console.log(`[Offline Manager] Successfully processed action: ${action.id}`);
		} catch (error) {
			console.error(`[Offline Manager] Failed to process action ${action.id}:`, error);
			
			// Increment retry count
			action.retries += 1;
			
			// Remove action if too many retries (avoid infinite loops)
			if (action.retries >= 3) {
				console.warn(`[Offline Manager] Removing action ${action.id} after ${action.retries} retries`);
				successfulActions.push(action.id);
			}
		}
	}
	
	// Remove successfully processed actions from queue
	if (successfulActions.length > 0) {
		const remainingQueue = queue.filter(action => !successfulActions.includes(action.id));
		localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
		hasOfflineData.set(remainingQueue.length > 0);
	}
}

/**
 * Process a single offline action
 */
async function processOfflineAction(action: OfflineAction): Promise<void> {
	switch (action.type) {
		case 'post':
			await addDoc(collection(db, 'posts'), {
				...action.data,
				createdAt: serverTimestamp(),
				familyId: FAMILY_ID
			});
			break;
			
		case 'like':
			const likeRef = doc(db, 'posts', action.data.postId);
			if (action.data.isLiked) {
				await updateDoc(likeRef, { likes: arrayRemove(action.data.userId) });
			} else {
				await updateDoc(likeRef, { likes: arrayUnion(action.data.userId) });
			}
			break;
			
		case 'comment':
			const commentRef = doc(db, 'posts', action.data.postId);
			await updateDoc(commentRef, { comments: arrayUnion(action.data.comment) });
			break;
			
		default:
			throw new Error(`Unknown action type: ${action.type}`);
	}
}

/**
 * Get cache size and statistics
 */
export function getCacheStats(): { size: number; items: number; keys: string[] } {
	if (!browser) return { size: 0, items: 0, keys: [] };

	let totalSize = 0;
	let itemCount = 0;
	const keys: string[] = [];

	Object.values(CACHE_KEYS).forEach((key) => {
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
	if (!browser) return;
	
	syncStatus.set('syncing');
	console.log('[Offline Manager] Starting offline data sync...');

	try {
		// Process queued offline actions first
		await processOfflineQueue();
		
		// Clear cached data to force fresh fetch from server (network-first strategy)
		clearAllCache();
		
		syncStatus.set('synced');
		console.log('[Offline Manager] Offline data sync completed successfully');
		
		// Reset sync status after a delay
		setTimeout(() => {
			syncStatus.set('idle');
		}, 3000);
		
	} catch (error) {
		console.error('[Offline Manager] Offline data sync failed:', error);
		syncStatus.set('error');
		
		// Reset sync status after a delay
		setTimeout(() => {
			syncStatus.set('idle');
		}, 5000);
	}
}

/**
 * Clear all caches including service worker caches
 */
export function clearAllCachesAndStorage(): void {
	if (!browser) return;

	// Clear localStorage caches
	clearAllCache();
	
	// Clear offline queue
	clearOfflineQueue();
	
	// Clear IndexedDB (Firestore persistence)
	if ('indexedDB' in window) {
		try {
			// Clear Firestore IndexedDB data
			indexedDB.deleteDatabase('firestore');
			console.log('[Offline Manager] Cleared Firestore IndexedDB');
		} catch (error) {
			console.warn('[Offline Manager] Failed to clear IndexedDB:', error);
		}
	}
	
	// Message service worker to clear caches
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
	}
	
	console.log('[Offline Manager] Cleared all caches and storage');
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
