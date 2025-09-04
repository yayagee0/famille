/**
 * Widget Context - Single source of truth for family member data
 * Store-based implementation for better reactivity and composition
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import { buildMemberSkeleton, normalizeEmail } from './users';

interface FamilyMember {
	email: string;
	displayName: string;
	nickname?: string;
	birthday?: string;
	avatarUrl?: string;
}

interface WidgetContextData {
	authEmail: string;
	members: Record<string, FamilyMember>;
}

interface WidgetContext {
	authEmail: string;
	members: Record<string, FamilyMember>;
	current: () => FamilyMember;
	byEmail: (email: string) => FamilyMember | undefined;
}

// Core store for widget context data
const widgetContextStore = writable<WidgetContextData | null>(null);

// Derived stores for easy component access
export const authEmail = derived(widgetContextStore, ($context) => $context?.authEmail || '');
export const members = derived(widgetContextStore, ($context) => $context?.members || {});
export const currentUser = derived(widgetContextStore, ($context) => {
	if (!$context) return undefined;
	return $context.members[$context.authEmail];
});

/**
 * Initialize widget context with user data
 */
export function initializeWidgetContext({
	authUser,
	profiles,
	allowedEmails
}: {
	authUser: { email: string } | null;
	profiles?: Record<string, any>; // Firebase user profiles by email
	allowedEmails: string[];
}): void {
	if (!authUser?.email) {
		throw new Error('No authenticated user provided to widget context');
	}

	const authEmailNormalized = normalizeEmail(authUser.email);
	const familyMembers: Record<string, FamilyMember> = {};

	// Build members map from allowed emails
	for (const email of allowedEmails) {
		const normalizedEmail = normalizeEmail(email);
		const skeleton = buildMemberSkeleton(normalizedEmail);
		
		// Create a new member object with all required fields
		const member: FamilyMember = {
			email: skeleton.email,
			displayName: skeleton.displayName,
			birthday: skeleton.birthday,
			avatarUrl: skeleton.avatarUrl
		};
		
		// Overlay profile data if available
		const profile = profiles?.[normalizedEmail];
		if (profile) {
			member.displayName = 
				profile.displayName || 
				profile.nickname || 
				member.displayName;
			member.nickname = profile.nickname;
			member.avatarUrl = profile.avatarUrl || profile.photoURL;
		}

		familyMembers[normalizedEmail] = member;
	}

	// Update the store with new data
	widgetContextStore.set({
		authEmail: authEmailNormalized,
		members: familyMembers
	});
}

/**
 * Clear widget context (e.g., on logout)
 */
export function clearWidgetContext(): void {
	widgetContextStore.set(null);
}

/**
 * Use widget context in components (maintains backward compatibility)
 */
export function useWidgetContext(): WidgetContext {
	const context = get(widgetContextStore);
	if (!context) {
		throw new Error('Widget context not found. Make sure initializeWidgetContext is called first.');
	}

	return {
		authEmail: context.authEmail,
		members: context.members,
		current: () => context.members[context.authEmail],
		byEmail: (email: string) => context.members[normalizeEmail(email)]
	};
}

/**
 * Get a member by email (reactive store function)
 */
export function getMemberByEmail(email: string): Readable<FamilyMember | undefined> {
	return derived(members, ($members) => $members[normalizeEmail(email)]);
}

// Legacy alias for backward compatibility
export const provideWidgetContext = initializeWidgetContext;