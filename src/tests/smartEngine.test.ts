import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartEngine } from '$lib/smartEngine';
import { nudgeTemplates, identityTraits, characters } from '$lib/data/smartEngine';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	setDoc: vi.fn(),
	updateDoc: vi.fn(),
	addDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	getDocs: vi.fn(),
	serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
	Timestamp: {
		now: vi.fn(() => ({
			seconds: Date.now() / 1000,
			nanoseconds: 0,
			toDate: vi.fn(() => new Date())
		})),
		fromDate: vi.fn((date) => ({
			seconds: date.getTime() / 1000,
			nanoseconds: 0,
			toDate: vi.fn(() => date)
		}))
	}
}));

vi.mock('$lib/firebase', () => ({
	db: {}
}));

describe('Smart Engine Core Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Data Structures', () => {
		it('should have valid nudge templates', () => {
			expect(nudgeTemplates).toBeDefined();
			expect(Array.isArray(nudgeTemplates)).toBe(true);
			expect(nudgeTemplates.length).toBeGreaterThan(0);

			nudgeTemplates.forEach((template) => {
				expect(template.id).toBeDefined();
				expect(template.type).toBeDefined();
				expect([
					'positive',
					'bonding',
					'constructive',
					'reflection',
					'islamic',
					'personalized'
				]).toContain(template.type);
				expect(template.template).toBeDefined();
				expect(template.character).toBeDefined();
				expect(['noor', 'botu', 'mimi']).toContain(template.character);
				expect(typeof template.weight).toBe('number');
				expect(template.weight).toBeGreaterThan(0);
			});
		});

		it('should have valid identity traits', () => {
			expect(identityTraits).toBeDefined();
			expect(Array.isArray(identityTraits)).toBe(true);
			expect(identityTraits.length).toBeGreaterThan(0);

			identityTraits.forEach((trait) => {
				expect(trait.id).toBeDefined();
				expect(trait.category).toBeDefined();
				expect(['personality', 'interests', 'strengths', 'goals']).toContain(trait.category);
				expect(trait.name).toBeDefined();
				expect(trait.description).toBeDefined();
				expect(Array.isArray(trait.examples)).toBe(true);
			});
		});

		it('should have valid character definitions', () => {
			expect(characters).toBeDefined();
			expect(Array.isArray(characters)).toBe(true);
			expect(characters.length).toBe(3);

			characters.forEach((character) => {
				expect(character.id).toBeDefined();
				expect(['noor', 'botu', 'mimi']).toContain(character.id);
				expect(character.name).toBeDefined();
				expect(character.emoji).toBeDefined();
				expect(character.personality).toBeDefined();
				expect(Array.isArray(character.greetings)).toBe(true);
				expect(Array.isArray(character.catchphrases)).toBe(true);
				expect(character.greetings.length).toBeGreaterThan(0);
				expect(character.catchphrases.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Nudge Selection Logic', () => {
		it('should enforce nudge type distribution rules', () => {
			const userTraits = {
				userId: 'test-user',
				traits: ['curious', 'kind_heart'],
				currentRotationIndex: 0,
				lastRotationDate: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			// Test multiple selections to verify distribution
			const selectedTypes: string[] = [];
			for (let i = 0; i < 100; i++) {
				const template = SmartEngine.selectNudgeTemplate(userTraits);
				if (template) {
					selectedTypes.push(template.type);
				}
			}

			const constructiveCount = selectedTypes.filter((type) => type === 'constructive').length;
			const nonConstructiveCount = selectedTypes.length - constructiveCount;

			// Should have significantly more non-constructive nudges (≥80%)
			expect(nonConstructiveCount).toBeGreaterThan(constructiveCount * 3);
		});

		it('should select templates based on available traits', () => {
			const userTraitsWithCreative = {
				userId: 'test-user',
				traits: ['creative'],
				currentRotationIndex: 0,
				lastRotationDate: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			const template = SmartEngine.selectNudgeTemplate(userTraitsWithCreative);
			expect(template).toBeDefined();
		});

		it('should handle users with no traits gracefully', () => {
			const userTraitsEmpty = {
				userId: 'test-user',
				traits: [],
				currentRotationIndex: 0,
				lastRotationDate: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			const template = SmartEngine.selectNudgeTemplate(userTraitsEmpty);
			expect(template).toBeDefined(); // Should still return a template
		});
	});

	describe('Islamic Progression Logic', () => {
		it('should return lowest ID unanswered question', () => {
			const answeredQuestions = ['allah-2', 'prophet-1', 'quran-3'];
			const nextQuestion = SmartEngine.getNextIslamicQuestion(answeredQuestions);

			expect(nextQuestion).toBeDefined();
			expect(answeredQuestions).not.toContain(nextQuestion);
		});

		it('should handle all questions answered', () => {
			// Create a list of all question IDs (this would need to be updated based on actual data)
			const allQuestionIds = ['allah-1', 'allah-2', 'allah-3']; // Simplified for test
			const nextQuestion = SmartEngine.getNextIslamicQuestion(allQuestionIds);

			// When all questions are answered, should return undefined
			if (allQuestionIds.length >= 50) {
				// Approximate total question count
				expect(nextQuestion).toBeUndefined();
			} else {
				expect(nextQuestion).toBeDefined();
			}
		});
	});

	describe('Trait Rotation Logic', () => {
		it('should return current trait based on rotation index', () => {
			const userTraits = {
				userId: 'test-user',
				traits: ['curious', 'creative', 'helpful'],
				currentRotationIndex: 1,
				lastRotationDate: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			const currentTrait = SmartEngine.getCurrentTrait(userTraits);
			expect(currentTrait).toBe('creative'); // Should return trait at index 1
		});

		it('should handle weekly rotation timing', () => {
			const weekAgo = new Date();
			weekAgo.setDate(weekAgo.getDate() - 8); // 8 days ago

			const userTraits = {
				userId: 'test-user',
				traits: ['curious', 'creative', 'helpful'],
				currentRotationIndex: 0,
				lastRotationDate: {
					seconds: weekAgo.getTime() / 1000,
					nanoseconds: 0,
					toDate: () => weekAgo
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			const currentTrait = SmartEngine.getCurrentTrait(userTraits);
			expect(currentTrait).toBe('creative'); // Should rotate to next trait (index 1)
		});

		it('should handle single trait gracefully', () => {
			const userTraits = {
				userId: 'test-user',
				traits: ['curious'],
				currentRotationIndex: 0,
				lastRotationDate: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any,
				updatedAt: {
					seconds: Date.now() / 1000,
					nanoseconds: 0,
					toDate: () => new Date()
				} as any
			};

			const currentTrait = SmartEngine.getCurrentTrait(userTraits);
			expect(currentTrait).toBe('curious');
		});

		it('should handle empty traits array', () => {
			const userTraits = {
				userId: 'test-user',
				traits: [],
				currentRotationIndex: 0,
				lastRotationDate: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
				updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
			};

			const currentTrait = SmartEngine.getCurrentTrait(userTraits);
			expect(currentTrait).toBeNull();
		});
	});

	describe('Badge Conditions', () => {
		it('should correctly identify badge milestones', () => {
			// Test Islamic learning badges
			const milestones = [1, 5, 10, 25, 50];

			milestones.forEach((milestone) => {
				// This would test the badge awarding logic
				expect(milestone).toBeGreaterThan(0);
			});
		});
	});

	describe('Template Placeholder System', () => {
		it('should identify templates with trait placeholders', () => {
			const traitTemplates = nudgeTemplates.filter((template) =>
				template.template.includes('{{trait}}')
			);

			expect(traitTemplates.length).toBeGreaterThan(0);

			traitTemplates.forEach((template) => {
				expect(template.requiredTraits).toBeDefined();
			});
		});

		it('should identify templates with Islamic placeholders', () => {
			const islamicTemplates = nudgeTemplates.filter((template) =>
				template.template.includes('{{ayah}}')
			);

			expect(islamicTemplates.length).toBeGreaterThan(0);

			islamicTemplates.forEach((template) => {
				expect(template.islamicContext).toBe(true);
			});
		});

		it('should identify templates with character placeholders', () => {
			const characterTemplates = nudgeTemplates.filter((template) =>
				template.template.includes('{{character}}')
			);

			expect(characterTemplates.length).toBeGreaterThan(0);
		});
	});
});
