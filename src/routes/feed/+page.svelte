<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		query,
		where,
		orderBy,
		addDoc,
		getDoc,
		doc,
		updateDoc,
		arrayUnion,
		arrayRemove,
		onSnapshot
	} from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
	import { auth, db, storage, getFamilyId } from '$lib/firebase';
	import FeedUpload from '$lib/FeedUpload.svelte';
	import { Heart, MessageCircle, Share2 } from 'lucide-svelte';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	let user = $state(auth.currentUser);
	let posts = $state<any[]>([]);
	let loading = $state(true);
	let unsubscribePosts: (() => void) | null = null;

	onMount(() => {
		const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
			user = firebaseUser;
			if (firebaseUser) {
				subscribeToPosts();
			} else {
				if (unsubscribePosts) unsubscribePosts();
				posts = [];
			}
		});
		return () => {
			unsubscribeAuth();
			if (unsubscribePosts) unsubscribePosts();
		};
	});

	// 🔄 Real-time posts subscription
	function subscribeToPosts() {
		const familyId = getFamilyId();
		const postsQuery = query(
			collection(db, 'posts'),
			where('familyId', '==', familyId),
			orderBy('createdAt', 'desc')
		);

		loading = true;
		unsubscribePosts = onSnapshot(
			postsQuery,
			async (snapshot) => {
				const rawPosts = snapshot.docs.map((docSnap) => ({
					id: docSnap.id,
					...docSnap.data()
				}));

				// Enrich with author info
				const enrichedPosts = await Promise.all(
					rawPosts.map(async (post) => {
						if (post.authorUid) {
							const userDoc = await getDoc(doc(db, 'users', post.authorUid));
							if (userDoc.exists()) {
								const userData = userDoc.data();
								return {
									...post,
									author: {
										displayName: userData.displayName || 'Unknown User',
										avatarUrl: userData.avatarUrl || null
									}
								};
							}
						}
						return {
							...post,
							author: { displayName: 'Unknown User', avatarUrl: null }
						};
					})
				);

				posts = enrichedPosts;
				loading = false;
			},
			(error) => {
				console.error('Error listening to posts:', error);
				loading = false;
			}
		);
	}

	// ➕ Create post
	async function handlePostCreated(event: CustomEvent) {
		const postData = event.detail;
		const familyId = getFamilyId();

		try {
			const { files: _, youtubeUrl, ...rest } = postData;

			let imagePath: string | undefined;
			let videoPath: string | undefined;

			if (postData.type === 'photo' && postData.files?.[0]) {
				const file = postData.files[0];
				const fileRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
				const snapshot = await uploadBytes(fileRef, file);
				imagePath = await getDownloadURL(snapshot.ref);
			}
			if (postData.type === 'video' && postData.files?.[0]) {
				const file = postData.files[0];
				const fileRef = ref(storage, `posts/${user?.uid}/${Date.now()}-${file.name}`);
				const snapshot = await uploadBytes(fileRef, file);
				videoPath = await getDownloadURL(snapshot.ref);
			}

			const youtubeId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;

			const postDoc = {
				...rest,
				familyId,
				authorUid: user?.uid,
				createdAt: new Date(),
				kind: postData.type,
				text: postData.text || '',
				youtubeId,
				imagePath,
				videoPath,
				likes: [],
				comments: []
			};

			await addDoc(collection(db, 'posts'), postDoc);
			// no need to reload → onSnapshot will update automatically
		} catch (error) {
			console.error('Error creating post:', error);
		}
	}

	// ❤️ Toggle like
	async function toggleLike(postId: string, isLiked: boolean) {
		if (!user) return;
		try {
			const postRef = doc(db, 'posts', postId);
			if (isLiked) {
				await updateDoc(postRef, { likes: arrayRemove(user.uid) });
			} else {
				await updateDoc(postRef, { likes: arrayUnion(user.uid) });
			}
		} catch (error) {
			console.error('Error toggling like:', error);
		}
	}

	function getYouTubeVideoId(url: string): string | null {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}

	function isUserLiked(post: any): boolean {
		return post.likes?.includes(user?.uid) || false;
	}
</script>

<!-- UI remains same as previous version -->
