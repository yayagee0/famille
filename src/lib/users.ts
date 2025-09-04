/**
 * User utility functions
 */

import { ALLOWED_EMAILS, BIRTHDAYS } from './config';
import dayjs from 'dayjs';
import { getDisplayName } from './getDisplayName';

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Check if email is allowed
 */
export function isAllowed(email: string): boolean {
	if (!email) return false;
	return ALLOWED_EMAILS.includes(normalizeEmail(email));
}

/**
 * Get default display name from email
 */
export function defaultDisplayName(email: string): string {
	return email.split('@')[0];
}

/**
 * Build member skeleton with basic info from environment
 */
export function buildMemberSkeleton(email: string): {
	email: string;
	displayName: string;
	birthday?: string;
	avatarUrl?: string;
} {
	const normalizedEmail = normalizeEmail(email);
	return {
		email: normalizedEmail,
		displayName: getDisplayName(normalizedEmail, { nickname: undefined }),
		birthday: BIRTHDAYS[normalizedEmail],
		avatarUrl: undefined
	};
}

/**
 * Calculate age on a specific date
 */
export function ageOn(dateISO: string, on?: Date): number {
	const birthDate = dayjs(dateISO);
	const targetDate = dayjs(on || new Date());
	return targetDate.diff(birthDate, 'year');
}

/**
 * Get all allowed emails
 */
export function getAllowedEmails(): string[] {
	return [...ALLOWED_EMAILS];
}

/**
 * Validate if a user is authorized
 */
export function validateFamilyMember(userEmail: string | null | undefined): boolean {
	if (!userEmail) return false;
	return isAllowed(userEmail);
}
