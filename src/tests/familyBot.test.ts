import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPoll, sendFeedback, getRandomStoryTemplate } from '$lib/smartEngine';

// Mock Firestore
vi.mock('firebase/firestore', () => {
	const mockAddDoc = vi.fn();
	const mockCollection = vi.fn();
	
	return {
		collection: mockCollection,
		addDoc: mockAddDoc,
		serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
	};
});

// Mock Firebase config
vi.mock('$lib/firebase', () => ({
	getFamilyId: vi.fn(() => 'test-family'),
	db: {}
}));

describe('FamilyBot Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createPoll', () => {
		it('should create a poll with correct structure', async () => {
			const { addDoc, collection } = await import('firebase/firestore');
			
			const question = "What should we eat for lunch?";
			const options = ["Pasta 🍝", "Pizza 🍕", "Rice 🍚"];

			await createPoll({ question, options });

			expect(collection).toHaveBeenCalledWith({}, "daily_polls");
			expect(addDoc).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({
					question,
					options: options.map(text => ({ text, votes: [] })),
					familyId: 'test-family',
					createdAt: expect.anything(),
					expiresAt: expect.any(Number),
					totalVotes: 0
				})
			);
		});

		it('should set expiration to 24 hours from now', async () => {
			const { addDoc } = await import('firebase/firestore');
			const now = Date.now();
			
			await createPoll({ 
				question: "Test question?", 
				options: ["A", "B"] 
			});

			const callArgs = (addDoc as any).mock.calls[0][1];
			const expiresAt = callArgs.expiresAt;
			const expectedExpiration = now + 24 * 60 * 60 * 1000;
			
			// Allow 1 second tolerance for test timing
			expect(expiresAt).toBeGreaterThan(expectedExpiration - 1000);
			expect(expiresAt).toBeLessThan(expectedExpiration + 1000);
		});
	});

	describe('sendFeedback', () => {
		it('should send feedback with correct structure', async () => {
			const { addDoc, collection } = await import('firebase/firestore');
			
			const uid = 'test-user-123';
			const message = 'This is test feedback';

			await sendFeedback(uid, message);

			expect(collection).toHaveBeenCalledWith({}, `users/${uid}/feedback`);
			expect(addDoc).toHaveBeenCalledWith(
				undefined,
				expect.objectContaining({
					message,
					source: 'FamilyBot',
					createdAt: expect.anything()
				})
			);
		});
	});

	describe('getRandomStoryTemplate', () => {
		it('should return a string story template', async () => {
			const story = await getRandomStoryTemplate();
			
			expect(typeof story).toBe('string');
			expect(story.length).toBeGreaterThan(0);
		});

		it('should return different stories on multiple calls', async () => {
			const stories = new Set();
			
			// Call multiple times to check for variety
			for (let i = 0; i < 20; i++) {
				const story = await getRandomStoryTemplate();
				stories.add(story);
			}
			
			// Should have at least 2 different stories from 20 calls
			expect(stories.size).toBeGreaterThan(1);
		});

		it('should return stories with emojis', async () => {
			const story = await getRandomStoryTemplate();
			
			// Check that the story contains at least one emoji (using more comprehensive regex)
			const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
			expect(emojiRegex.test(story)).toBe(true);
		});
	});
});