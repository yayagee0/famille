/**
 * Seasonal System Data
 *
 * Auto-rotating banners and seasonal content for:
 * - Ramadan, Eid, Summer, Winter, Birthdays
 */

export interface SeasonalBanner {
	id: string;
	title: string;
	message: string;
	emoji: string;
	gradient: string;
	validFrom: Date; // When this banner becomes active
	validTo: Date; // When this banner expires
	priority: number; // Higher priority shows first
	category: 'islamic' | 'weather' | 'birthday' | 'holiday';
}

export interface SeasonalContent {
	id: string;
	season: 'ramadan' | 'eid' | 'summer' | 'winter' | 'birthday' | 'general';
	nudgeBoosts: string[]; // Template IDs to boost during this season
	specialBadges: string[]; // Badge IDs available during this season
	activitySuggestions: string[];
}

// Dynamic Seasonal Banners (calculated based on current date)
export function getCurrentSeasonalBanners(): SeasonalBanner[] {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1; // 1-12
	const day = now.getDate();

	const banners: SeasonalBanner[] = [];

	// Ramadan (varies each year - approximate)
	if (month === 3 || month === 4) {
		banners.push({
			id: 'ramadan_2024',
			title: 'Ramadan Mubarak! 🌙',
			message: 'May this blessed month bring peace, reflection, and closeness to Allah',
			emoji: '🌙',
			gradient: 'from-indigo-600 to-purple-600',
			validFrom: new Date(year, 2, 15), // Mid March
			validTo: new Date(year, 3, 20), // Mid April
			priority: 10,
			category: 'islamic'
		});
	}

	// Eid al-Fitr (after Ramadan)
	if (month === 4 || month === 5) {
		banners.push({
			id: 'eid_fitr_2024',
			title: 'Eid Mubarak! 🎉',
			message: 'Celebrating the joy of Eid with family and gratitude to Allah',
			emoji: '🎉',
			gradient: 'from-green-500 to-emerald-600',
			validFrom: new Date(year, 3, 20), // Mid April
			validTo: new Date(year, 3, 25), // End April
			priority: 10,
			category: 'islamic'
		});
	}

	// Summer
	if (month >= 6 && month <= 8) {
		banners.push({
			id: 'summer_2024',
			title: 'Summer Adventures! ☀️',
			message: "Time for family fun, learning, and enjoying Allah's beautiful creation",
			emoji: '☀️',
			gradient: 'from-yellow-400 to-orange-500',
			validFrom: new Date(year, 5, 1), // June
			validTo: new Date(year, 7, 31), // August
			priority: 5,
			category: 'weather'
		});
	}

	// Winter
	if (month === 12 || month === 1 || month === 2) {
		banners.push({
			id: 'winter_2024',
			title: 'Cozy Winter! ❄️',
			message: 'Perfect time for warm family moments and indoor learning',
			emoji: '❄️',
			gradient: 'from-blue-400 to-cyan-500',
			validFrom: new Date(year, 11, 1), // December
			validTo: new Date(year + 1, 1, 29), // February
			priority: 5,
			category: 'weather'
		});
	}

	// Filter banners that are currently valid
	return banners.filter((banner) => {
		return now >= banner.validFrom && now <= banner.validTo;
	});
}

// Seasonal Content Configurations
export const seasonalConfigurations: SeasonalContent[] = [
	{
		id: 'ramadan_config',
		season: 'ramadan',
		nudgeBoosts: [
			'islamic_reflection',
			'islamic_trait_combo',
			'gratitude_practice',
			'daily_reflection'
		],
		specialBadges: ['ramadan_champion', 'quran_lover'],
		activitySuggestions: [
			"Read extra Qur'an today 📖",
			"Make du'a for someone you love 🤲",
			'Help prepare iftar for the family 🍽️',
			'Practice patience and kindness 💙'
		]
	},
	{
		id: 'eid_config',
		season: 'eid',
		nudgeBoosts: [
			'family_appreciation',
			'kindness_reminder',
			'gratitude_practice',
			'family_helper'
		],
		specialBadges: ['family_connector', 'daily_engagement'],
		activitySuggestions: [
			'Say "Eid Mubarak" to everyone 🎉',
			'Share something special with family 💝',
			'Help with Eid preparations 🎊',
			'Thank Allah for all His blessings 🙏'
		]
	},
	{
		id: 'summer_config',
		season: 'summer',
		nudgeBoosts: [
			'creative_expression',
			'learning_celebration',
			'trait_celebration',
			'family_activity'
		],
		specialBadges: ['daily_engagement', 'islamic_scholar'],
		activitySuggestions: [
			"Explore nature and see Allah's creation 🌳",
			'Learn something new outdoors 🌞',
			'Create summer art or crafts 🎨',
			'Have a family picnic or game time 🏖️'
		]
	},
	{
		id: 'winter_config',
		season: 'winter',
		nudgeBoosts: ['family_appreciation', 'reflection', 'islamic_reflection', 'kindness_reminder'],
		specialBadges: ['family_connector', 'quran_lover'],
		activitySuggestions: [
			'Read together by the warm fireplace 📚',
			'Make hot cocoa for the family ☕',
			'Create cozy indoor activities 🏠',
			'Practice gratitude for warmth and shelter 🏡'
		]
	}
];

// Get current seasonal configuration
export function getCurrentSeasonalConfig(): SeasonalContent | null {
	const now = new Date();
	const month = now.getMonth() + 1;

	// Ramadan (approximate)
	if (month === 3 || month === 4) {
		return seasonalConfigurations.find((c) => c.season === 'ramadan') || null;
	}

	// Eid (approximate)
	if (month === 4 || month === 5) {
		return seasonalConfigurations.find((c) => c.season === 'eid') || null;
	}

	// Summer
	if (month >= 6 && month <= 8) {
		return seasonalConfigurations.find((c) => c.season === 'summer') || null;
	}

	// Winter
	if (month === 12 || month === 1 || month === 2) {
		return seasonalConfigurations.find((c) => c.season === 'winter') || null;
	}

	return null;
}

// Special seasonal nudge templates
export const seasonalNudgeTemplates = [
	{
		id: 'ramadan_special',
		type: 'islamic' as const,
		template:
			'{{character}} This Ramadan, let your {{trait}} nature help you grow closer to Allah! Think about {{ayah}} 🌙',
		character: 'noor' as const,
		season: 'ramadan',
		weight: 20
	},
	{
		id: 'eid_celebration',
		type: 'bonding' as const,
		template:
			'{{character}} Eid Mubarak! Your {{trait}} spirit makes this celebration even more special! 🎉',
		character: 'mimi' as const,
		season: 'eid',
		weight: 25
	},
	{
		id: 'summer_adventure',
		type: 'positive' as const,
		template:
			'{{character}} Summer is perfect for your {{trait}} adventures! What will you explore today? ☀️',
		character: 'botu' as const,
		season: 'summer',
		weight: 15
	},
	{
		id: 'winter_cozy',
		type: 'reflection' as const,
		template:
			'{{character}} Cozy winter days are perfect for reflecting on {{ayah}} with your {{trait}} heart ❄️',
		character: 'noor' as const,
		season: 'winter',
		weight: 15
	}
];
