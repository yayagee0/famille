/**
 * Simple Widget Cache for Bandwidth Optimization
 * Provides 1-hour TTL caching for widget data
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

class WidgetCache {
	private cache = new Map<string, CacheEntry<any>>();
	private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

	/**
	 * Get cached data if still valid
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const isExpired = Date.now() - entry.timestamp > entry.ttl;
		if (isExpired) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	/**
	 * Set cache data with optional TTL
	 */
	set<T>(key: string, data: T, ttl?: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.DEFAULT_TTL
		});
	}

	/**
	 * Clear specific cache entry
	 */
	clear(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Clear all cached data
	 */
	clearAll(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Helper to create cache-aware async function
	 */
	async cached<T>(
		key: string, 
		fetcher: () => Promise<T>, 
		ttl?: number
	): Promise<T> {
		// Try to get from cache first
		const cached = this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		// Fetch new data and cache it
		const data = await fetcher();
		this.set(key, data, ttl);
		return data;
	}
}

// Export singleton instance
export const widgetCache = new WidgetCache();

// Cache keys for common widgets
export const CACHE_KEYS = {
	DAILY_POLL: 'daily_poll',
	BIRTHDAYS: 'birthdays',
	ANALYTICS: 'analytics',
	WEEKLY_FEEDBACK: 'weekly_feedback',
	NOTIFICATIONS: 'notifications'
} as const;