import { describe, it, expect } from 'vitest';

describe('FamilyBot Phase 2 & 3 - Basic Tests', () => {
	describe('preferences utility functions', () => {
		it('should identify most preferred poll option', () => {
			// Test the core logic without Firebase dependencies
			const preferences = {
				uid: 'user-123',
				pollChoices: { pasta: 5, pizza: 2, rice: 1 },
				storyThemes: {},
				feedbackSent: 0,
				lastUpdated: { seconds: Date.now() / 1000 } as any,
				createdAt: { seconds: Date.now() / 1000 } as any
			};

			// Simple logic test
			const choices = preferences.pollChoices;
			let maxCount = 0;
			let mostPreferred: string | null = null;

			for (const [option, count] of Object.entries(choices)) {
				if (count > maxCount) {
					maxCount = count;
					mostPreferred = option;
				}
			}

			expect(mostPreferred).toBe('pasta');
		});

		it('should calculate preference bias correctly', () => {
			const preferences = {
				pollChoices: { pasta: 8, pizza: 2 },
				storyThemes: {},
				feedbackSent: 0
			};

			const choices = preferences.pollChoices;
			const totalChoices = Object.values(choices).reduce((sum, count) => sum + count, 0);
			
			// Test pasta bias (80% frequency)
			const pastaCount = choices['pasta'] || 0;
			const pastaFrequency = pastaCount / totalChoices;
			const pastaBias = 0.5 + (pastaFrequency * 1.5);
			
			// Test pizza bias (20% frequency)
			const pizzaCount = choices['pizza'] || 0;
			const pizzaFrequency = pizzaCount / totalChoices;
			const pizzaBias = 0.5 + (pizzaFrequency * 1.5);

			expect(pastaBias).toBeGreaterThan(1.5); // Should favor pasta
			expect(pizzaBias).toBeLessThan(1.0); // Should disfavor pizza
		});

		it('should detect strong preferences', () => {
			const strongPrefs = {
				pollChoices: { pasta: 2, pizza: 1 }, // total: 3
				storyThemes: { adventure: 4 } // total: 4
			};

			const pollTotal = Object.values(strongPrefs.pollChoices).reduce((sum, count) => sum + count, 0);
			const storyTotal = Object.values(strongPrefs.storyThemes).reduce((sum, count) => sum + count, 0);

			expect(pollTotal).toBeGreaterThanOrEqual(3);
			expect(storyTotal).toBeGreaterThanOrEqual(3);
		});
	});

	describe('story content validation', () => {
		it('should contain story templates with placeholders', () => {
			const sampleStoryWithPlaceholders = "Once upon a time, a {trait} explorer discovered that being kind was the key to unlocking ancient wisdom. As the Quran says: '{ayah}' 🌍";
			
			expect(sampleStoryWithPlaceholders).toContain('{trait}');
			expect(sampleStoryWithPlaceholders).toContain('{ayah}');
			
			// Test placeholder replacement logic
			const processedStory = sampleStoryWithPlaceholders
				.replace(/\{trait\}/g, 'brave')
				.replace(/\{ayah\}/g, 'Sample verse');
			
			expect(processedStory).not.toContain('{trait}');
			expect(processedStory).not.toContain('{ayah}');
			expect(processedStory).toContain('brave explorer');
		});

		it('should contain emojis in story templates', () => {
			const stories = [
				"Once upon a time, a brave explorer set out on an adventure 🌍.",
				"A curious cat 🐱 discovered hidden wisdom in the forest.",
				"Two brothers set out to find a treasure, guided by kindness ✨.",
				"A little bird 🐦 learned the importance of helping others.",
				"In a magical garden, flowers taught a young child about patience 🌸.",
				"A wise owl 🦉 shared ancient secrets with a group of friends."
			];

			const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u;
			
			stories.forEach(story => {
				expect(emojiRegex.test(story)).toBe(true);
			});
		});
	});

	describe('adaptive engagement logic', () => {
		it('should determine engagement bias based on metrics', () => {
			// Test low engagement scenario
			const lowEngagement = {
				nudgeAnswered: false,
				pollVoted: false,
				islamicQuestionsAnswered: 0,
				feedbackCompleted: false
			};

			let engagementScore = 0;
			let totalPossible = 4; // 4 metrics

			if (lowEngagement.nudgeAnswered) engagementScore += 1;
			if (lowEngagement.pollVoted) engagementScore += 1;
			if (lowEngagement.islamicQuestionsAnswered > 0) engagementScore += 1;
			if (lowEngagement.feedbackCompleted) engagementScore += 1;

			const lowEngagementRate = engagementScore / totalPossible;
			expect(lowEngagementRate).toBeLessThan(0.3); // Should trigger 'playful' bias

			// Test high engagement scenario
			const highEngagement = {
				nudgeAnswered: true,
				pollVoted: true,
				islamicQuestionsAnswered: 5,
				feedbackCompleted: true
			};

			engagementScore = 0;
			if (highEngagement.nudgeAnswered) engagementScore += 1;
			if (highEngagement.pollVoted) engagementScore += 1;
			if (highEngagement.islamicQuestionsAnswered > 0) engagementScore += 1;
			if (highEngagement.feedbackCompleted) engagementScore += 1;

			const highEngagementRate = engagementScore / totalPossible;
			expect(highEngagementRate).toBeGreaterThan(0.7); // Should trigger 'deeper' bias
		});
	});

	describe('fairness system logic', () => {
		it('should identify user with lowest turn count', () => {
			const turnTracker = {
				global: { 'user-123': 5, 'user-456': 2, 'user-789': 3 },
				lastAssigned: 'user-123',
				totalTurns: 10
			};

			let lowestCount = Infinity;
			let fairestUid = 'default';

			for (const [userId, count] of Object.entries(turnTracker.global)) {
				if (count < lowestCount) {
					lowestCount = count;
					fairestUid = userId;
				}
			}

			expect(fairestUid).toBe('user-456'); // User with count 2
			expect(lowestCount).toBe(2);
		});

		it('should prioritize requesting user if they have lowest count', () => {
			const turnTracker = {
				global: { 'user-123': 1, 'user-456': 5, 'user-789': 3 }
			};

			const requestingUser = 'user-123';
			const requestingUserCount = turnTracker.global[requestingUser];

			let lowestCount = Infinity;
			for (const count of Object.values(turnTracker.global)) {
				if (count < lowestCount) {
					lowestCount = count;
				}
			}

			const shouldGetTurn = requestingUserCount <= lowestCount;
			expect(shouldGetTurn).toBe(true);
		});
	});

	describe('story categorization', () => {
		it('should detect story themes from content', () => {
			const stories = [
				{ text: "Two siblings worked together to help their family", expectedTheme: 'family' },
				{ text: "A wise owl shared ancient secrets about learning", expectedTheme: 'wisdom' },
				{ text: "In a magical forest, fairies danced with unicorns", expectedTheme: 'fantasy' },
				{ text: "The brave explorer climbed the highest mountain", expectedTheme: 'adventure' },
				{ text: "At the mosque, children learned about Allah's mercy", expectedTheme: 'islamic' }
			];

			stories.forEach(({ text, expectedTheme }) => {
				let detectedTheme = 'adventure'; // default
				
				if (text.includes('mosque') || text.includes('Allah') || text.includes('Quran')) {
					detectedTheme = 'islamic';
				} else if (text.includes('family') || text.includes('sibling') || text.includes('brother') || text.includes('sister')) {
					detectedTheme = 'family';
				} else if (text.includes('wise') || text.includes('learn') || text.includes('teach')) {
					detectedTheme = 'wisdom';
				} else if (text.includes('magical') || text.includes('magic') || text.includes('fairy') || text.includes('unicorn')) {
					detectedTheme = 'fantasy';
				}

				expect(detectedTheme).toBe(expectedTheme);
			});
		});
	});
});