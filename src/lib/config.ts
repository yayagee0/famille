/**
 * Centralized configuration management
 * Reads and validates all environment variables in one place
 */

import { envSchema } from './schemas';

// Validate environment variables
const envValidation = envSchema.safeParse(import.meta.env);
if (!envValidation.success) {
	console.error('Invalid environment variables:', envValidation.error);
	throw new Error('Invalid environment configuration');
}

// Firebase configuration
export const FIREBASE_CONFIG = {
	apiKey: import.meta.env.VITE_FB_API_KEY,
	authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FB_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
	appId: import.meta.env.VITE_FB_APP_ID,
	returnUrl: import.meta.env.VITE_FB_RETURN_URL
};

// App configuration
export const FAMILY_ID = import.meta.env.VITE_FAMILY_ID;

// Parse and normalize allowed emails (lowercase)
export const ALLOWED_EMAILS = import.meta.env.VITE_ALLOWED_EMAILS.split(',').map((email: string) =>
	email.trim().toLowerCase()
);

// Parse birthdays from JSON
export const BIRTHDAYS: Record<string, string> = (() => {
	try {
		const birthdaysData = JSON.parse(import.meta.env.VITE_BIRTHDAYS);
		// Normalize email keys to lowercase
		const normalized: Record<string, string> = {};
		for (const [email, date] of Object.entries(birthdaysData)) {
			normalized[email.toLowerCase()] = date as string;
		}
		return normalized;
	} catch (error) {
		console.error('Failed to parse VITE_BIRTHDAYS:', error);
		return {};
	}
})();
