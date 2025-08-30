/**
 * Email allowlist validation for family members
 */

const ALLOWED_EMAILS =
	import.meta.env.VITE_ALLOWED_EMAILS?.split(',').map((email: string) => email.trim()) || [];

/**
 * Check if an email is in the allowed list
 */
export function isEmailAllowed(email: string): boolean {
	if (!email) return false;
	return ALLOWED_EMAILS.includes(email.toLowerCase());
}

/**
 * Get the list of allowed emails
 */
export function getAllowedEmails(): string[] {
	return [...ALLOWED_EMAILS];
}

/**
 * Validate if a user is authorized to access the family hub
 */
export function validateFamilyMember(userEmail: string | null | undefined): boolean {
	if (!userEmail) return false;
	return isEmailAllowed(userEmail);
}

/**
 * Get allowed emails count for display purposes
 */
export function getAllowedEmailsCount(): number {
	return ALLOWED_EMAILS.length;
}
