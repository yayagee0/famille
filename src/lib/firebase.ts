import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { browser } from '$app/environment';
import { validateEnv } from './schemas';

// Validate environment variables
const envValidation = validateEnv(import.meta.env);
if (!envValidation.success) {
	console.error('Invalid environment variables:', envValidation.error);
	throw new Error('Invalid environment configuration');
}

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FB_API_KEY,
	authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FB_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET, // ✅ now using firebasestorage.app
	appId: import.meta.env.VITE_FB_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Force storage to use the correct bucket explicitly
export const storage = getStorage(app, `gs://${import.meta.env.VITE_FB_STORAGE_BUCKET}`);

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
export const getFamilyId = () => import.meta.env.VITE_FAMILY_ID;

// Helper function to get return URL
export const getReturnUrl = () => import.meta.env.VITE_FB_RETURN_URL;

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
							displayName: userData.displayName || 'Unknown User',
							avatarUrl: userData.avatarUrl || null,
							email: userData.email || null
						}
					};
				}
			}
			return { ...post, author: { displayName: 'Unknown User', avatarUrl: null } };
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
								displayName: userData.displayName || 'Unknown User',
								avatarUrl: userData.avatarUrl || null,
								email: userData.email || null
							}
						};
					}
				}
				return { ...post, author: { displayName: 'Unknown User', avatarUrl: null } };
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
							displayName: userData.displayName || 'Unknown User',
							avatarUrl: userData.avatarUrl || null
						},
						// Create display URL for gallery
						displayUrl: photo.imagePaths?.[0] || photo.imagePath || ''
					};
				}
			}
			return {
				...photo,
				author: { displayName: 'Unknown User', avatarUrl: null },
				displayUrl: photo.imagePaths?.[0] || photo.imagePath || ''
			};
		})
	);

	return enrichedPhotos;
}
