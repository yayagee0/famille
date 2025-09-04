import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
	initializeWidgetContext, 
	clearWidgetContext, 
	useWidgetContext,
	authEmail,
	members,
	currentUser,
	getMemberByEmail
} from '../lib/widget-context';

describe('Widget Context Store', () => {
	const mockAllowedEmails = [
		'test1@example.com',
		'test2@example.com'
	];

	const mockAuthUser = { email: 'test1@example.com' };

	beforeEach(() => {
		// Clear context before each test
		clearWidgetContext();
	});

	it('should initialize widget context with user data', () => {
		initializeWidgetContext({
			authUser: mockAuthUser,
			allowedEmails: mockAllowedEmails
		});

		// Test stores are populated
		expect(get(authEmail)).toBe('test1@example.com');
		expect(Object.keys(get(members))).toHaveLength(2);
		expect(get(currentUser)).toBeDefined();
		expect(get(currentUser)?.email).toBe('test1@example.com');
	});

	it('should provide backward compatible useWidgetContext function', () => {
		initializeWidgetContext({
			authUser: mockAuthUser,
			allowedEmails: mockAllowedEmails
		});

		const context = useWidgetContext();
		
		expect(context.authEmail).toBe('test1@example.com');
		expect(Object.keys(context.members)).toHaveLength(2);
		expect(context.current().email).toBe('test1@example.com');
		expect(context.byEmail('test2@example.com')).toBeDefined();
	});

	it('should handle profile overlay correctly', () => {
		const mockProfiles = {
			'test1@example.com': {
				displayName: 'Test User 1',
				nickname: 'T1',
				avatarUrl: 'https://example.com/avatar1.jpg'
			}
		};

		initializeWidgetContext({
			authUser: mockAuthUser,
			profiles: mockProfiles,
			allowedEmails: mockAllowedEmails
		});

		const context = useWidgetContext();
		const currentUserData = context.current();
		
		expect(currentUserData.displayName).toBe('Test User 1');
		expect(currentUserData.nickname).toBe('T1');
		expect(currentUserData.avatarUrl).toBe('https://example.com/avatar1.jpg');
	});

	it('should clear widget context', () => {
		initializeWidgetContext({
			authUser: mockAuthUser,
			allowedEmails: mockAllowedEmails
		});

		// Verify context is set
		expect(get(authEmail)).toBe('test1@example.com');

		clearWidgetContext();

		// Verify context is cleared
		expect(get(authEmail)).toBe('');
		expect(Object.keys(get(members))).toHaveLength(0);
		expect(get(currentUser)).toBeUndefined();
	});

	it('should throw error when useWidgetContext called without initialization', () => {
		expect(() => useWidgetContext()).toThrow('Widget context not found');
	});

	it('should provide reactive member lookup', () => {
		initializeWidgetContext({
			authUser: mockAuthUser,
			allowedEmails: mockAllowedEmails
		});

		const memberStore = getMemberByEmail('test2@example.com');
		const member = get(memberStore);
		
		expect(member).toBeDefined();
		expect(member?.email).toBe('test2@example.com');
	});

	it('should throw error when no authenticated user provided', () => {
		expect(() => {
			initializeWidgetContext({
				authUser: null,
				allowedEmails: mockAllowedEmails
			});
		}).toThrow('No authenticated user provided to widget context');
	});
});