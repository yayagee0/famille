/**
 * One-time script to fix storage URLs in Firestore
 *
 * This script checks users and posts collections for fields that contain
 * raw storage paths (e.g., starting with "posts/") and converts them to
 * proper signed download URLs using getDownloadURL().
 *
 * Usage: npx tsx scripts/fix-storage-urls.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { config } from 'dotenv';

// Load environment variables
config();

// Firebase configuration using environment variables
const firebaseConfig = {
	apiKey: process.env.VITE_FB_API_KEY,
	authDomain: process.env.VITE_FB_AUTH_DOMAIN,
	projectId: process.env.VITE_FB_PROJECT_ID,
	storageBucket: process.env.VITE_FB_STORAGE_BUCKET,
	appId: process.env.VITE_FB_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Helper function to determine if a string looks like a raw storage path
 * @param value - The string to check
 * @returns true if the string starts with "posts/" (indicating a raw path)
 */
function looksLikePath(value: string | null | undefined): boolean {
	return typeof value === 'string' && value.startsWith('posts/');
}

/**
 * Convert a storage path to a signed download URL
 * @param path - The storage path (e.g., "posts/uid/filename.jpg")
 * @returns The signed download URL
 */
async function pathToDownloadUrl(path: string): Promise<string> {
	const storageRef = ref(storage, path);
	return await getDownloadURL(storageRef);
}

/**
 * Process the users collection to fix avatarUrl fields
 */
async function fixUsersCollection(): Promise<void> {
	console.log('🔍 Processing users collection...');

	const usersSnapshot = await getDocs(collection(db, 'users'));
	let updatedCount = 0;

	for (const userDoc of usersSnapshot.docs) {
		const userData = userDoc.data();
		const { avatarUrl } = userData;

		if (looksLikePath(avatarUrl)) {
			try {
				const newAvatarUrl = await pathToDownloadUrl(avatarUrl);
				await updateDoc(doc(db, 'users', userDoc.id), {
					avatarUrl: newAvatarUrl
				});

				console.log(`✅ Updated user ${userDoc.id}: ${avatarUrl} → ${newAvatarUrl}`);
				updatedCount++;
			} catch (error) {
				console.error(`❌ Failed to update user ${userDoc.id} avatarUrl:`, error);
			}
		}
	}

	console.log(`📊 Users collection: ${updatedCount} documents updated`);
}

/**
 * Process the posts collection to fix imagePath, imagePaths, and videoPath fields
 */
async function fixPostsCollection(): Promise<void> {
	console.log('🔍 Processing posts collection...');

	const postsSnapshot = await getDocs(collection(db, 'posts'));
	let updatedCount = 0;

	for (const postDoc of postsSnapshot.docs) {
		const postData = postDoc.data();
		const { imagePath, imagePaths, videoPath } = postData;
		const updates: Record<string, string | string[]> = {};

		// Check and fix imagePath (single image)
		if (looksLikePath(imagePath)) {
			try {
				updates.imagePath = await pathToDownloadUrl(imagePath);
				console.log(
					`🖼️  Fixed imagePath for post ${postDoc.id}: ${imagePath} → ${updates.imagePath}`
				);
			} catch (error) {
				console.error(`❌ Failed to fix imagePath for post ${postDoc.id}:`, error);
			}
		}

		// Check and fix imagePaths (multiple images array)
		if (Array.isArray(imagePaths)) {
			const fixedImagePaths: string[] = [];
			let hasPathsToFix = false;

			for (const imgPath of imagePaths) {
				if (looksLikePath(imgPath)) {
					try {
						const fixedPath = await pathToDownloadUrl(imgPath);
						fixedImagePaths.push(fixedPath);
						hasPathsToFix = true;
						console.log(
							`🖼️  Fixed imagePaths item for post ${postDoc.id}: ${imgPath} → ${fixedPath}`
						);
					} catch (error) {
						console.error(`❌ Failed to fix imagePaths item for post ${postDoc.id}:`, error);
						fixedImagePaths.push(imgPath); // Keep original on error
					}
				} else {
					fixedImagePaths.push(imgPath); // Keep URLs that are already fixed
				}
			}

			if (hasPathsToFix) {
				updates.imagePaths = fixedImagePaths;
			}
		}

		// Check and fix videoPath
		if (looksLikePath(videoPath)) {
			try {
				updates.videoPath = await pathToDownloadUrl(videoPath);
				console.log(
					`🎥 Fixed videoPath for post ${postDoc.id}: ${videoPath} → ${updates.videoPath}`
				);
			} catch (error) {
				console.error(`❌ Failed to fix videoPath for post ${postDoc.id}:`, error);
			}
		}

		// Update the document if there are any fixes
		if (Object.keys(updates).length > 0) {
			try {
				await updateDoc(doc(db, 'posts', postDoc.id), updates);
				updatedCount++;
			} catch (error) {
				console.error(`❌ Failed to update post ${postDoc.id}:`, error);
			}
		}
	}

	console.log(`📊 Posts collection: ${updatedCount} documents updated`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
	console.log('🚀 Starting storage URL fix script...');
	console.log(`📁 Project: ${firebaseConfig.projectId}`);
	console.log(`🗄️  Storage bucket: ${firebaseConfig.storageBucket}`);
	console.log('');

	try {
		// Process both collections
		await fixUsersCollection();
		console.log('');
		await fixPostsCollection();
		console.log('');
		console.log('✅ Fix completed.');
	} catch (error) {
		console.error('💥 Script failed:', error);
		process.exit(1);
	}
}

// Run the script
main().catch(console.error);
