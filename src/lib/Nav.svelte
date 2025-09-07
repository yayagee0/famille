<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { Home, User, Rss, LogOut, Menu, X, Gamepad2, Moon, Settings } from 'lucide-svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NotificationBell from '$lib/NotificationBell.svelte';
	import GlassNav from '$lib/themes/neo/components/GlassNav.svelte';
	import { themeStore } from '$lib/themes/neo';

	let { user } = $props<{ user: any }>();
	let mobileMenuOpen = $state(false);
	let currentTheme = $state('default');

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	const navigation = [
		{ name: 'Dashboard', href: '/dashboard', icon: 'home' },
		{ name: 'Feed', href: '/feed', icon: 'rss' },
		{ name: 'Islam – Our Identity', href: '/playground/islamic', icon: 'moon' },
		{ name: 'Play Area', href: '/playground', icon: 'gamepad' },
		{ name: 'Settings', href: '/settings', icon: 'settings' },
		{ name: 'Profile', href: '/profile', icon: 'user' }
	];

	async function handleSignOut() {
		try {
			// Trigger haptic feedback for mobile
			if ('vibrate' in navigator) {
				navigator.vibrate(50);
			}
			await signOut(auth);
			await goto('/login');
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}

	function handleMobileMenuOpen() {
		// Trigger haptic feedback for mobile
		if ('vibrate' in navigator) {
			navigator.vibrate(25);
		}
		mobileMenuOpen = true;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<!-- Conditional Navigation: Neo vs Default -->
{#if currentTheme === 'neo'}
	<!-- Neo Glass Navigation -->
	<GlassNav {user} />
{:else}
	<!-- Default Desktop sidebar -->
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
							{#each navigation as item (item.href)}
								<li>
									<a
										href={item.href}
										class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 {$page
											.url.pathname === item.href
											? 'bg-gray-50 text-indigo-600'
											: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}"
										onclick={closeMobileMenu}
										aria-label={item.name}
									>
										{#if item.icon === 'home'}
											<Home
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{:else if item.icon === 'rss'}
											<Rss
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{:else if item.icon === 'moon'}
											<Moon
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{:else if item.icon === 'gamepad'}
											<Gamepad2
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{:else if item.icon === 'settings'}
											<Settings
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{:else if item.icon === 'user'}
											<User
												class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
											/>
										{/if}
										{item.name}
									</a>
								</li>
							{/each}
						</ul>
					</li>
					<li class="mt-auto space-y-4">
						<!-- Theme Toggle -->
						<div class="px-2">
							<ThemeToggle variant="minimal" />
						</div>

						<!-- Notification Bell -->
						<div class="px-2">
							<NotificationBell {user} />
						</div>

						{#if user}
							<div
								class="flex items-center gap-x-4 px-2 py-3 text-sm leading-6 font-semibold text-gray-900"
							>
								{#if user.photoURL}
									<img
										class="h-8 w-8 rounded-full bg-gray-50"
										src={user.photoURL}
										alt={getDisplayName(user?.email, { nickname: user?.nickname })}
									/>
								{:else}
									<div class="h-8 w-8 rounded-full bg-gray-300"></div>
								{/if}
								<span class="sr-only">Your profile</span>
								<span aria-hidden="true"
									>{getDisplayName(user?.email, { nickname: user?.nickname })}</span
								>
							</div>
							<button
								onclick={handleSignOut}
								class="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 hover:bg-gray-50 hover:text-indigo-600 active:scale-95"
							>
								<LogOut
									class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
								/>
								Sign out
							</button>
						{/if}
					</li>
				</ul>
			</nav>
		</div>
	</aside>
{/if}

<!-- Mobile menu button -->
<div
	class="sticky top-0 z-40 flex items-center gap-x-4 border-b px-4 py-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden {currentTheme ===
	'neo'
		? 'border-white/20 bg-slate-900/95 backdrop-blur-md'
		: 'border-gray-200 bg-white'}"
>
	<button
		type="button"
		class="-m-2.5 p-2.5 transition-all duration-200 ease-in-out hover:scale-110 active:scale-95 lg:hidden {currentTheme ===
		'neo'
			? 'text-slate-300 hover:text-cyan-400'
			: 'text-gray-700 hover:text-indigo-600'}"
		onclick={handleMobileMenuOpen}
	>
		<span class="sr-only">Open sidebar</span>
		<Menu class="h-6 w-6 transition-transform duration-200 hover:rotate-90" />
	</button>
	<div
		class="flex-1 text-sm leading-6 font-semibold {currentTheme === 'neo'
			? 'neo-gradient-text'
			: 'text-gray-900'}"
	>
		Family Hub
	</div>

	<!-- Theme toggle in mobile header -->
	<ThemeToggle variant="minimal" />

	<!-- Notification Bell in mobile header -->
	<NotificationBell {user} />

	{#if user && user.photoURL}
		<img
			class="h-8 w-8 rounded-full {currentTheme === 'neo'
				? 'border border-white/30'
				: 'bg-gray-50'}"
			src={user.photoURL}
			alt={getDisplayName(user?.email, { nickname: user?.nickname })}
		/>
	{:else}
		<div
			class="h-8 w-8 rounded-full {currentTheme === 'neo'
				? 'neo-glass border border-white/30'
				: 'bg-gray-300'}"
		></div>
	{/if}
</div>

<!-- Mobile menu overlay -->
{#if mobileMenuOpen}
	<div class="relative z-50 lg:hidden">
		<div class="fixed inset-0 {currentTheme === 'neo' ? 'bg-black/80' : 'bg-gray-900/80'}"></div>
		<div class="fixed inset-0 flex">
			<div class="relative mr-16 flex w-full max-w-xs flex-1">
				<div class="absolute top-0 left-full flex w-16 justify-center pt-5">
					<button type="button" class="-m-2.5 p-2.5" onclick={() => (mobileMenuOpen = false)}>
						<span class="sr-only">Close sidebar</span>
						<X class="h-6 w-6 text-white" />
					</button>
				</div>
				<div
					class="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 {currentTheme === 'neo'
						? 'neo-glass-nav backdrop-blur-md'
						: 'bg-white'}"
				>
					<div class="flex h-16 shrink-0 items-center">
						<h1
							class="text-xl font-bold {currentTheme === 'neo'
								? 'neo-gradient-text'
								: 'text-gray-900'}"
						>
							Family Hub
						</h1>
					</div>
					<nav class="flex flex-1 flex-col">
						<ul role="list" class="flex flex-1 flex-col gap-y-7">
							<li>
								<ul role="list" class="-mx-2 space-y-1">
									{#each navigation as item (item.href)}
										<li>
											<a
												href={item.href}
												class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 {currentTheme ===
												'neo'
													? $page.url.pathname === item.href
														? 'neo-nav-active text-white'
														: 'neo-glass text-slate-300 hover:bg-white/10 hover:text-white'
													: $page.url.pathname === item.href
														? 'bg-gray-50 text-indigo-600'
														: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}"
												onclick={closeMobileMenu}
												aria-label={item.name}
											>
												{#if item.icon === 'home'}
													<Home
														class="h-6 w-6 shrink-0 transition-colors duration-200 {currentTheme ===
															'neo' && $page.url.pathname === item.href
															? 'text-cyan-400'
															: ''}"
													/>
												{:else if item.icon === 'rss'}
													<Rss
														class="h-6 w-6 shrink-0 transition-colors duration-200 {currentTheme ===
															'neo' && $page.url.pathname === item.href
															? 'text-cyan-400'
															: ''}"
													/>
												{:else if item.icon === 'moon'}
													<Moon
														class="h-6 w-6 shrink-0 transition-colors duration-200 {currentTheme ===
															'neo' && $page.url.pathname === item.href
															? 'text-cyan-400'
															: ''}"
													/>
												{:else if item.icon === 'gamepad'}
													<Gamepad2
														class="h-6 w-6 shrink-0 transition-colors duration-200 {currentTheme ===
															'neo' && $page.url.pathname === item.href
															? 'text-cyan-400'
															: ''}"
													/>
												{:else if item.icon === 'user'}
													<User
														class="h-6 w-6 shrink-0 transition-colors duration-200 {currentTheme ===
															'neo' && $page.url.pathname === item.href
															? 'text-cyan-400'
															: ''}"
													/>
												{/if}
												{item.name}
											</a>
										</li>
									{/each}
								</ul>
							</li>
							<li class="mt-auto space-y-4">
								<!-- Theme Toggle -->
								<div class="px-2">
									<ThemeToggle variant="minimal" />
								</div>

								{#if user}
									<div
										class="flex items-center gap-x-4 px-2 py-3 text-sm leading-6 font-semibold {currentTheme ===
										'neo'
											? 'text-slate-200'
											: 'text-gray-900'}"
									>
										{#if user.photoURL}
											<img
												class="h-8 w-8 rounded-full {currentTheme === 'neo'
													? 'border border-white/30'
													: 'bg-gray-50'}"
												src={user.photoURL}
												alt={getDisplayName(user?.email, { nickname: user?.nickname })}
											/>
										{:else}
											<div
												class="h-8 w-8 rounded-full {currentTheme === 'neo'
													? 'neo-glass border border-white/30'
													: 'bg-gray-300'}"
											></div>
										{/if}
										<span class="sr-only">Your profile</span>
										<span aria-hidden="true"
											>{getDisplayName(user?.email, { nickname: user?.nickname })}</span
										>
									</div>
									<button
										onclick={handleSignOut}
										class="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 {currentTheme ===
										'neo'
											? 'neo-glass text-slate-300 hover:bg-white/10 hover:text-white'
											: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}"
									>
										<LogOut
											class="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
										/>
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
