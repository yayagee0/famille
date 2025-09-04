import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
// Note: In production, use service account key or other secure authentication
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
	? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
	: null;

if (!admin.apps.length) {
	if (serviceAccount) {
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			projectId: process.env.VITE_FB_PROJECT_ID || 'familyg-719f2'
		});
	} else {
		// Fallback to default credentials (for local development)
		admin.initializeApp({
			projectId: process.env.VITE_FB_PROJECT_ID || 'familyg-719f2'
		});
	}
}

const db = admin.firestore();

interface BackupData {
	timestamp: string;
	collections: {
		[key: string]: any[];
	};
	metadata: {
		exportedAt: string;
		projectId: string;
		totalDocuments: number;
		collections: string[];
	};
}

async function backupCollection(collectionName: string): Promise<any[]> {
	console.log(`📦 Backing up collection: ${collectionName}`);

	const snapshot = await db.collection(collectionName).get();
	const documents: any[] = [];

	snapshot.forEach((doc) => {
		documents.push({
			id: doc.id,
			data: doc.data(),
			path: doc.ref.path
		});
	});

	console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
	return documents;
}

async function backupSubcollections(parentPath: string): Promise<any[]> {
	console.log(`📦 Checking subcollections in: ${parentPath}`);

	const parentRef = db.doc(parentPath);
	const subcollections = await parentRef.listCollections();
	const allDocs: any[] = [];

	for (const subcollection of subcollections) {
		console.log(`📦 Backing up subcollection: ${subcollection.path}`);
		const snapshot = await subcollection.get();

		snapshot.forEach((doc) => {
			allDocs.push({
				id: doc.id,
				data: doc.data(),
				path: doc.ref.path
			});
		});
	}

	return allDocs;
}

async function performBackup(): Promise<void> {
	try {
		console.log('🚀 Starting Firestore backup...');

		const backupData: BackupData = {
			timestamp: new Date().toISOString(),
			collections: {},
			metadata: {
				exportedAt: new Date().toISOString(),
				projectId: process.env.VITE_FB_PROJECT_ID || 'familyg-719f2',
				totalDocuments: 0,
				collections: []
			}
		};

		// Main collections to backup
		const collectionsToBackup = ['posts', 'users', 'questions', 'daily-moods'];

		// Backup main collections
		for (const collectionName of collectionsToBackup) {
			try {
				const documents = await backupCollection(collectionName);
				backupData.collections[collectionName] = documents;
				backupData.metadata.totalDocuments += documents.length;
				backupData.metadata.collections.push(collectionName);
			} catch (error) {
				console.warn(`⚠️ Failed to backup collection ${collectionName}:`, error);
				backupData.collections[collectionName] = [];
			}
		}

		// Backup user-specific subcollections (userAnswers)
		try {
			console.log('📦 Backing up user answers...');
			const userAnswers: any[] = [];

			// Get all users
			const usersSnapshot = await db.collection('users').get();

			for (const userDoc of usersSnapshot.docs) {
				const userId = userDoc.id;
				const userAnswersDocs = await backupSubcollections(`users/${userId}`);
				userAnswers.push(...userAnswersDocs);
			}

			backupData.collections['userAnswers'] = userAnswers;
			backupData.metadata.totalDocuments += userAnswers.length;
			backupData.metadata.collections.push('userAnswers');

			console.log(`✅ Backed up ${userAnswers.length} user answer documents`);
		} catch (error) {
			console.warn('⚠️ Failed to backup user answers:', error);
			backupData.collections['userAnswers'] = [];
		}

		// Generate filename with timestamp
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `firestore-backup-${timestamp}.json`;
		const backupDir = 'backups';

		// Ensure backup directory exists
		if (!fs.existsSync(backupDir)) {
			fs.mkdirSync(backupDir, { recursive: true });
		}

		// Write backup file
		const filePath = path.join(backupDir, filename);
		fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

		console.log(`🎉 Backup completed successfully!`);
		console.log(`📁 File: ${filePath}`);
		console.log(`📊 Total documents: ${backupData.metadata.totalDocuments}`);
		console.log(`📚 Collections: ${backupData.metadata.collections.join(', ')}`);

		// Log file size
		const stats = fs.statSync(filePath);
		const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
		console.log(`💾 File size: ${fileSizeInMB} MB`);
	} catch (error) {
		console.error('❌ Backup failed:', error);
		process.exit(1);
	}
}

// Run backup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	performBackup()
		.then(() => {
			console.log('✅ Backup process completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('❌ Backup process failed:', error);
			process.exit(1);
		});
}

export { performBackup };
