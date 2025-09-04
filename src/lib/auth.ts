import { db } from '$lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getDisplayName } from '$lib/getDisplayName';

export async function ensureUserProfile(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }) {
	if (!user) return;

	const userRef = doc(db, 'users', user.uid);
	const snapshot = await getDoc(userRef);

	const profileData = {
		email: user.email || '',
		displayName: getDisplayName(user.email, { nickname: undefined }),
		avatarUrl: user.photoURL || ''
	};

	if (!snapshot.exists()) {
		// create new profile
		await setDoc(userRef, profileData);
	} else {
		// update fields if changed
		await setDoc(userRef, profileData, { merge: true });
	}
}
