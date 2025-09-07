import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { isOnline, hasOfflineData, syncStatus } from '../lib/offline';

describe('Offline Manager', () => {
	it('should initialize stores with correct default values', () => {
		// These should initialize with correct defaults regardless of browser environment
		expect(get(hasOfflineData)).toBe(false);
		expect(get(syncStatus)).toBe('idle');
	});

	it('should have consistent store types', () => {
		// Test that stores are reactive and have the right types
		const onlineValue = get(isOnline);
		const hasDataValue = get(hasOfflineData);
		const statusValue = get(syncStatus);

		expect(typeof onlineValue).toBe('boolean');
		expect(typeof hasDataValue).toBe('boolean');
		expect(['idle', 'syncing', 'synced', 'error'].includes(statusValue)).toBe(true);
	});
});
