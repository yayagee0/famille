/**
 * Daily Polls System Data
 *
 * Auto-generates silly daily polls for family engagement
 * Polls close after 24h and results are posted to Fun Feed
 */

export interface DailyPoll {
	id?: string;
	question: string;
	options: string[];
	votes: Record<string, string>; // userId -> optionIndex
	createdAt: Date;
	closesAt: Date;
	isClosed: boolean;
	resultsPosted: boolean;
	familyId: string;
}

export interface PollTemplate {
	id: string;
	question: string;
	options: string[];
	category: 'silly' | 'preferences' | 'would_you_rather' | 'favorites' | 'family';
	weight: number;
}

// Daily Poll Templates for Auto-Generation
export const pollTemplates: PollTemplate[] = [
	// Silly Category
	{
		id: 'pizza_pineapple',
		question: 'Pineapple on pizza?',
		options: ['Love it! 🍍', 'Never! 🚫', 'Sometimes 🤔', "What's pizza? 😅"],
		category: 'silly',
		weight: 10
	},
	{
		id: 'superpower_choice',
		question: 'Which superpower would you choose?',
		options: ['Flying ✈️', 'Invisibility 👻', 'Super strength 💪', 'Mind reading 🧠'],
		category: 'silly',
		weight: 10
	},
	{
		id: 'animal_sound',
		question: 'If you could only communicate like an animal, which would you choose?',
		options: [
			'Meow like a cat 🐱',
			'Roar like a lion 🦁',
			'Chirp like a bird 🐦',
			'Moo like a cow 🐄'
		],
		category: 'silly',
		weight: 8
	},
	{
		id: 'weird_food_combo',
		question: 'Weirdest food combination that might be delicious?',
		options: [
			'Ice cream + french fries 🍟',
			'Cookies + cheese 🧀',
			'Watermelon + salt 🧂',
			'Chocolate + pickles 🥒'
		],
		category: 'silly',
		weight: 9
	},

	// Would You Rather
	{
		id: 'time_travel',
		question: 'Would you rather...',
		options: [
			'Travel to the past 🕰️',
			'Travel to the future 🚀',
			'Stay in the present 🌟',
			'Time travel randomly ⚡'
		],
		category: 'would_you_rather',
		weight: 12
	},
	{
		id: 'size_choice',
		question: 'Would you rather be...',
		options: ['Really tall 🦒', 'Really small 🐭', 'Really wide 🤗', 'Perfect size 😊'],
		category: 'would_you_rather',
		weight: 8
	},
	{
		id: 'weather_power',
		question: 'Would you rather control...',
		options: ['Rain ☔', 'Snow ❄️', 'Sunshine ☀️', 'Wind 💨'],
		category: 'would_you_rather',
		weight: 10
	},

	// Preferences
	{
		id: 'favorite_season',
		question: "What's your favorite season?",
		options: ['Spring 🌸', 'Summer ☀️', 'Fall 🍂', 'Winter ❄️'],
		category: 'preferences',
		weight: 15
	},
	{
		id: 'favorite_time',
		question: "What's your favorite time of day?",
		options: ['Morning 🌅', 'Afternoon 🌞', 'Evening 🌆', 'Night 🌙'],
		category: 'preferences',
		weight: 12
	},
	{
		id: 'favorite_color_mood',
		question: 'Which color makes you happiest?',
		options: ['Blue 💙', 'Green 💚', 'Purple 💜', 'Rainbow 🌈'],
		category: 'preferences',
		weight: 10
	},

	// Family-focused
	{
		id: 'family_activity',
		question: 'Best family activity?',
		options: ['Game night 🎲', 'Movie time 🍿', 'Cooking together 🍳', 'Going for walks 🚶‍♀️'],
		category: 'family',
		weight: 15
	},
	{
		id: 'family_meal',
		question: 'Perfect family meal?',
		options: ['Pizza party 🍕', 'BBQ feast 🍖', 'Homemade soup 🍲', 'Ice cream dinner 🍦'],
		category: 'family',
		weight: 12
	},
	{
		id: 'family_vacation',
		question: 'Dream family vacation?',
		options: ['Beach resort 🏖️', 'Mountain cabin 🏔️', 'Big city 🏙️', 'Space station 🚀'],
		category: 'family',
		weight: 10
	},

	// Favorites
	{
		id: 'favorite_emoji',
		question: 'Which emoji represents you best?',
		options: ['😄 Happy', '🤔 Thoughtful', '🥳 Party', '😴 Sleepy'],
		category: 'favorites',
		weight: 8
	},
	{
		id: 'favorite_transportation',
		question: 'Coolest way to travel?',
		options: ['Flying carpet 🪄', 'Rocket ship 🚀', 'Magic portal ✨', 'Giant butterfly 🦋'],
		category: 'favorites',
		weight: 9
	},
	{
		id: 'favorite_pet',
		question: 'If you could have any pet?',
		options: ['Tiny dragon 🐲', 'Talking parrot 🦜', 'Flying hamster 🐹', 'Invisible cat 🐱'],
		category: 'favorites',
		weight: 11
	}
];
