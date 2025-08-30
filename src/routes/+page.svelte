<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase';

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				goto('/dashboard');
			} else {
				goto('/login');
			}
		});

		return unsubscribe;
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
</div>
