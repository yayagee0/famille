/**
 * Unified display name resolution for family members
 *
 * Priority order:
 * 1. profile.nickname if set
 * 2. fallback from VITE_NICKNAMES env var
 * 3. local-part of email (before @)
 */

export function getDisplayName(
	email: string | null | undefined,
	profile?: { nickname?: string }
): string {
	// Handle null/undefined email
	if (!email) {
		return 'Unknown';
	}

	// Priority 1: Profile nickname
	if (profile?.nickname?.trim()) {
		return profile.nickname.trim();
	}

	// Priority 2: Environment VITE_NICKNAMES fallback
	try {
		const nicknamesEnv = import.meta.env.VITE_NICKNAMES;
		if (nicknamesEnv) {
			const nicknames = JSON.parse(nicknamesEnv);
			const normalizedEmail = email.toLowerCase().trim();
			if (nicknames[normalizedEmail]?.trim()) {
				return nicknames[normalizedEmail].trim();
			}
		}
	} catch (error) {
		console.warn('Failed to parse VITE_NICKNAMES:', error);
	}

	// Priority 3: Local part of email (before @)
	const localPart = email.split('@')[0];
	return localPart || email; // fallback to full email if no @ found
}
