import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { browser } from '$app/environment';
import { FIREBASE_CONFIG, FAMILY_ID } from './config';
import { getDisplayName } from './getDisplayName';

// Initialize Firebase
export const app = initializeApp(FIREBASE_CONFIG);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize messaging only in browser
let messaging: Messaging | null = null;
if (browser) {
	try {
		messaging = getMessaging(app);
	} catch (error) {
		console.warn('Firebase Messaging not available:', error);
	}
}

export { messaging };

// Enable offline persistence for Firestore
if (browser) {
	enableIndexedDbPersistence(db).catch((err) => {
		if (err.code === 'failed-precondition') {
			// Multiple tabs open, persistence can only be enabled in one tab at a time
			console.warn('Firestore persistence failed: Multiple tabs open');
		} else if (err.code === 'unimplemented') {
			// The current browser doesn't support persistence
			console.warn('Firestore persistence not supported by this browser');
		}
	});
}

// ✅ Force storage to use the correct bucket explicitly
export const storage = getStorage(app, `gs://${FIREBASE_CONFIG.storageBucket}`);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
	prompt: 'select_account'
});

// Only connect to emulators in development
if (browser && import.meta.env.DEV) {
	// Emulator connections removed - uncomment and import if needed locally
	// connectAuthEmulator(auth, 'http://localhost:9099');
	// connectFirestoreEmulator(db, 'localhost', 8080);
	// connectStorageEmulator(storage, 'localhost', 9199');
}

// Helper function to get current family ID
export const getFamilyId = () => FAMILY_ID;

// Helper function to get return URL
export const getReturnUrl = () => FIREBASE_CONFIG.returnUrl;

// Firebase utility functions
import {
	collection,
	query,
	where,
	orderBy,
	getDocs,
	doc,
	getDoc,
	addDoc,
	updateDoc,
	deleteDoc,
	onSnapshot,
	serverTimestamp,
	type Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(file: File, folder: string, userId: string): Promise<string> {
	const filename = `${Date.now()}-${file.name}`;
	const fileRef = ref(storage, `${folder}/${userId}/${filename}`);
	const uploadSnapshot = await uploadBytes(fileRef, file);
	return await getDownloadURL(uploadSnapshot.ref);
}

/**
 * Get posts with author enrichment
 */
export async function getPosts(familyId?: string): Promise<any[]> {
	const familyIdToUse = familyId || getFamilyId();

	const postsQuery = query(
		collection(db, 'posts'),
		...(familyIdToUse ? [where('familyId', '==', familyIdToUse)] : []),
		orderBy('createdAt', 'desc')
	);

	const snapshot = await getDocs(postsQuery);
	const rawPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

	// Enrich posts with author data
	const enrichedPosts = await Promise.all(
		rawPosts.map(async (post: any) => {
			if (post.authorUid) {
				const userDoc = await getDoc(doc(db, 'users', post.authorUid));
				if (userDoc.exists()) {
					const userData = userDoc.data();
					return {
						...post,
						author: {
							displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
							avatarUrl: userData.avatarUrl || null,
							email: userData.email || null
						}
					};
				}
			}
			return { ...post, author: { displayName: getDisplayName(null), avatarUrl: null } };
		})
	);

	return enrichedPosts;
}

/**
 * Subscribe to posts with real-time updates
 */
export function subscribeToPosts(callback: (posts: any[]) => void, familyId?: string): Unsubscribe {
	const familyIdToUse = familyId || getFamilyId();

	const postsQuery = query(
		collection(db, 'posts'),
		...(familyIdToUse ? [where('familyId', '==', familyIdToUse)] : []),
		orderBy('createdAt', 'desc')
	);

	return onSnapshot(postsQuery, async (snapshot) => {
		const rawPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		// Enrich posts with author data
		const enrichedPosts = await Promise.all(
			rawPosts.map(async (post: any) => {
				if (post.authorUid) {
					const userDoc = await getDoc(doc(db, 'users', post.authorUid));
					if (userDoc.exists()) {
						const userData = userDoc.data();
						return {
							...post,
							author: {
								displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
								avatarUrl: userData.avatarUrl || null,
								email: userData.email || null
							}
						};
					}
				}
				return { ...post, author: { displayName: getDisplayName(null), avatarUrl: null } };
			})
		);

		callback(enrichedPosts);
	});
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId: string): Promise<any | null> {
	const userDoc = await getDoc(doc(db, 'users', userId));
	if (userDoc.exists()) {
		return { id: userDoc.id, ...userDoc.data() };
	}
	return null;
}

/**
 * Get all family member profiles by email using batched queries
 */
export async function getAllUserProfiles(emails: string[]): Promise<Record<string, any>> {
	const profiles: Record<string, any> = {};

	// Normalize emails to lowercase
	const normalizedEmails = emails.map((email) => email.toLowerCase().trim());

	// Use Firestore "in" queries in batches of 10 (Firestore limit)
	const batches = [];
	for (let i = 0; i < normalizedEmails.length; i += 10) {
		batches.push(normalizedEmails.slice(i, i + 10));
	}

	try {
		for (const batch of batches) {
			const usersQuery = query(collection(db, 'users'), where('email', 'in', batch));
			const snapshot = await getDocs(usersQuery);

			snapshot.forEach((doc) => {
				const userData = doc.data();
				if (userData.email) {
					const normalizedEmail = userData.email.toLowerCase().trim();
					// Always return { email, nickname } if available
					profiles[normalizedEmail] = {
						email: userData.email,
						nickname: userData.nickname,
						displayName: userData.displayName,
						avatarUrl: userData.avatarUrl,
						photoURL: userData.photoURL,
						uid: userData.uid
					};
				}
			});
		}
	} catch (error) {
		console.error('Failed to load user profiles:', error);
	}

	return profiles;
}

/**
 * Create a new post
 */
export async function createPost(postData: any): Promise<string> {
	const docRef = await addDoc(collection(db, 'posts'), {
		...postData,
		createdAt: serverTimestamp()
	});
	return docRef.id;
}

/**
 * Update an existing post
 */
export async function updatePost(postId: string, updates: any): Promise<void> {
	await updateDoc(doc(db, 'posts', postId), {
		...updates,
		updatedAt: serverTimestamp()
	});
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<void> {
	await deleteDoc(doc(db, 'posts', postId));
}

/**
 * Get photos only (for gallery)
 */
export async function getPhotoPosts(familyId?: string): Promise<any[]> {
	const familyIdToUse = familyId || getFamilyId();

	const photosQuery = query(
		collection(db, 'posts'),
		where('familyId', '==', familyIdToUse),
		where('kind', '==', 'photo'),
		orderBy('createdAt', 'desc')
	);

	const snapshot = await getDocs(photosQuery);
	const rawPhotos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

	// Enrich with author data
	const enrichedPhotos = await Promise.all(
		rawPhotos.map(async (photo: any) => {
			if (photo.authorUid) {
				const userDoc = await getDoc(doc(db, 'users', photo.authorUid));
				if (userDoc.exists()) {
					const userData = userDoc.data();
					return {
						...photo,
						author: {
							displayName: getDisplayName(userData.email, { nickname: userData.nickname }),
							avatarUrl: userData.avatarUrl || null
						},
						// Create display URL for gallery
						displayUrl: photo.imagePaths?.[0] || photo.imagePath || ''
					};
				}
			}
			return {
				...photo,
				author: { displayName: getDisplayName(null), avatarUrl: null },
				displayUrl: photo.imagePaths?.[0] || photo.imagePath || ''
			};
		})
	);

	return enrichedPhotos;
}

/**
 * Notification functions
 */

/**
 * Create a notification for a specific user
 */
export async function createNotification(
	userId: string,
	notification: {
		type: 'newPost' | 'comment' | 'birthday' | 'system';
		title: string;
		body: string;
		link?: string;
	}
): Promise<string> {
	const notificationData = {
		id: '', // Will be set by Firestore
		...notification,
		createdAt: serverTimestamp(),
		read: false
	};

	const docRef = await addDoc(collection(db, 'notifications', userId, 'items'), notificationData);
	
	// Update the document with its own ID
	await updateDoc(docRef, { id: docRef.id });
	
	return docRef.id;
}

/**
 * Get notifications for a user with real-time updates
 */
export function subscribeToNotifications(
	userId: string,
	callback: (notifications: any[]) => void
): Unsubscribe {
	const notificationsQuery = query(
		collection(db, 'notifications', userId, 'items'),
		orderBy('createdAt', 'desc'),
		limit(10)
	);

	return onSnapshot(notificationsQuery, (snapshot) => {
		const notifications = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}));
		callback(notifications);
	});
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
	await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
		read: true
	});
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
	const unreadQuery = query(
		collection(db, 'notifications', userId, 'items'),
		where('read', '==', false)
	);
	
	const snapshot = await getDocs(unreadQuery);
	return snapshot.size;
}

/**
 * Create notifications for all family members when a new post is created
 */
export async function notifyFamilyOfNewPost(
	authorUid: string,
	authorDisplayName: string,
	postType: string,
	postId: string
): Promise<void> {
	// Get all family member emails from environment
	const allowedEmails = import.meta.env.VITE_ALLOWED_EMAILS?.split(',') || [];
	
	// Get all user profiles to find UIDs
	const userProfiles = await getAllUserProfiles(allowedEmails);
	
	// Create notifications for all family members except the author
	const notificationPromises = Object.entries(userProfiles)
		.filter(([email, profile]) => profile.uid !== authorUid)
		.map(([email, profile]) =>
			createNotification(profile.uid, {
				type: 'newPost',
				title: 'New Family Post',
				body: `${authorDisplayName} shared a new ${postType}`,
				link: `/feed#${postId}`
			})
		);

	await Promise.all(notificationPromises);
}

/**
 * FCM (Firebase Cloud Messaging) functions
 */

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
	if (!browser || !messaging) {
		console.warn('FCM not available');
		return null;
	}

	try {
		// Request notification permission
		const permission = await Notification.requestPermission();
		
		if (permission === 'granted') {
			// Get FCM token
			const token = await getToken(messaging, {
				vapidKey: import.meta.env.VITE_VAPID_KEY // We'll need to add this to env
			});
			
			console.log('FCM token obtained:', token);
			return token;
		} else {
			console.warn('Notification permission denied');
			return null;
		}
	} catch (error) {
		console.error('Error getting FCM token:', error);
		return null;
	}
}

/**
 * Store FCM token for a user
 */
export async function storeFCMToken(userId: string, token: string): Promise<void> {
	try {
		const userRef = doc(db, 'users', userId);
		const userDoc = await getDoc(userRef);
		
		if (userDoc.exists()) {
			const userData = userDoc.data();
			const existingTokens = userData.fcmTokens || [];
			
			// Add token if not already present
			if (!existingTokens.includes(token)) {
				await updateDoc(userRef, {
					fcmTokens: [...existingTokens, token],
					lastUpdatedAt: serverTimestamp()
				});
			}
		}
	} catch (error) {
		console.error('Error storing FCM token:', error);
	}
}

/**
 * Setup FCM message listener for foreground notifications
 */
export function setupFCMListener(): void {
	if (!browser || !messaging) {
		return;
	}

	onMessage(messaging, (payload) => {
		console.log('Foreground message received:', payload);
		
		// Show notification if the app is in foreground
		if (payload.notification) {
			new Notification(payload.notification.title || 'Family Hub', {
				body: payload.notification.body,
				icon: '/android-chrome-192x192.png',
				badge: '/android-chrome-192x192.png'
			});
		}
	});
}

/**
 * Create birthday notification for all family members
 */
export async function createBirthdayNotification(
	birthdayPersonName: string,
	age: number
): Promise<void> {
	try {
		// Get all family member emails from environment
		const allowedEmails = import.meta.env.VITE_ALLOWED_EMAILS?.split(',') || [];
		
		// Get all user profiles to find UIDs
		const userProfiles = await getAllUserProfiles(allowedEmails);
		
		// Create birthday notifications for all family members
		const notificationPromises = Object.values(userProfiles).map((profile) =>
			createNotification(profile.uid, {
				type: 'birthday',
				title: '🎂 Birthday Reminder',
				body: `${birthdayPersonName} turns ${age} today! Don't forget to wish them well!`,
				link: '/dashboard'
			})
		);

		await Promise.all(notificationPromises);
	} catch (error) {
		console.error('Error creating birthday notifications:', error);
	}
}

/**
 * Initialize FCM for a user (request permission and store token)
 */
export async function initializeFCMForUser(userId: string): Promise<void> {
	try {
		const token = await requestNotificationPermission();
		if (token) {
			await storeFCMToken(userId, token);
			setupFCMListener();
		}
	} catch (error) {
		console.error('Error initializing FCM:', error);
	}
}
