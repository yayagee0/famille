import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { browser } from '$app/environment';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FB_API_KEY,
	authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FB_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
	appId: import.meta.env.VITE_FB_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
	prompt: 'select_account'
});

// Only connect to emulators in development when running in browser
if (browser && import.meta.env.DEV) {
	// Uncomment these lines if you want to use Firebase emulators in development
	// connectAuthEmulator(auth, 'http://localhost:9099');
	// connectFirestoreEmulator(db, 'localhost', 8080);
	// connectStorageEmulator(storage, 'localhost', 9199);
}

// Helper function to get current family ID
export const getFamilyId = () => import.meta.env.VITE_FAMILY_ID;

// Helper function to get return URL
export const getReturnUrl = () => import.meta.env.VITE_FB_RETURN_URL;
