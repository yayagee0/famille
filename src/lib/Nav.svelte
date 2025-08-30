<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { Home, User, Rss, LogOut, Menu, X } from 'lucide-svelte';

	let { user } = $props<{ user: any }>();
	let mobileMenuOpen = $state(false);

	const navigation = [
		{ name: 'Dashboard', href: '/dashboard', icon: 'home' },
		{ name: 'Feed', href: '/feed', icon: 'rss' },
		{ name: 'Profile', href: '/profile', icon: 'user' }
	];

	async function handleSignOut() {
		try {
			await signOut(auth);
			await goto('/login');
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function getIcon(iconName: string) {
		switch (iconName) {
			case 'home':
				return Home;
			case 'rss':
				return Rss;
			case 'user':
				return User;
			default:
				return Home;
		}
	}
</script>

<!-- Desktop sidebar -->
<aside class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
	<div
		class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4"
	>
		<div class="flex h-16 shrink-0 items-center">
			<h1 class="text-xl font-bold text-gray-900">Family Hub</h1>
		</div>
		<nav class="flex flex-1 flex-col">
			<ul role="list" class="flex flex-1 flex-col gap-y-7">
				<li>
					<ul role="list" class="-mx-2 space-y-1">
						{#each navigation as item}
							<li>
								<a
									href={item.href}
									class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold {$page
										.url.pathname === item.href
										? 'bg-gray-50 text-indigo-600'
										: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}"
									onclick={closeMobileMenu}
								>
									{#if item.icon === 'home'}
										<Home class="h-6 w-6 shrink-0" />
									{:else if item.icon === 'rss'}
										<Rss class="h-6 w-6 shrink-0" />
									{:else if item.icon === 'user'}
										<User class="h-6 w-6 shrink-0" />
									{/if}
									{item.name}
								</a>
							</li>
						{/each}
					</ul>
				</li>
				<li class="mt-auto">
					{#if user}
						<div
							class="flex items-center gap-x-4 px-2 py-3 text-sm leading-6 font-semibold text-gray-900"
						>
							{#if user.photoURL}
								<img
									class="h-8 w-8 rounded-full bg-gray-50"
									src={user.photoURL}
									alt={user.displayName || 'User'}
								/>
							{:else}
								<div class="h-8 w-8 rounded-full bg-gray-300"></div>
							{/if}
							<span class="sr-only">Your profile</span>
							<span aria-hidden="true">{user.displayName || user.email}</span>
						</div>
						<button
							onclick={handleSignOut}
							class="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
						>
							<LogOut class="h-6 w-6 shrink-0" />
							Sign out
						</button>
					{/if}
				</li>
			</ul>
		</nav>
	</div>
</aside>

<!-- Mobile menu button -->
<div
	class="sticky top-0 z-40 flex items-center gap-x-4 border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden"
>
	<button
		type="button"
		class="-m-2.5 p-2.5 text-gray-700 lg:hidden"
		onclick={() => (mobileMenuOpen = true)}
	>
		<span class="sr-only">Open sidebar</span>
		<Menu class="h-6 w-6" />
	</button>
	<div class="flex-1 text-sm leading-6 font-semibold text-gray-900">Family Hub</div>
	{#if user && user.photoURL}
		<img
			class="h-8 w-8 rounded-full bg-gray-50"
			src={user.photoURL}
			alt={user.displayName || 'User'}
		/>
	{:else}
		<div class="h-8 w-8 rounded-full bg-gray-300"></div>
	{/if}
</div>

<!-- Mobile menu overlay -->
{#if mobileMenuOpen}
	<div class="relative z-50 lg:hidden">
		<div class="fixed inset-0 bg-gray-900/80"></div>
		<div class="fixed inset-0 flex">
			<div class="relative mr-16 flex w-full max-w-xs flex-1">
				<div class="absolute top-0 left-full flex w-16 justify-center pt-5">
					<button type="button" class="-m-2.5 p-2.5" onclick={() => (mobileMenuOpen = false)}>
						<span class="sr-only">Close sidebar</span>
						<X class="h-6 w-6 text-white" />
					</button>
				</div>
				<div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
					<div class="flex h-16 shrink-0 items-center">
						<h1 class="text-xl font-bold text-gray-900">Family Hub</h1>
					</div>
					<nav class="flex flex-1 flex-col">
						<ul role="list" class="flex flex-1 flex-col gap-y-7">
							<li>
								<ul role="list" class="-mx-2 space-y-1">
									{#each navigation as item}
										<li>
											<a
												href={item.href}
												class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold {$page
													.url.pathname === item.href
													? 'bg-gray-50 text-indigo-600'
													: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}"
												onclick={closeMobileMenu}
											>
												{#if item.icon === 'home'}
													<Home class="h-6 w-6 shrink-0" />
												{:else if item.icon === 'rss'}
													<Rss class="h-6 w-6 shrink-0" />
												{:else if item.icon === 'user'}
													<User class="h-6 w-6 shrink-0" />
												{/if}
												{item.name}
											</a>
										</li>
									{/each}
								</ul>
							</li>
							<li class="mt-auto">
								{#if user}
									<div
										class="flex items-center gap-x-4 px-2 py-3 text-sm leading-6 font-semibold text-gray-900"
									>
										{#if user.photoURL}
											<img
												class="h-8 w-8 rounded-full bg-gray-50"
												src={user.photoURL}
												alt={user.displayName || 'User'}
											/>
										{:else}
											<div class="h-8 w-8 rounded-full bg-gray-300"></div>
										{/if}
										<span class="sr-only">Your profile</span>
										<span aria-hidden="true">{user.displayName || user.email}</span>
									</div>
									<button
										onclick={handleSignOut}
										class="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
									>
										<LogOut class="h-6 w-6 shrink-0" />
										Sign out
									</button>
								{/if}
							</li>
						</ul>
					</nav>
				</div>
			</div>
		</div>
	</div>
{/if}
