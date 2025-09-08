/**
 * User Preferences System for FamilyBot
 * 
 * Tracks user choices to bias future suggestions:
 * - Poll option preferences (pasta, pizza, etc.)
 * - Story theme preferences (adventure, family, etc.)
 * - Interaction patterns for personalization
 */

import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	increment,
	serverTimestamp,
	type Timestamp
} from 'firebase/firestore';
import { db } from '$lib/firebase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserPreferences {
	uid: string;
	pollChoices: Record<string, number>; // option -> count
	storyThemes: Record<string, number>; // theme -> count
	feedbackSent: number;
	lastUpdated: Timestamp;
	createdAt: Timestamp;
}

export interface PreferenceCategory {
	poll: 'pollChoices';
	story: 'storyThemes';
	feedback: 'feedbackSent';
}

// ============================================================================
// PREFERENCE FUNCTIONS
// ============================================================================

/**
 * Update user preference counter
 * @param uid User ID
 * @param category Category of preference (poll, story, feedback)
 * @param choice Specific choice made (for polls/stories) or null for feedback
 */
export async function updatePreference(
	uid: string,
	category: keyof PreferenceCategory,
	choice?: string
): Promise<void> {
	try {
		const preferencesRef = doc(db, 'preferences', uid);
		const preferencesDoc = await getDoc(preferencesRef);

		if (!preferencesDoc.exists()) {
			// Initialize new preferences document
			const initialPreferences: UserPreferences = {
				uid,
				pollChoices: {},
				storyThemes: {},
				feedbackSent: 0,
				lastUpdated: serverTimestamp() as Timestamp,
				createdAt: serverTimestamp() as Timestamp
			};

			await setDoc(preferencesRef, initialPreferences);
		}

		// Update the specific preference
		const updateData: any = {
			lastUpdated: serverTimestamp()
		};

		if (category === 'feedback') {
			updateData.feedbackSent = increment(1);
		} else if (choice) {
			const fieldPath = category === 'poll' ? 'pollChoices' : 'storyThemes';
			updateData[`${fieldPath}.${choice}`] = increment(1);
		}

		await updateDoc(preferencesRef, updateData);

		console.log(`[Preferences] Updated ${category} preference for user ${uid}${choice ? ` (${choice})` : ''}`);
	} catch (error) {
		console.error('[Preferences] Failed to update preference:', error);
	}
}

/**
 * Get user preferences or return empty defaults
 * @param uid User ID
 * @returns UserPreferences object
 */
export async function getPreferences(uid: string): Promise<UserPreferences> {
	try {
		const preferencesDoc = await getDoc(doc(db, 'preferences', uid));

		if (preferencesDoc.exists()) {
			return preferencesDoc.data() as UserPreferences;
		} else {
			// Return default empty preferences
			return {
				uid,
				pollChoices: {},
				storyThemes: {},
				feedbackSent: 0,
				lastUpdated: serverTimestamp() as Timestamp,
				createdAt: serverTimestamp() as Timestamp
			};
		}
	} catch (error) {
		console.error('[Preferences] Failed to get preferences:', error);
		// Return safe defaults on error
		return {
			uid,
			pollChoices: {},
			storyThemes: {},
			feedbackSent: 0,
			lastUpdated: serverTimestamp() as Timestamp,
			createdAt: serverTimestamp() as Timestamp
		};
	}
}

/**
 * Get the most preferred poll option for a user
 * @param preferences User preferences
 * @returns Most preferred poll option or null
 */
export function getMostPreferredPollOption(preferences: UserPreferences): string | null {
	const { pollChoices } = preferences;
	
	if (Object.keys(pollChoices).length === 0) return null;

	// Find the option with the highest count
	let maxCount = 0;
	let mostPreferred: string | null = null;

	for (const [option, count] of Object.entries(pollChoices)) {
		if (count > maxCount) {
			maxCount = count;
			mostPreferred = option;
		}
	}

	return mostPreferred;
}

/**
 * Get the most preferred story theme for a user
 * @param preferences User preferences
 * @returns Most preferred story theme or null
 */
export function getMostPreferredStoryTheme(preferences: UserPreferences): string | null {
	const { storyThemes } = preferences;
	
	if (Object.keys(storyThemes).length === 0) return null;

	// Find the theme with the highest count
	let maxCount = 0;
	let mostPreferred: string | null = null;

	for (const [theme, count] of Object.entries(storyThemes)) {
		if (count > maxCount) {
			maxCount = count;
			mostPreferred = theme;
		}
	}

	return mostPreferred;
}

/**
 * Check if user has strong preference for a category (>= 3 selections)
 * @param preferences User preferences
 * @param category Category to check
 * @returns True if user has established preferences
 */
export function hasStrongPreference(
	preferences: UserPreferences,
	category: 'poll' | 'story'
): boolean {
	const choices = category === 'poll' ? preferences.pollChoices : preferences.storyThemes;
	const totalChoices = Object.values(choices).reduce((sum, count) => sum + count, 0);
	
	return totalChoices >= 3;
}

/**
 * Calculate preference bias weight for suggestion ordering
 * @param preferences User preferences
 * @param option Option to check bias for
 * @param category Category (poll or story)
 * @returns Bias weight (1.0 = neutral, >1.0 = preferred, <1.0 = less preferred)
 */
export function getPreferenceBias(
	preferences: UserPreferences,
	option: string,
	category: 'poll' | 'story'
): number {
	const choices = category === 'poll' ? preferences.pollChoices : preferences.storyThemes;
	const optionCount = choices[option] || 0;
	const totalChoices = Object.values(choices).reduce((sum, count) => sum + count, 0);

	if (totalChoices === 0) return 1.0; // Neutral when no history

	// Calculate bias: 0.5x to 2.0x based on choice frequency
	const frequency = optionCount / totalChoices;
	const bias = 0.5 + (frequency * 1.5); // Maps 0-1 frequency to 0.5-2.0 bias

	return Math.max(0.5, Math.min(2.0, bias));
}