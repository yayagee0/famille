<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth, getAllUserProfiles } from '$lib/firebase';
	import { onAuthStateChanged, type User } from 'firebase/auth';
	import { validateFamilyMember } from '$lib/allowlist';
	import { getAllowedEmails } from '$lib/users';
	import { initializeWidgetContext, clearWidgetContext } from '$lib/widget-context';
	import Nav from '$lib/Nav.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import { registerServiceWorker } from '$lib/offline';
	// isOnline removed - unused import

	let { children } = $props();
	let user: User | null = $state(null);
	let authLoading = $state(true);
	let authError = $state<string | null>(null);

	onMount(() => {
		if (!browser) return;

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			authLoading = false;

			if (firebaseUser) {
				// Check if user is in allowlist
				if (validateFamilyMember(firebaseUser.email)) {
					user = firebaseUser;

					// Initialize widget context for authenticated user
					try {
						const allowedEmails = getAllowedEmails();

						// OnAuthStateChanged → await getAllUserProfiles() BEFORE initializeWidgetContext()
						const profiles = await getAllUserProfiles(allowedEmails);

						initializeWidgetContext({
							authUser: { email: firebaseUser.email! },
							profiles,
							allowedEmails
						});
					} catch (error) {
						console.error('Failed to initialize widget context:', error);
					}

					// Redirect to dashboard if on login page
					if ($page.url.pathname === '/login' || $page.url.pathname === '/') {
						goto('/dashboard');
					}
				} else {
					// User not in allowlist
					authError = 'Access denied. You are not authorized to access this family hub.';
					user = null;
					clearWidgetContext();
					goto('/login');
				}
			} else {
				user = null;
				authError = null;
				// Clear widget context on logout
				clearWidgetContext();
				// Redirect to login if not on login page
				if ($page.url.pathname !== '/login') {
					goto('/login');
				}
			}
		});

		// Register service worker for offline support
		registerServiceWorker();

		return unsubscribe;
	});

	// Check if current route requires authentication
	const isPublicRoute = $derived($page.url.pathname === '/login');
	const shouldShowNav = $derived(user && !isPublicRoute);
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<link rel="manifest" href="/site.webmanifest" />
	<link rel="apple-touch-icon" sizes="192x192" href="/android-chrome-192x192.png" />
	<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
	<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
	<title>Family Hub</title>
	<meta
		name="description"
		content="A private family hub for sharing moments and staying connected"
	/>
</svelte:head>

{#if authLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if authError}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
				<svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</div>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
			<p class="mt-1 text-sm text-gray-500">{authError}</p>
			<div class="mt-6">
				<button
					onclick={() => goto('/login')}
					class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
				>
					Back to Login
				</button>
			</div>
		</div>
	</div>
{:else}
	<ErrorBoundary>
		<div class="min-h-full">
			{#if shouldShowNav}
				<Nav {user} />
				<div class="lg:pl-72">
					<main class="py-10">
						<div class="px-4 sm:px-6 lg:px-8">
							{@render children?.()}
						</div>
					</main>
				</div>
			{:else}
				<main>
					{@render children?.()}
				</main>
			{/if}
		</div>
	</ErrorBoundary>
{/if}
