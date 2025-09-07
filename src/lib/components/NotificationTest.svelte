<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import {
		createNotification,
		notifyFamilyOfNewPost,
		createBirthdayNotification
	} from '$lib/firebase';
	import { onAuthStateChanged, type User } from 'firebase/auth';
	import { getDisplayName } from '$lib/getDisplayName';

	let user: User | null = $state(null);
	let testStatus = $state('');

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			user = firebaseUser;
		});

		return unsubscribe;
	});

	async function testPersonalNotification() {
		if (!user) {
			testStatus = 'Please log in first';
			return;
		}

		try {
			testStatus = 'Creating personal notification...';
			await createNotification(user.uid, {
				type: 'system',
				title: 'Test Notification',
				body: 'This is a test notification from the Family Hub',
				link: '/dashboard'
			});
			testStatus = '✅ Personal notification created successfully!';
		} catch (error) {
			testStatus = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	async function testPostNotification() {
		if (!user) {
			testStatus = 'Please log in first';
			return;
		}

		try {
			testStatus = 'Creating post notification...';
			await notifyFamilyOfNewPost(
				user.uid,
				getDisplayName(user.email, { nickname: user.displayName }),
				'test post',
				'test-post-id'
			);
			testStatus = '✅ Post notification sent to family!';
		} catch (error) {
			testStatus = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	async function testBirthdayNotification() {
		try {
			testStatus = 'Creating birthday notification...';
			await createBirthdayNotification('Test Person', 25);
			testStatus = '✅ Birthday notification sent to family!';
		} catch (error) {
			testStatus = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
	<h2 class="mb-6 text-2xl font-bold text-gray-900">Notification Test</h2>

	{#if user}
		<p class="mb-4 text-sm text-gray-600">
			Logged in as: {getDisplayName(user.email, { nickname: user.displayName })}
		</p>

		<div class="space-y-4">
			<button
				onclick={testPersonalNotification}
				class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				Test Personal Notification
			</button>

			<button
				onclick={testPostNotification}
				class="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
			>
				Test Post Notification (to Family)
			</button>

			<button
				onclick={testBirthdayNotification}
				class="w-full rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
			>
				Test Birthday Notification (to Family)
			</button>
		</div>

		{#if testStatus}
			<div
				class="mt-4 rounded-lg p-3 {testStatus.includes('✅')
					? 'bg-green-100 text-green-800'
					: testStatus.includes('❌')
						? 'bg-red-100 text-red-800'
						: 'bg-blue-100 text-blue-800'}"
			>
				{testStatus}
			</div>
		{/if}
	{:else}
		<p class="text-gray-600">Please log in to test notifications</p>
	{/if}
</div>
