import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Node.js compatible display name function (simplified version)
function getDisplayName(
	email: string | null | undefined,
	profile?: { nickname?: string }
): string {
	// Handle null/undefined email
	if (!email) {
		return 'Unknown';
	}

	// Priority 1: Profile nickname
	if (profile?.nickname?.trim()) {
		return profile.nickname.trim();
	}

	// Priority 2: Environment VITE_NICKNAMES fallback (Node.js version)
	try {
		const nicknamesEnv = process.env.VITE_NICKNAMES;
		if (nicknamesEnv) {
			const nicknames = JSON.parse(nicknamesEnv);
			const normalizedEmail = email.toLowerCase().trim();
			if (nicknames[normalizedEmail]?.trim()) {
				return nicknames[normalizedEmail].trim();
			}
		}
	} catch (error) {
		// Silently ignore in Node.js context
	}

	// Priority 3: Local part of email (before @)
	const localPart = email.split('@')[0];
	return localPart || email; // fallback to full email if no @ found
}

// Initialize Firebase Admin SDK
// Note: In production, use service account key or other secure authentication
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
	? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
	: null;

let db: admin.firestore.Firestore | null = null;

// Only try to initialize if we have credentials
if (serviceAccount) {
	try {
		if (!admin.apps.length) {
			admin.initializeApp({
				credential: admin.credential.cert(serviceAccount),
				projectId: process.env.VITE_FB_PROJECT_ID || 'familyg-719f2'
			});
		}
		db = admin.firestore();
	} catch (error) {
		console.warn('⚠️ Firebase Admin SDK initialization failed, will use mock data');
		db = null;
	}
} else {
	console.warn('⚠️ No Firebase service account key found, will use mock data');
}

interface IdentityTrait {
	text: string;
	category?: string;
}

interface UserData {
	uid: string;
	email?: string;
	displayName?: string;
	nickname?: string;
}

interface UserTraitsData {
	user: UserData;
	traits: IdentityTrait[];
}

/**
 * Mock data for testing when Firebase is not available
 */
function getMockUsersWithTraits(): UserTraitsData[] {
	const sampleTraits = [
		'I enjoy Sports the most.',
		"I'd like to learn Drawing.",
		'I lose track of time when I\'m Coding.',
		'I\'m more Shy.',
		'I prefer Quiet places.',
		'What makes me laugh most is Jokes.',
		'I feel proud when I help others.',
		'The value I care about most is Honesty.',
		'If I had a superpower, I\'d use it to Protect others.',
		'A good person is someone who is kind.',
		'I\'m more of a Morning person.',
		'On weekends, I enjoy Reading.',
		'My favorite school subject is Math.',
		'I enjoy Books the most.',
		'I prefer Indoor activities.',
		'First thing in the morning, I pray.',
		'The best part of family time is Games.',
		'I resemble my Mom.',
		'If I could travel anywhere, I\'d go to Japan.',
		'My dream job is Teacher.',
		'I want to be remembered for being helpful.',
		'My biggest fear is Heights.',
		'I\'m most creative when I\'m alone.',
		'My favorite season is Summer.',
		'I feel most comfortable at Home.',
		'My favorite food is Pizza.',
		'I prefer Sweet over salty.',
		'My ideal vacation is Beach.',
		'I handle stress by Listening to music.',
		'My biggest accomplishment is Learning to code.',
		'I\'m inspired by my Parents.',
		'My favorite time of day is Evening.',
		'I prefer Working alone.',
		'My favorite color is Blue.',
		'I collect Books.',
		'My favorite animal is Cat.',
		'I\'m good at Problem solving.',
		'My weakness is Procrastination.',
		'My goal this year is Learn Spanish.',
		'My favorite hobby is Sports.'
	];

	return [
		{
			user: {
				uid: 'user1',
				email: 'g@example.com',
				nickname: 'G'
			},
			traits: sampleTraits.map((text, i) => ({
				text,
				category: ['hobbies', 'personality', 'values', 'daily', 'fun'][i % 5]
			}))
		},
		{
			user: {
				uid: 'user2',
				email: 'yazid@example.com',
				displayName: 'Yazid'
			},
			traits: sampleTraits.map((text, i) => ({
				text: text.replace(/I/g, 'I').replace(/Sports/g, 'Music').replace(/Coding/g, 'Drawing').replace(/Books/g, 'Games'),
				category: ['hobbies', 'personality', 'values', 'daily', 'fun'][i % 5]
			}))
		}
	];
}

/**
 * Get all users with their identity traits
 */
async function getUsersWithIdentityTraits(): Promise<UserTraitsData[]> {
	console.log('📦 Fetching users and their identity traits...');

	// If no database connection, use mock data
	if (!db) {
		console.log('🔧 Using mock data (Firebase not available)');
		return getMockUsersWithTraits();
	}

	const usersSnapshot = await db.collection('users').get();
	const usersWithTraits: UserTraitsData[] = [];

	for (const userDoc of usersSnapshot.docs) {
		const userData = { uid: userDoc.id, ...userDoc.data() } as UserData;

		// Get identity_traits subcollection for this user
		const traitsSnapshot = await db
			.collection('users')
			.doc(userDoc.id)
			.collection('identity_traits')
			.get();

		const traits: IdentityTrait[] = [];
		traitsSnapshot.forEach((traitDoc) => {
			const traitData = traitDoc.data() as IdentityTrait;
			if (traitData.text) {
				traits.push(traitData);
			}
		});

		// Only include users with exactly 40 traits
		if (traits.length === 40) {
			usersWithTraits.push({
				user: userData,
				traits: traits
			});
			console.log(
				`✅ Found user ${getDisplayName(userData.email, { nickname: userData.nickname })} with ${traits.length} traits`
			);
		} else if (traits.length > 0) {
			console.log(
				`⚠️ Skipping user ${getDisplayName(userData.email, { nickname: userData.nickname })} - has ${traits.length} traits (need exactly 40)`
			);
		}
	}

	return usersWithTraits;
}

/**
 * Generate Markdown content from users' traits
 */
function generateMarkdown(usersData: UserTraitsData[]): string {
	let markdown = '# Family Hub – User Identity Traits\n\n';

	if (usersData.length === 0) {
		markdown += '*No users found with complete identity traits (40/40).*\n';
		return markdown;
	}

	for (const userData of usersData) {
		const displayName = getDisplayName(userData.user.email, {
			nickname: userData.user.nickname
		});

		markdown += `## User: ${displayName}\n`;

		// Sort traits to ensure consistent ordering (optional)
		const sortedTraits = userData.traits.sort((a, b) => {
			// First sort by category if available, then by text
			if (a.category && b.category && a.category !== b.category) {
				return a.category.localeCompare(b.category);
			}
			return a.text.localeCompare(b.text);
		});

		sortedTraits.forEach((trait, index) => {
			markdown += `${index + 1}. ${trait.text}\n`;
		});

		markdown += '\n';
	}

	return markdown;
}

/**
 * Export identity traits to Markdown file
 */
async function exportIdentityTraits(): Promise<void> {
	try {
		console.log('🚀 Starting Identity Traits export...');

		// Get users with complete identity traits
		const usersData = await getUsersWithIdentityTraits();

		if (usersData.length === 0) {
			console.log('⚠️ No users found with exactly 40 identity traits');
		} else {
			console.log(`📊 Found ${usersData.length} users with complete identity traits`);
		}

		// Generate Markdown content
		const markdownContent = generateMarkdown(usersData);

		// Write to identity-traits.md in project root
		const outputPath = path.join(process.cwd(), 'identity-traits.md');
		fs.writeFileSync(outputPath, markdownContent, 'utf-8');

		console.log(`✅ Identity traits exported successfully!`);
		console.log(`📁 File: ${outputPath}`);
		console.log(`👥 Users included: ${usersData.length}`);

		// Log file size
		const stats = fs.statSync(outputPath);
		const fileSizeInKB = (stats.size / 1024).toFixed(2);
		console.log(`💾 File size: ${fileSizeInKB} KB`);

		// Log a preview of the content
		const lines = markdownContent.split('\n');
		console.log(`📝 Preview (first 10 lines):`);
		lines.slice(0, 10).forEach((line, index) => {
			console.log(`   ${index + 1}: ${line}`);
		});
	} catch (error) {
		console.error('❌ Export failed:', error);
		process.exit(1);
	}
}

// Run export if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	exportIdentityTraits()
		.then(() => {
			console.log('✅ Export process completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('❌ Export process failed:', error);
			process.exit(1);
		});
}

export { exportIdentityTraits };