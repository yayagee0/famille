import { describe, it, expect } from 'vitest';
import {
	validateEnv,
	validateImageFile,
	validateVideoFile,
	validatePost,
	envSchema,
	imageFileSchema,
	videoFileSchema,
	textPostSchema
} from '../lib/schemas';

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
				VITE_ALLOWED_EMAILS: 'test@example.com,test2@example.com'
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

		it('should reject oversized image files', () => {
			const mockImageFile = new File(['mock content'], 'test.jpg', {
				type: 'image/jpeg',
				lastModified: Date.now()
			});
			// Mock file size to be over 5MB
			Object.defineProperty(mockImageFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

			const result = validateImageFile(mockImageFile);
			expect(result.success).toBe(false);
		});

		it('should reject non-image files', () => {
			const mockTextFile = new File(['mock content'], 'test.txt', {
				type: 'text/plain',
				lastModified: Date.now()
			});

			const result = validateImageFile(mockTextFile);
			expect(result.success).toBe(false);
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
		const mockAuthor = {
			uid: 'test-uid',
			displayName: 'Test User',
			photoURL: 'https://example.com/photo.jpg',
			email: 'test@example.com'
		};

		it('should validate a text post', () => {
			const textPost = {
				type: 'text' as const,
				content: 'This is a test post',
				author: mockAuthor,
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(textPost);
			expect(result.success).toBe(true);
		});

		it('should reject text post with empty content', () => {
			const textPost = {
				type: 'text' as const,
				content: '', // empty content
				author: mockAuthor,
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(textPost);
			expect(result.success).toBe(false);
		});

		it('should validate a photo post with imagePaths', () => {
			const photoPost = {
				type: 'photo' as const,
				content: 'Photo description',
				author: mockAuthor,
				imagePaths: ['https://example.com/image1.jpg'],
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(photoPost);
			expect(result.success).toBe(true);
		});

		it('should validate a poll post', () => {
			const pollPost = {
				type: 'poll' as const,
				content: 'Poll description',
				author: mockAuthor,
				poll: {
					title: 'What is your favorite color?',
					options: [
						{ text: 'Red', votes: [] },
						{ text: 'Blue', votes: ['user1', 'user2'] }
					]
				},
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(pollPost);
			expect(result.success).toBe(true);
		});

		it('should validate a YouTube post', () => {
			const youtubePost = {
				type: 'youtube' as const,
				content: 'Check out this video',
				author: mockAuthor,
				youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(youtubePost);
			expect(result.success).toBe(true);
		});

		it('should reject YouTube post with invalid URL', () => {
			const youtubePost = {
				type: 'youtube' as const,
				content: 'Check out this video',
				author: mockAuthor,
				youtubeUrl: 'https://example.com/not-youtube',
				familyId: 'test-family',
				createdAt: new Date()
			};

			const result = validatePost(youtubePost);
			expect(result.success).toBe(false);
		});
	});
});
