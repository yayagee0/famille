import { vi } from 'vitest';

// Mock Firebase services for testing
vi.mock('$lib/firebase', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: vi.fn()
	},
	db: {},
	storage: {},
	getFamilyId: () => 'test-family-id'
}));

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
	value: {
		VITE_FAMILY_ID: 'test-family-id',
		DEV: false
	},
	writable: true
});
