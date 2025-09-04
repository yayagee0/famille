import { describe, it, expect } from 'vitest';
import { validatePost, validateImageFile, validateVideoFile } from '../lib/schemas';
import { serverTimestamp } from 'firebase/firestore';

describe('FeedUpload Integration', () => {
	it('should validate a complete text post as created by FeedUpload', () => {
		// Simulating the exact structure created by FeedUpload component
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'text' as const,
			text: 'This is a test post',
			createdAt: new Date(),
			likes: [],
			comments: []
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});

	it('should validate a complete photo post as created by FeedUpload', () => {
		// Simulating the exact structure created by FeedUpload component
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'photo' as const,
			text: 'Check out this photo!',
			createdAt: new Date(),
			likes: [],
			comments: [],
			imageUrl:
				'https://storage.googleapis.com/test-bucket/posts/test-user-123/1234567890-image.jpg',
			imagePath:
				'https://storage.googleapis.com/test-bucket/posts/test-user-123/1234567890-image.jpg',
			imagePaths: [
				'https://storage.googleapis.com/test-bucket/posts/test-user-123/1234567890-image.jpg'
			]
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});

	it('should validate a complete video post as created by FeedUpload', () => {
		// Simulating the exact structure created by FeedUpload component
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'video' as const,
			text: 'Check out this video!',
			createdAt: new Date(),
			likes: [],
			comments: [],
			videoPath:
				'https://storage.googleapis.com/test-bucket/posts/test-user-123/1234567890-video.mp4'
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});

	it('should validate a complete YouTube post as created by FeedUpload', () => {
		// Simulating the exact structure created by FeedUpload component
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'youtube' as const,
			text: 'Check out this video!',
			createdAt: new Date(),
			likes: [],
			comments: [],
			youtubeId: 'dQw4w9WgXcQ'
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});

	it('should validate a complete poll post as created by FeedUpload', () => {
		// Simulating the exact structure created by FeedUpload component
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'poll' as const,
			text: '',
			createdAt: new Date(),
			likes: [],
			comments: [],
			poll: {
				title: 'What is your favorite color?',
				options: [
					{ text: 'Red', votes: [] },
					{ text: 'Blue', votes: [] },
					{ text: 'Green', votes: [] }
				]
			}
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});

	it('should allow any file type for uploads (no validation)', () => {
		// Test that file validation now accepts any file type and size
		const mockFile = new File(['content'], 'document.pdf', {
			type: 'application/pdf',
			lastModified: Date.now()
		});
		// Large file size - 10MB
		Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 });

		// Using image validation function but it should accept any file now
		const result = validateImageFile(mockFile);
		expect(result.success).toBe(true);
	});

	it('should allow large video files (no size restrictions)', () => {
		// Test that video validation now accepts any file size
		const mockFile = new File(['content'], 'large-video.mov', {
			type: 'video/quicktime',
			lastModified: Date.now()
		});
		// Large file size - 500MB
		Object.defineProperty(mockFile, 'size', { value: 500 * 1024 * 1024 });

		const result = validateVideoFile(mockFile);
		expect(result.success).toBe(true);
	});

	it('should fail validation when using serverTimestamp() instead of Date', () => {
		// This test demonstrates the issue with serverTimestamp validation
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'text' as const,
			text: 'This is a test post',
			createdAt: serverTimestamp(), // This should fail validation
			likes: [],
			comments: []
		};

		const result = validatePost(postData);
		expect(result.success).toBe(false);
		if (!result.success) {
			// Verify it's specifically a date validation error
			expect(result.error.toString()).toContain('date');
		}
	});

	it('should pass validation when using Date object (the fix)', () => {
		// This test demonstrates the fix - using Date object for validation
		const postData = {
			authorUid: 'test-user-123',
			familyId: 'test-family',
			kind: 'text' as const,
			text: 'This is a test post',
			createdAt: new Date(), // This should pass validation
			likes: [],
			comments: []
		};

		const result = validatePost(postData);
		expect(result.success).toBe(true);
	});
});
