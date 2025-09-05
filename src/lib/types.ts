// Shared TypeScript interfaces for the Family Hub application

export interface User {
	uid: string;
	displayName: string | null;
	email: string;
	avatarUrl?: string | null;
	photoURL?: string | null;
	createdAt?: any;
	lastLoginAt?: any;
	lastUpdatedAt?: any;
	nickname?: string;
}

export interface RawPost {
	id: string;
	authorUid: string;
	familyId: string;
	kind: 'text' | 'photo' | 'video' | 'youtube' | 'poll';
	text: string;
	createdAt: any;
	likes: string[];
	comments: Comment[];

	// Media fields (optional)
	imagePath?: string;
	imagePaths?: string[];
	videoPath?: string;
	youtubeId?: string;

	// Poll fields (optional)
	poll?: {
		title: string;
		options: Array<{
			text: string;
			votes: string[];
		}>;
	};
}

export interface Post extends RawPost {
	// Author enrichment (added by components)
	author: {
		displayName: string;
		avatarUrl: string | null;
	};
}

export interface Photo {
	id: string;
	imageUrl: string;
	displayUrl: string;
	author: {
		displayName: string;
		avatarUrl: string | null;
	};
	text?: string;
	createdAt: any;
}

export interface Comment {
	uid: string;
	text: string;
	createdAt: any;
	author?: string; // Display name of commenter
	displayName?: string;
	avatarUrl?: string | null;
}

export interface Question {
	id: string;
	text: string;
	category: string;
	type: 'multiple-choice' | 'open-ended';
	options?: string[];
	allowOther?: boolean;
	sentenceTemplate: string;
	createdAt: any;
}

export interface UserAnswer {
	questionId: string;
	answer: string;
	category: string;
	createdAt: any;
	visibility: 'private';
	custom?: boolean;
}
