import { auth, db } from '$lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function ensureUserProfile(user: any) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  const profileData = {
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Unknown',
    avatarUrl: user.photoURL || '',
  };

  if (!snapshot.exists()) {
    // create new profile
    await setDoc(userRef, profileData);
  } else {
    // update fields if changed
    await setDoc(userRef, profileData, { merge: true });
  }
}
