/**
 * Widget Context - Single source of truth for family member data
 */

import { getContext, setContext } from 'svelte';
import { ALLOWED_EMAILS } from './config';
import { buildMemberSkeleton, normalizeEmail } from './users';

interface FamilyMember {
	email: string;
	displayName: string;
	nickname?: string;
	birthday?: string;
	avatarUrl?: string;
}

interface WidgetContext {
	authEmail: string;
	members: Record<string, FamilyMember>;
	current: () => FamilyMember;
	byEmail: (email: string) => FamilyMember | undefined;
}

const WIDGET_CONTEXT_KEY = 'widget-context';

/**
 * Provide widget context at the app level
 */
export function provideWidgetContext({
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

	const authEmail = normalizeEmail(authUser.email);
	const members: Record<string, FamilyMember> = {};

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
				profile.nickname || 
				profile.displayName || 
				member.displayName;
			member.nickname = profile.nickname;
			member.avatarUrl = profile.avatarUrl || profile.photoURL;
		}

		members[normalizedEmail] = member;
	}

	const context: WidgetContext = {
		authEmail,
		members,
		current: () => members[authEmail],
		byEmail: (email: string) => members[normalizeEmail(email)]
	};

	setContext(WIDGET_CONTEXT_KEY, context);
}

/**
 * Use widget context in components
 */
export function useWidgetContext(): WidgetContext {
	const context = getContext<WidgetContext>(WIDGET_CONTEXT_KEY);
	if (!context) {
		throw new Error('Widget context not found. Make sure provideWidgetContext is called in a parent component.');
	}
	return context;
}