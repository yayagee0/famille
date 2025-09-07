/**
 * Smart Engine Data Structures for AI-Powered Family Hub
 *
 * This file contains the core data definitions for:
 * - Nudge templates with trait/ayah placeholders
 * - Character definitions (mascots)
 * - Badge templates
 * - Identity traits
 */

export interface NudgeTemplate {
	id: string;
	type: 'positive' | 'bonding' | 'constructive' | 'reflection' | 'islamic' | 'personalized';
	template: string; // Contains {{trait}}, {{ayah}}, {{character}} placeholders
	character: 'noor' | 'botu' | 'mimi';
	requiredTraits?: string[]; // Traits needed for this nudge
	islamicContext?: boolean; // Uses {{ayah}} placeholder
	weight: number; // For random selection (higher = more likely)
}

export interface Character {
	id: 'noor' | 'botu' | 'mimi';
	name: string;
	emoji: string;
	personality: string;
	greetings: string[];
	catchphrases: string[];
}

export interface IdentityTrait {
	id: string;
	category: 'personality' | 'interests' | 'strengths' | 'goals';
	name: string;
	description: string;
	examples: string[]; // Example nudge variations
}

export interface BadgeTemplate {
	id: string;
	name: string;
	description: string;
	lottieUrl: string; // Lottie JSON animation URL
	condition: string; // Condition for earning (e.g., "answered_5_islamic_questions")
	category: 'islamic' | 'social' | 'engagement' | 'seasonal';
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Mascot Characters
export const characters: Character[] = [
	{
		id: 'noor',
		name: 'Noor',
		emoji: '🌙',
		personality: 'Wise and nurturing, focuses on Islamic teachings and spiritual growth',
		greetings: [
			'Assalamu alaikum, dear one! 🌙',
			'May Allah bless your day! ✨',
			'Peace be upon you, sweet child 🤲'
		],
		catchphrases: [
			'Remember, Allah loves those who are kind 💙',
			'Every good deed is a step closer to Jannah 🌟',
			'SubhanAllah! Look at all the beauty around us 🌸'
		]
	},
	{
		id: 'botu',
		name: 'Botu',
		emoji: '🤖',
		personality: 'Curious and analytical, encourages learning and problem-solving',
		greetings: [
			'Greetings, young explorer! 🤖',
			'Ready for an adventure in learning? 🚀',
			"Beep boop! Let's discover something amazing! ⚡"
		],
		catchphrases: [
			'Knowledge is the greatest treasure! 📚',
			'Every question leads to discovery! 🔍',
			'Computing... amazingness levels are off the charts! 📊'
		]
	},
	{
		id: 'mimi',
		name: 'Mimi',
		emoji: '🐱',
		personality: 'Playful and empathetic, focuses on emotions and family bonding',
		greetings: [
			'Meow meow! Hello there, cutie! 🐱',
			'Purrfect timing! How are you feeling? 💕',
			'*purrs* Ready to share some love today? 🌈'
		],
		catchphrases: [
			'Family love is the best medicine! 💝',
			'A hug a day keeps the sadness away! 🤗',
			'Purrfection is found in small moments! ✨'
		]
	}
];

// Identity Traits for Personalization
export const identityTraits: IdentityTrait[] = [
	// Personality Traits
	{
		id: 'creative',
		category: 'personality',
		name: 'Creative',
		description: 'Loves to draw, craft, and imagine',
		examples: [
			'Draw a picture of {{ayah}} and share it with family!',
			'Create something beautiful today and show your creativity!',
			'Imagine you could design a masjid - what would it look like?'
		]
	},
	{
		id: 'curious',
		category: 'personality',
		name: 'Curious',
		description: 'Always asking questions and exploring',
		examples: [
			'What amazing question do you have about {{ayah}} today?',
			'Explore something new in your home and share what you found!',
			'Ask someone in your family to teach you something new!'
		]
	},
	{
		id: 'helpful',
		category: 'personality',
		name: 'Helpful',
		description: 'Enjoys helping others and being useful',
		examples: [
			'Help someone today and remember: {{ayah}}',
			"What's one way you can help your family today?",
			'Being helpful is a beautiful way to worship Allah!'
		]
	},
	{
		id: 'energetic',
		category: 'personality',
		name: 'Energetic',
		description: 'Full of energy and loves movement',
		examples: [
			'Dance or move while thinking about {{ayah}}!',
			'Use your energy to make someone smile today!',
			'Race to help someone - but remember to be gentle!'
		]
	},
	{
		id: 'thoughtful',
		category: 'personality',
		name: 'Thoughtful',
		description: 'Deep thinker who considers others',
		examples: [
			'Take a moment to really think about {{ayah}} today',
			'What thoughtful thing can you do for someone you love?',
			"Reflect on three things you're grateful for right now"
		]
	},

	// Interests
	{
		id: 'loves_stories',
		category: 'interests',
		name: 'Loves Stories',
		description: 'Enjoys hearing and telling stories',
		examples: [
			'Tell someone the story behind {{ayah}}!',
			'Share your favorite family memory with someone today',
			'Create a story about helping others and share it!'
		]
	},
	{
		id: 'loves_nature',
		category: 'interests',
		name: 'Loves Nature',
		description: 'Fascinated by plants, animals, and outdoors',
		examples: [
			"Look for Allah's creation outside and think about {{ayah}}",
			'Find something beautiful in nature and thank Allah for it',
			'Water a plant or care for something living today'
		]
	},
	{
		id: 'loves_games',
		category: 'interests',
		name: 'Loves Games',
		description: 'Enjoys playing and competing',
		examples: [
			'Play a game with family and remember {{ayah}}',
			'Create a fun way to practice what you learned today!',
			'Challenge yourself to do one extra good deed!'
		]
	},

	// Strengths
	{
		id: 'kind_heart',
		category: 'strengths',
		name: 'Kind Heart',
		description: 'Naturally compassionate and caring',
		examples: [
			'Your kindness reflects {{ayah}} perfectly!',
			'Show your beautiful heart to someone who needs it today',
			'Use your gentle nature to comfort someone'
		]
	},
	{
		id: 'strong_memory',
		category: 'strengths',
		name: 'Strong Memory',
		description: 'Good at remembering and learning',
		examples: [
			'Use your amazing memory to remember {{ayah}} today!',
			'Teach someone something you remember well',
			'Share a beautiful memory that makes someone smile'
		]
	},
	{
		id: 'brave_spirit',
		category: 'strengths',
		name: 'Brave Spirit',
		description: 'Courageous and willing to try new things',
		examples: [
			'Be brave like the believers in {{ayah}}!',
			'Try something new that could help others today',
			"Use your courage to stand up for what's right"
		]
	},

	// Goals
	{
		id: 'memorize_quran',
		category: 'goals',
		name: "Memorize Qur'an",
		description: "Working on memorizing Qur'anic verses",
		examples: [
			'Practice {{ayah}} today and feel proud of your progress!',
			"Recite what you've memorized for someone special",
			'Every verse you learn brings you closer to Allah!'
		]
	},
	{
		id: 'learn_arabic',
		category: 'goals',
		name: 'Learn Arabic',
		description: 'Interested in learning Arabic language',
		examples: [
			'Learn one new Arabic word from {{ayah}} today!',
			'Practice saying "JazakAllahu khair" to someone who helps you',
			'Ask someone to teach you a beautiful Arabic phrase'
		]
	},
	{
		id: 'be_better_muslim',
		category: 'goals',
		name: 'Be Better Muslim',
		description: 'Wants to grow in Islamic knowledge and practice',
		examples: [
			'Think about how {{ayah}} can guide your actions today',
			'Do one thing that would make Prophet Muhammad ﷺ proud',
			'Practice a sunnah that brings you closer to Allah'
		]
	}
];

// Nudge Templates with Placeholders
export const nudgeTemplates: NudgeTemplate[] = [
	// Positive/Bonding (≥80% of nudges)
	{
		id: 'morning_gratitude',
		type: 'positive',
		template:
			'{{character}} Good morning, sunshine! Think of three things that make you smile today! 🌅✨',
		character: 'mimi',
		weight: 10
	},
	{
		id: 'family_appreciation',
		type: 'bonding',
		template:
			'{{character}} Tell someone in your family why you love them today! Family is a blessing from Allah 💕👨‍👩‍👧‍👦',
		character: 'noor',
		weight: 12
	},
	{
		id: 'trait_celebration',
		type: 'personalized',
		template:
			'{{character}} Your {{trait}} nature is such a gift! How can you use it to spread joy today? 🌟',
		character: 'botu',
		requiredTraits: ['any'],
		weight: 15
	},
	{
		id: 'islamic_reflection',
		type: 'islamic',
		template:
			'{{character}} Take a moment to think about this beautiful verse: {{ayah}} How does it speak to your heart? 💙📿',
		character: 'noor',
		islamicContext: true,
		weight: 10
	},
	{
		id: 'gratitude_practice',
		type: 'positive',
		template:
			'{{character}} Say "Alhamdulillah" for something special today and share why you\'re grateful! 🤲✨',
		character: 'noor',
		weight: 8
	},
	{
		id: 'creative_expression',
		type: 'personalized',
		template:
			'{{character}} Your {{trait}} spirit is amazing! Create something beautiful today and share it with love! 🎨',
		character: 'mimi',
		requiredTraits: ['creative'],
		weight: 12
	},
	{
		id: 'learning_celebration',
		type: 'positive',
		template:
			'{{character}} Every question you ask makes you smarter! What will you discover today? 🔍🧠',
		character: 'botu',
		weight: 9
	},
	{
		id: 'kindness_reminder',
		type: 'bonding',
		template:
			'{{character}} Your kindness makes the world brighter! Do something sweet for someone today 💝',
		character: 'mimi',
		weight: 11
	},
	{
		id: 'islamic_trait_combo',
		type: 'islamic',
		template:
			'{{character}} Being {{trait}} is a way to follow {{ayah}}! Let your beautiful nature shine today! 🌟',
		character: 'noor',
		requiredTraits: ['any'],
		islamicContext: true,
		weight: 13
	},
	{
		id: 'family_helper',
		type: 'bonding',
		template:
			'{{character}} Helping family is a form of worship! What loving thing can you do today? 🏠💕',
		character: 'botu',
		weight: 10
	},

	// Constructive (≤20% of nudges)
	{
		id: 'gentle_improvement',
		type: 'constructive',
		template:
			"{{character}} Every day is a chance to grow! What's one small thing you can do better today? 🌱",
		character: 'noor',
		weight: 3
	},
	{
		id: 'patience_reminder',
		type: 'constructive',
		template:
			'{{character}} Remember, being patient makes us stronger! Take a deep breath when things feel hard 🧘‍♀️',
		character: 'mimi',
		weight: 2
	},
	{
		id: 'forgiveness_nudge',
		type: 'constructive',
		template:
			'{{character}} Forgiving others frees our hearts! Is there someone you can forgive today? 💙',
		character: 'noor',
		weight: 2
	},
	{
		id: 'effort_encouragement',
		type: 'constructive',
		template:
			'{{character}} Even when something is hard, trying your best is what matters! Keep going! 💪',
		character: 'botu',
		weight: 3
	},

	// Reflection
	{
		id: 'daily_reflection',
		type: 'reflection',
		template:
			'{{character}} Before bed tonight, think about the best part of your day and thank Allah for it 🌙',
		character: 'noor',
		weight: 6
	},
	{
		id: 'trait_reflection',
		type: 'reflection',
		template:
			'{{character}} How did your {{trait}} nature help you today? Reflect on the good you brought to others 🤔✨',
		character: 'botu',
		requiredTraits: ['any'],
		weight: 7
	},
	{
		id: 'growth_reflection',
		type: 'reflection',
		template:
			'{{character}} What new thing did you learn today? Every lesson is a gift from Allah! 📚',
		character: 'mimi',
		weight: 5
	}
];

// Badge Templates (Lottie-only)
export const badgeTemplates: BadgeTemplate[] = [
	{
		id: 'first_islamic_answer',
		name: 'First Steps 🌱',
		description: 'Answered your first Islamic question!',
		lottieUrl: '/static/badges/first-steps.json',
		condition: 'answered_1_islamic_question',
		category: 'islamic',
		rarity: 'common'
	},
	{
		id: 'islamic_scholar',
		name: 'Young Scholar 📚',
		description: 'Answered 10 Islamic questions correctly!',
		lottieUrl: '/static/badges/scholar.json',
		condition: 'answered_10_islamic_questions',
		category: 'islamic',
		rarity: 'rare'
	},
	{
		id: 'daily_engagement',
		name: 'Daily Star ⭐',
		description: 'Used the app every day for a week!',
		lottieUrl: '/static/badges/daily-star.json',
		condition: 'daily_usage_7_days',
		category: 'engagement',
		rarity: 'common'
	},
	{
		id: 'family_connector',
		name: 'Family Bond 💕',
		description: 'Shared 20 posts with your family!',
		lottieUrl: '/static/badges/family-bond.json',
		condition: 'shared_20_posts',
		category: 'social',
		rarity: 'rare'
	},
	{
		id: 'ramadan_champion',
		name: 'Ramadan Champion 🌙',
		description: 'Completed all Ramadan activities!',
		lottieUrl: '/static/badges/ramadan-champion.json',
		condition: 'completed_ramadan_activities',
		category: 'seasonal',
		rarity: 'epic'
	},
	{
		id: 'quran_lover',
		name: "Qur'an Lover 📖",
		description: 'Answered 50 Islamic questions!',
		lottieUrl: '/static/badges/quran-lover.json',
		condition: 'answered_50_islamic_questions',
		category: 'islamic',
		rarity: 'legendary'
	}
];
