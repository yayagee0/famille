import { z } from 'zod';

// Question bank schema
export const questionSchema = z.object({
	text: z.string().min(1, 'Question text is required'),
	category: z.enum(['fun', 'daily', 'family', 'values', 'dreams', 'hobbies', 'personality']),
	type: z.enum(['multiple-choice', 'open-ended']),
	options: z.array(z.string()).optional(),
	allowOther: z.boolean().optional(),
	sentenceTemplate: z.string().min(1, 'Sentence template is required'),
	createdAt: z.date(),
	// Phase 2 fields (future-proof)
	seasonal: z.boolean().optional(),
	season: z.string().optional(),
	createdBy: z.string().optional(),
	status: z.enum(['pending', 'approved', 'active']).optional(),
	expiresAt: z.date().optional()
});

// User answer schema
export const userAnswerSchema = z.object({
	questionId: z.string().min(1, 'Question ID is required'),
	answer: z.string().min(1, 'Answer is required'),
	category: z.string().min(1, 'Category is required'),
	createdAt: z.date(),
	visibility: z.literal('private'),
	custom: z.boolean().optional()
});

// Environment variables schema
export const envSchema = z.object({
	VITE_FB_API_KEY: z.string().min(1, 'Firebase API key is required'),
	VITE_FB_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
	VITE_FB_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
	VITE_FB_STORAGE_BUCKET: z.string().min(1, 'Firebase storage bucket is required'),
	VITE_FB_APP_ID: z.string().min(1, 'Firebase app ID is required'),
	VITE_FB_RETURN_URL: z.string().url('Return URL must be a valid URL'),
	VITE_FAMILY_ID: z.string().min(1, 'Family ID is required'),
	VITE_ALLOWED_EMAILS: z.string().min(1, 'Allowed emails list is required'),
	VITE_BIRTHDAYS: z.string().min(1, 'Birthdays JSON is required'),
	VITE_NICKNAMES: z.string().min(1, 'Nicknames JSON is required')
});

// File upload metadata schemas - made permissive for any size and type
export const imageFileSchema = z.object({
	name: z.string().min(1, 'File name is required'),
	size: z.number().min(0), // Allow any size
	type: z.string().min(1) // Allow any file type
});

export const videoFileSchema = z.object({
	name: z.string().min(1, 'File name is required'),
	size: z.number().min(0), // Allow any size
	type: z.string().min(1) // Allow any file type
});

// Post author schema (for inline author objects if needed)
export const postAuthorSchema = z.object({
	uid: z.string().min(1, 'User ID is required'),
	displayName: z.string().nullable(),
	photoURL: z.string().url().nullable().or(z.literal('')),
	email: z.string().email('Valid email is required')
});

// User document schema for Firestore users/{uid}
export const userSchema = z.object({
	uid: z.string().min(1, 'User ID is required'),
	displayName: z.string().nullable(),
	email: z.string().email('Valid email is required'),
	nickname: z.string().optional(), // Profile nickname field
	avatarUrl: z.string().url().nullable().or(z.literal('')).optional(),
	photoURL: z.string().url().nullable().or(z.literal('')).optional(),
	createdAt: z.date().optional(),
	lastLoginAt: z.date().optional(),
	lastUpdatedAt: z.date().optional()
});

// Dedicated UserProfile type (separate from Firebase Auth User)
export const userProfileSchema = z.object({
	email: z.string().email('Valid email is required'),
	nickname: z.string().optional()
});

// Poll option schema
export const pollOptionSchema = z.object({
	text: z.string().min(1, 'Poll option text is required'),
	votes: z.array(z.string()).default([])
});

// Poll schema
export const pollSchema = z.object({
	title: z.string().min(1, 'Poll title is required'),
	options: z.array(pollOptionSchema).min(2, 'Poll must have at least 2 options')
});

// YouTube URL validation (permissive - allows various YouTube formats)
export const youtubeUrlSchema = z.string().refine((url) => {
	const patterns = [
		/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
		/^https?:\/\/youtu\.be\/[\w-]+/,
		/^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
	];
	return patterns.some((pattern) => pattern.test(url));
}, 'Must be a valid YouTube URL');

// Base post schema - unified to use authorUid only
export const basePostSchema = z.object({
	kind: z.enum(['text', 'photo', 'video', 'youtube', 'poll']),
	text: z.string(), // Renamed from content to match Firestore schema, allow empty for some post types
	authorUid: z.string().min(1, 'Author UID is required'),
	familyId: z.string().min(1, 'Family ID is required'),
	createdAt: z.date(),
	likes: z.array(z.string()).default([]),
	comments: z.array(z.any()).default([]),
	// Firestore schema fields for media - made more permissive
	imagePath: z.string().url().optional(),
	imagePaths: z.array(z.string().url()).optional(),
	videoPath: z.string().url().optional(),
	youtubeId: z.string().optional(),
	poll: z
		.object({
			title: z.string(),
			options: z.array(
				z.object({
					text: z.string(),
					votes: z.array(z.string())
				})
			)
		})
		.optional()
});

// Text post schema
export const textPostSchema = basePostSchema.extend({
	kind: z.literal('text'),
	text: z.string().min(1, 'Text post must have content')
});

// Photo post schema
export const photoPostSchema = basePostSchema
	.extend({
		kind: z.literal('photo'),
		imagePath: z.string().url().optional(),
		imagePaths: z.array(z.string().url()).optional()
	})
	.refine((data) => data.imagePath || (data.imagePaths && data.imagePaths.length > 0), {
		message: 'Photo post must have at least one image URL'
	});

// Video post schema
export const videoPostSchema = basePostSchema.extend({
	kind: z.literal('video'),
	videoPath: z.string().url('Video post must have a valid video URL')
});

// YouTube post schema
export const youtubePostSchema = basePostSchema.extend({
	kind: z.literal('youtube'),
	youtubeId: z.string().min(1, 'YouTube post must have a video ID')
});

// Poll post schema
export const pollPostSchema = basePostSchema.extend({
	kind: z.literal('poll'),
	poll: pollSchema
});

// Union of all post types
export const postSchema = z.discriminatedUnion('kind', [
	textPostSchema,
	photoPostSchema,
	videoPostSchema,
	youtubePostSchema,
	pollPostSchema
]);

// Validation helper functions
export function validateEnv(env: Record<string, unknown>) {
	try {
		return { success: true as const, data: envSchema.parse(env) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateImageFile(file: File) {
	try {
		return {
			success: true as const,
			data: imageFileSchema.parse({
				name: file.name,
				size: file.size,
				type: file.type
			})
		};
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateVideoFile(file: File) {
	try {
		return {
			success: true as const,
			data: videoFileSchema.parse({
				name: file.name,
				size: file.size,
				type: file.type
			})
		};
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validatePost(post: unknown) {
	try {
		return { success: true as const, data: postSchema.parse(post) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateQuestion(question: unknown) {
	try {
		return { success: true as const, data: questionSchema.parse(question) };
	} catch (error) {
		return { success: false as const, error };
	}
}

export function validateUserAnswer(answer: unknown) {
	try {
		return { success: true as const, data: userAnswerSchema.parse(answer) };
	} catch (error) {
		return { success: false as const, error };
	}
}
