/**
 * FamilyBot Phase 8 Tests
 * Memory Nudges, Seasonal Badges, Deeper Stories, Custom Polls with Psychology Guardrails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
	generateMemoryNudge, 
	awardSeasonalBadge,
	SEASONAL_BADGES,
	getEnhancedStoryTemplate,
	processStoryWithChoices,
	createCustomPollWizard,
	createCustomPoll,
	seedEnhancedStoryTemplates
} from '$lib/smartEngine';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
	getFirestore: vi.fn(() => ({})),
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	setDoc: vi.fn(),
	addDoc: vi.fn(),
	updateDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
	Timestamp: vi.fn(),
	writeBatch: vi.fn(() => ({
		set: vi.fn(),
		commit: vi.fn()
	}))
}));

vi.mock('$lib/firebase', () => ({
	db: {},
	getFamilyId: vi.fn(() => 'test-family')
}));

vi.mock('$lib/getDisplayName', () => ({
	getDisplayName: vi.fn((email) => email?.split('@')[0] || 'TestUser')
}));

describe('FamilyBot Phase 8: Memory Nudges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should generate memory-based nudge for story preferences', async () => {
		const { getDoc } = await import('firebase/firestore');
		
		// Mock preferences with story activity
		(getDoc as any).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				lastStoryRead: '2024-01-01',
				lastSuggestedTheme: 'adventure',
				storyThemes: { adventure: 5, fantasy: 2 }
			})
		});

		// Mock no existing nudge today
		(getDoc as any).mockResolvedValueOnce({
			exists: () => false
		});

		const { setDoc } = await import('firebase/firestore');
		(setDoc as any).mockResolvedValue(undefined);

		const nudge = await generateMemoryNudge('test-user');
		
		expect(nudge).toBeTruthy();
		expect(nudge).toContain('adventure story');
		expect(nudge).toContain('want another today?');
		expect(setDoc).toHaveBeenCalled();
	});

	it('should generate memory-based nudge for feedback patterns', async () => {
		const { getDoc } = await import('firebase/firestore');
		
		// Mock preferences with old feedback
		(getDoc as any).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({
				lastFeedbackGiven: '2024-01-01',
				lastStoryRead: null
			})
		});

		// Mock no existing nudge
		(getDoc as any).mockResolvedValueOnce({
			exists: () => false
		});

		const { setDoc } = await import('firebase/firestore');
		(setDoc as any).mockResolvedValue(undefined);

		const nudge = await generateMemoryNudge('test-user');
		
		expect(nudge).toBeTruthy();
		expect(nudge).toContain('feedback');
		expect(nudge).toContain('want to share something?');
	});

	it('should not generate nudge if one already exists today', async () => {
		const { getDoc } = await import('firebase/firestore');
		
		// Mock existing nudge today
		(getDoc as any).mockResolvedValueOnce({
			exists: () => true
		});

		const nudge = await generateMemoryNudge('test-user');
		
		expect(nudge).toBeNull();
	});

	it('should generate gentle fallback nudge when no specific memories', async () => {
		const { getDoc } = await import('firebase/firestore');
		
		// Mock preferences with no strong patterns
		(getDoc as any).mockResolvedValueOnce({
			exists: () => true,
			data: () => ({})
		});

		// Mock no existing nudge
		(getDoc as any).mockResolvedValueOnce({
			exists: () => false
		});

		const { setDoc } = await import('firebase/firestore');
		(setDoc as any).mockResolvedValue(undefined);

		const nudge = await generateMemoryNudge('test-user');
		
		expect(nudge).toBeTruthy();
		expect(nudge).toMatch(/favorite part|adventure|creative/);
	});
});

describe('FamilyBot Phase 8: Seasonal Badges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should have correct seasonal badge definitions', () => {
		expect(SEASONAL_BADGES.ramadan_observer).toEqual({
			name: "Ramadan Observer",
			icon: "🌙",
			rarity: "seasonal",
			requirement: "Log a fasting day during Ramadan",
			action: "log_fasting_day"
		});

		expect(SEASONAL_BADGES.eid_celebrant).toEqual({
			name: "Eid Celebrant",
			icon: "🎉",
			rarity: "seasonal",
			requirement: "Share joy during Eid celebration",
			action: "celebrate_eid"
		});

		expect(SEASONAL_BADGES.birthday_star).toEqual({
			name: "Birthday Star",
			icon: "🎂",
			rarity: "seasonal",
			requirement: "Celebrate a birthday in Family Hub",
			action: "celebrate_birthday"
		});
	});

	it('should award seasonal badge after user action', async () => {
		const { getDocs, addDoc } = await import('firebase/firestore');
		
		// Mock no existing badge this year
		(getDocs as any).mockResolvedValueOnce({
			empty: true
		});

		(addDoc as any).mockResolvedValue({ id: 'badge-id' });

		// Mock enhanced fun feed entry function
		const mockAddEnhancedFunFeedEntry = vi.fn();
		vi.doMock('$lib/smartEngine', async () => {
			const actual = await vi.importActual('$lib/smartEngine') as any;
			return {
				...actual,
				SmartEngine: {
					...actual.SmartEngine,
					addEnhancedFunFeedEntry: mockAddEnhancedFunFeedEntry
				}
			};
		});

		await awardSeasonalBadge('test-user', 'log_fasting_day');
		
		expect(addDoc).toHaveBeenCalled();
		const badgeData = (addDoc as any).mock.calls[0][1];
		expect(badgeData.name).toBe("Ramadan Observer");
		expect(badgeData.icon).toBe("🌙");
		expect(badgeData.rarity).toBe("seasonal");
		expect(badgeData.yearEarned).toBe(new Date().getFullYear());
	});

	it('should not award duplicate seasonal badge in same year', async () => {
		const { getDocs, addDoc } = await import('firebase/firestore');
		
		// Mock existing badge this year
		(getDocs as any).mockResolvedValueOnce({
			empty: false,
			docs: [{ data: () => ({ badgeId: 'ramadan_observer' }) }]
		});

		await awardSeasonalBadge('test-user', 'log_fasting_day');
		
		expect(addDoc).not.toHaveBeenCalled();
	});
});

describe('FamilyBot Phase 8: Enhanced Stories', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should get enhanced story template with chapters', async () => {
		const { getDocs } = await import('firebase/firestore');
		
		// Mock story templates
		(getDocs as any).mockResolvedValueOnce({
			empty: false,
			docs: [{
				id: 'story-1',
				data: () => ({
					title: "The Brave Explorer",
					category: "Adventure",
					chapters: [
						"Chapter 1: {nickname} started an adventure...",
						"Chapter 2: They discovered {trait1} was important...",
						"Chapter 3: The end brought wisdom..."
					],
					placeholders: { nickname: true, trait1: true },
					reflection: {
						question: "What did you learn?",
						ayah: "Test verse",
						reference: "Test 1:1"
					}
				})
			}]
		});

		const story = await getEnhancedStoryTemplate('Adventure');
		
		expect(story).toBeTruthy();
		expect(story?.title).toBe("The Brave Explorer");
		expect(story?.chapters).toHaveLength(3);
		expect(story?.chapters[0]).toContain("{nickname}");
		expect(story?.reflection).toBeTruthy();
	});

	it('should process story with choices correctly', async () => {
		const storyTemplate = {
			id: 'story-1',
			title: "Choice Story",
			category: "Adventure" as const,
			chapters: [
				"You start an adventure...",
				"You made a choice and continued...",
				"The story concludes..."
			],
			choices: {
				0: {
					question: "What should you do?",
					options: [
						{ text: "Go left", emoji: "⬅️", nextChapter: 1 },
						{ text: "Go right", emoji: "➡️", nextChapter: 2 }
					]
				}
			},
			placeholders: {},
			reflection: {
				question: "What did you learn?",
				ayah: "Test verse",
				reference: "Test 1:1"
			},
			createdAt: { seconds: Date.now() / 1000 } as any,
			updatedAt: { seconds: Date.now() / 1000 } as any
		};

		// Mock user data for placeholder replacement
		const { getDoc } = await import('firebase/firestore');
		(getDoc as any).mockResolvedValue({
			exists: () => true,
			data: () => ({ email: 'test@example.com' })
		});

		// Mock SmartEngine methods
		const mockGetUserTraits = vi.fn().mockResolvedValue({ traits: [] });
		const mockGetCurrentTrait = vi.fn().mockReturnValue('kind');
		const mockGetIslamicProgress = vi.fn().mockResolvedValue({ currentQuestionId: null });
		
		vi.doMock('$lib/smartEngine', async () => {
			const actual = await vi.importActual('$lib/smartEngine') as any;
			return {
				...actual,
				SmartEngine: {
					...actual.SmartEngine,
					getUserTraits: mockGetUserTraits,
					getCurrentTrait: mockGetCurrentTrait,
					getIslamicProgress: mockGetIslamicProgress
				}
			};
		});

		const result = await processStoryWithChoices(storyTemplate, 'test-user', 0);
		
		expect(result.content).toContain("You start an adventure");
		expect(result.hasChoice).toBe(true);
		expect(result.choice?.question).toBe("What should you do?");
		expect(result.choice?.options).toHaveLength(2);
		expect(result.isComplete).toBe(false);
	});

	it('should handle story completion with reflection', async () => {
		const storyTemplate = {
			id: 'story-1',
			title: "Short Story",
			category: "Wisdom & Reflection" as const,
			chapters: ["A short story that ends quickly."],
			placeholders: {},
			reflection: {
				question: "What wisdom did you gain?",
				ayah: "Test verse for reflection",
				reference: "Quran 1:1"
			},
			createdAt: { seconds: Date.now() / 1000 } as any,
			updatedAt: { seconds: Date.now() / 1000 } as any
		};

		// Mock user data
		const { getDoc } = await import('firebase/firestore');
		(getDoc as any).mockResolvedValue({
			exists: () => true,
			data: () => ({ email: 'test@example.com' })
		});

		const result = await processStoryWithChoices(storyTemplate, 'test-user', 0);
		
		expect(result.isComplete).toBe(true);
		expect(result.reflection).toBeTruthy();
		expect(result.reflection?.question).toBe("What wisdom did you gain?");
		expect(result.reflection?.ayah).toBe("Test verse for reflection");
	});
});

describe('FamilyBot Phase 8: Custom Polls with Psychology Guardrails', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should validate child-friendly poll questions', async () => {
		const validation = await createCustomPollWizard('test-user', 'What should we have for dinner?', []);
		
		expect(validation.validated).toBe(true);
		expect(validation.childFriendly).toBe(true);
		expect(validation.suggestedOptions).toContain('Pasta 🍝');
		expect(validation.guidance).toContain('Great choice! Food polls are always fun for families 🍽️');
	});

	it('should detect and guide away from inappropriate content', async () => {
		const validation = await createCustomPollWizard('test-user', 'What is the worst thing about school?', []);
		
		expect(validation.validated).toBe(false);
		expect(validation.guidance).toContain('Try reframing positively!');
	});

	it('should provide guidance for different question types', async () => {
		// Activity question
		const activityValidation = await createCustomPollWizard('test-user', 'What should we do this weekend?', []);
		expect(activityValidation.guidance).toContain('Activity polls help families spend quality time together!');
		expect(activityValidation.suggestedOptions).toContain('Board games 🎲');

		// Learning question
		const learningValidation = await createCustomPollWizard('test-user', 'What should we learn about today?', []);
		expect(learningValidation.guidance).toContain('Learning polls are wonderful for family growth!');
		expect(learningValidation.suggestedOptions).toContain('Reading stories 📖');

		// Games question
		const gamesValidation = await createCustomPollWizard('test-user', 'Which game should we play?', []);
		expect(gamesValidation.guidance).toContain('Games bring families together with joy and laughter!');
		expect(gamesValidation.suggestedOptions).toContain('Hide and seek 👀');
	});

	it('should limit poll options to prevent overwhelming choices', async () => {
		const manyOptions = ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6'];
		const validation = await createCustomPollWizard('test-user', 'Test question?', manyOptions);
		
		expect(validation.guidance).toContain('Consider limiting to 2-4 options');
	});

	it('should successfully create custom poll with valid input', async () => {
		const { getDocs, addDoc } = await import('firebase/firestore');
		
		// Mock no polls today (under limit)
		(getDocs as any).mockResolvedValueOnce({
			size: 0
		});

		(addDoc as any).mockResolvedValue({ id: 'poll-id' });

		// Mock SmartEngine methods
		const mockAddEnhancedFunFeedEntry = vi.fn();
		const mockUpdateMilestoneProgress = vi.fn();
		const mockGetUserDisplayName = vi.fn().mockResolvedValue('TestUser');
		
		vi.doMock('$lib/smartEngine', async () => {
			const actual = await vi.importActual('$lib/smartEngine') as any;
			return {
				...actual,
				SmartEngine: {
					...actual.SmartEngine,
					addEnhancedFunFeedEntry: mockAddEnhancedFunFeedEntry,
					updateMilestoneProgress: mockUpdateMilestoneProgress,
					getUserDisplayName: mockGetUserDisplayName
				}
			};
		});

		const result = await createCustomPoll('test-user', 'What should we have for lunch?', ['Pizza 🍕', 'Pasta 🍝']);
		
		expect(result.success).toBe(true);
		expect(result.pollId).toBe('poll-id');
		expect(result.guidance).toContain('Great poll!');
		expect(addDoc).toHaveBeenCalled();
	});

	it('should prevent spam by limiting daily poll creation', async () => {
		const { getDocs } = await import('firebase/firestore');
		
		// Mock too many polls today
		(getDocs as any).mockResolvedValueOnce({
			size: 3 // At the limit
		});

		const result = await createCustomPoll('test-user', 'Test question?', ['Option A', 'Option B']);
		
		expect(result.success).toBe(false);
		expect(result.guidance?.[0]).toContain("You've created lots of polls today!");
	});

	it('should reject inappropriate poll content', async () => {
		const result = await createCustomPoll('test-user', 'What is the worst food?', ['Bad food', 'Terrible food']);
		
		expect(result.success).toBe(false);
		expect(result.guidance).toBeDefined();
	});
});

describe('FamilyBot Phase 8: Story Template Seeding', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should seed enhanced story templates correctly', async () => {
		const { getDocs, writeBatch } = await import('firebase/firestore');
		
		// Mock no existing enhanced templates
		(getDocs as any).mockResolvedValueOnce({
			empty: true
		});

		const mockBatch = {
			set: vi.fn(),
			commit: vi.fn()
		};
		(writeBatch as any).mockReturnValue(mockBatch);

		await seedEnhancedStoryTemplates();
		
		expect(mockBatch.set).toHaveBeenCalled();
		expect(mockBatch.commit).toHaveBeenCalled();
		
		// Verify story structure
		const calls = mockBatch.set.mock.calls;
		expect(calls.length).toBeGreaterThan(10); // Should have multiple stories
		
		// Check first story structure
		const firstStory = calls[0][1];
		expect(firstStory.title).toBeDefined();
		expect(firstStory.category).toBeDefined();
		expect(firstStory.chapters).toBeInstanceOf(Array);
		expect(firstStory.placeholders).toBeDefined();
		expect(firstStory.reflection).toBeDefined();
	});

	it('should not re-seed if enhanced templates already exist', async () => {
		const { getDocs, writeBatch } = await import('firebase/firestore');
		
		// Mock existing enhanced templates
		(getDocs as any).mockResolvedValueOnce({
			empty: false
		});

		await seedEnhancedStoryTemplates();
		
		expect(writeBatch).not.toHaveBeenCalled();
	});
});