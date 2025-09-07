/**
 * Widget Cache Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { widgetCache, CACHE_KEYS } from '../lib/cache';

describe('Widget Cache', () => {
	beforeEach(() => {
		widgetCache.clearAll();
	});

	describe('Basic Cache Operations', () => {
		it('should store and retrieve data', () => {
			const testData = { message: 'hello', count: 42 };
			
			widgetCache.set('test_key', testData);
			const retrieved = widgetCache.get('test_key');
			
			expect(retrieved).toEqual(testData);
		});

		it('should return null for non-existent keys', () => {
			const retrieved = widgetCache.get('non_existent');
			expect(retrieved).toBeNull();
		});

		it('should clear specific cache entries', () => {
			widgetCache.set('key1', 'data1');
			widgetCache.set('key2', 'data2');
			
			widgetCache.clear('key1');
			
			expect(widgetCache.get('key1')).toBeNull();
			expect(widgetCache.get('key2')).toBe('data2');
		});

		it('should clear all cache entries', () => {
			widgetCache.set('key1', 'data1');
			widgetCache.set('key2', 'data2');
			
			widgetCache.clearAll();
			
			expect(widgetCache.size()).toBe(0);
			expect(widgetCache.get('key1')).toBeNull();
			expect(widgetCache.get('key2')).toBeNull();
		});
	});

	describe('TTL (Time To Live)', () => {
		it('should expire data after TTL', () => {
			const testData = { value: 'expires soon' };
			const shortTTL = 10; // 10ms
			
			widgetCache.set('expire_test', testData, shortTTL);
			
			// Should be available immediately
			expect(widgetCache.get('expire_test')).toEqual(testData);
			
			// Wait for expiration and check
			return new Promise<void>((resolve) => {
				setTimeout(() => {
					expect(widgetCache.get('expire_test')).toBeNull();
					resolve();
				}, 15);
			});
		});

		it('should use default TTL when not specified', () => {
			const testData = { value: 'default ttl' };
			
			widgetCache.set('default_ttl', testData);
			const retrieved = widgetCache.get('default_ttl');
			
			expect(retrieved).toEqual(testData);
		});
	});

	describe('Cached Function Helper', () => {
		it('should cache function results', async () => {
			let callCount = 0;
			const mockFetcher = vi.fn(() => {
				callCount++;
				return Promise.resolve({ data: `call_${callCount}` });
			});

			// First call should execute function
			const result1 = await widgetCache.cached('fetcher_test', mockFetcher);
			expect(result1).toEqual({ data: 'call_1' });
			expect(mockFetcher).toHaveBeenCalledOnce();

			// Second call should return cached result
			const result2 = await widgetCache.cached('fetcher_test', mockFetcher);
			expect(result2).toEqual({ data: 'call_1' }); // Same as first call
			expect(mockFetcher).toHaveBeenCalledOnce(); // Not called again
		});

		it('should re-fetch after cache expiration', async () => {
			let callCount = 0;
			const mockFetcher = vi.fn(() => {
				callCount++;
				return Promise.resolve({ data: `call_${callCount}` });
			});

			const shortTTL = 10; // 10ms

			// First call
			const result1 = await widgetCache.cached('expire_fetcher', mockFetcher, shortTTL);
			expect(result1).toEqual({ data: 'call_1' });

			// Wait for expiration and call again
			await new Promise(resolve => setTimeout(resolve, 15));
			
			const result2 = await widgetCache.cached('expire_fetcher', mockFetcher, shortTTL);
			expect(result2).toEqual({ data: 'call_2' }); // New data
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});
	});

	describe('Cache Keys', () => {
		it('should provide predefined cache keys', () => {
			expect(CACHE_KEYS.DAILY_POLL).toBe('daily_poll');
			expect(CACHE_KEYS.BIRTHDAYS).toBe('birthdays');
			expect(CACHE_KEYS.ANALYTICS).toBe('analytics');
			expect(CACHE_KEYS.WEEKLY_FEEDBACK).toBe('weekly_feedback');
			expect(CACHE_KEYS.NOTIFICATIONS).toBe('notifications');
		});
	});
});