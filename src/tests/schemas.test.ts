import { describe, it, expect } from 'vitest';
import { validateEnv, validateImageFile, validateVideoFile, validatePost, validateNotification } from '../lib/schemas';

describe('Schema Validation', () => {
	describe('Environment Variables', () => {
		it('should validate valid environment variables', () => {
			const validEnv = {
				VITE_FB_API_KEY: 'test-api-key',
				VITE_FB_AUTH_DOMAIN: 'test.firebaseapp.com',
				VITE_FB_PROJECT_ID: 'test-project',
				VITE_FB_STORAGE_BUCKET: 'test-bucket',
				VITE_FB_APP_ID: 'test-app-id',
				VITE_FB_RETURN_URL: 'http://localhost:5173',
				VITE_FAMILY_ID: 'test-family',
				VITE_ALLOWED_EMAILS: 'test@example.com,test2@example.com',
				VITE_BIRTHDAYS: '{"test@example.com":"2000-01-01"}',
				VITE_NICKNAMES: '{"test@example.com":"Tester"}'
			};

			const result = validateEnv(validEnv);
			expect(result.success).toBe(true);
		});

		it('should reject invalid environment variables', () => {
			const invalidEnv = {
				VITE_FB_API_KEY: '', // empty string
				VITE_FB_RETURN_URL: 'not-a-url' // invalid URL
			};

			const result = validateEnv(invalidEnv);
			expect(result.success).toBe(false);
		});
	});

	describe('File Validation', () => {
		it('should validate valid image files', () => {
			const mockImageFile = new File(['mock content'], 'test.jpg', {
				type: 'image/jpeg',
				lastModified: Date.now()
			});
			// Mock file size to be under 5MB
			Object.defineProperty(mockImageFile, 'size', { value: 1024 * 1024 }); // 1MB

			const result = validateImageFile(mockImageFile);
			expect(result.success).toBe(true);
		});

		it('should accept oversized image files (no restrictions)', () => {
			const mockImageFile = new File(['mock content'], 'test.jpg', {
				type: 'image/jpeg',
				lastModified: Date.now()
			});
			// Mock file size to be over 5MB - should now be accepted
			Object.defineProperty(mockImageFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

			const result = validateImageFile(mockImageFile);
			expect(result.success).toBe(true);
		});

		it('should accept non-image files (no type restrictions)', () => {
			const mockTextFile = new File(['mock content'], 'test.txt', {
				type: 'text/plain',
				lastModified: Date.now()
			});

			const result = validateImageFile(mockTextFile);
			expect(result.success).toBe(true);
		});

		it('should validate valid video files', () => {
			const mockVideoFile = new File(['mock content'], 'test.mp4', {
				type: 'video/mp4',
				lastModified: Date.now()
			});
			// Mock file size to be under 100MB
			Object.defineProperty(mockVideoFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB

			const result = validateVideoFile(mockVideoFile);
			expect(result.success).toBe(true);
		});
	});

	describe('Post Validation', () => {
		it('should validate a text post', () => {
			const textPost = {
				kind: 'text' as const,
				text: 'This is a test post',
				authorUid: 'test-uid',
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(textPost);
			expect(result.success).toBe(true);
		});

		it('should reject text post with empty content', () => {
			const textPost = {
				kind: 'text' as const,
				text: '', // empty content
				authorUid: 'test-uid',
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(textPost);
			expect(result.success).toBe(false);
		});

		it('should validate a photo post with imagePaths', () => {
			const photoPost = {
				kind: 'photo' as const,
				text: 'Photo description',
				authorUid: 'test-uid',
				imagePaths: ['https://example.com/image1.jpg'],
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(photoPost);
			expect(result.success).toBe(true);
		});

		it('should validate a poll post', () => {
			const pollPost = {
				kind: 'poll' as const,
				text: 'Poll description',
				authorUid: 'test-uid',
				poll: {
					title: 'What is your favorite color?',
					options: [
						{ text: 'Red', votes: [] },
						{ text: 'Blue', votes: ['user1', 'user2'] }
					]
				},
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(pollPost);
			expect(result.success).toBe(true);
		});

		it('should validate a YouTube post', () => {
			const youtubePost = {
				kind: 'youtube' as const,
				text: 'Check out this video',
				authorUid: 'test-uid',
				youtubeId: 'dQw4w9WgXcQ',
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(youtubePost);
			expect(result.success).toBe(true);
		});

		it('should reject YouTube post with invalid URL', () => {
			const youtubePost = {
				kind: 'youtube' as const,
				text: 'Check out this video',
				authorUid: 'test-uid',
				youtubeId: '', // empty ID
				familyId: 'test-family',
				createdAt: new Date(),
				likes: [],
				comments: []
			};

			const result = validatePost(youtubePost);
			expect(result.success).toBe(false);
		});
	});

	describe('Notification Validation', () => {
		it('should validate a valid notification', () => {
			const validNotification = {
				id: 'notification-123',
				type: 'newPost' as const,
				title: 'New Family Post',
				body: 'John shared a new photo',
				createdAt: new Date(),
				read: false,
				link: '/feed#post-123'
			};

			const result = validateNotification(validNotification);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('newPost');
				expect(result.data.read).toBe(false);
			}
		});

		it('should validate notification without optional link', () => {
			const notification = {
				id: 'notification-456',
				type: 'birthday' as const,
				title: 'Happy Birthday!',
				body: "It's Sarah's birthday today!",
				createdAt: new Date(),
				read: true
			};

			const result = validateNotification(notification);
			expect(result.success).toBe(true);
		});

		it('should reject notification with invalid type', () => {
			const invalidNotification = {
				id: 'notification-789',
				type: 'invalidType' as any,
				title: 'Test',
				body: 'Test body',
				createdAt: new Date(),
				read: false
			};

			const result = validateNotification(invalidNotification);
			expect(result.success).toBe(false);
		});

		it('should reject notification with missing required fields', () => {
			const incompleteNotification = {
				id: 'notification-999',
				type: 'comment' as const,
				// missing title and body
				createdAt: new Date(),
				read: false
			};

			const result = validateNotification(incompleteNotification);
			expect(result.success).toBe(false);
		});

		it('should default read to false if not provided', () => {
			const notification = {
				id: 'notification-default',
				type: 'system' as const,
				title: 'System Update',
				body: 'App updated successfully',
				createdAt: new Date()
			};

			const result = validateNotification(notification);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.read).toBe(false);
			}
		});
	});
});
