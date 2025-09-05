<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase';
	import { signOut } from 'firebase/auth';
	import { Home, User, Rss, LogOut, Gamepad2, Moon } from 'lucide-svelte';
	import { getDisplayName } from '$lib/getDisplayName';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import GlassChip from './GlassChip.svelte';

	let { user } = $props<{ user: any }>();

	const navigation = [
		{ name: 'Dashboard', href: '/dashboard', icon: Home },
		{ name: 'Feed', href: '/feed', icon: Rss },
		{ name: 'Islam – Our Identity', href: '/playground/islamic', icon: Moon },
		{ name: 'Play Area', href: '/playground', icon: Gamepad2 },
		{ name: 'Profile', href: '/profile', icon: User }
	];

	async function handleSignOut() {
		try {
			if ('vibrate' in navigator) {
				navigator.vibrate(50);
			}
			await signOut(auth);
			await goto('/login');
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}
</script>

<!-- Neo Glass Navigation Sidebar -->
<aside class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
	<!-- Glass sidebar with animated gradient background -->
	<div class="neo-glass-nav relative flex grow flex-col overflow-y-auto border-r border-white/10 backdrop-blur-md">
		<!-- Animated gradient background layer -->
		<div class="neo-nav-gradient absolute inset-0 opacity-5"></div>
		
		<!-- Content over the gradient -->
		<div class="relative z-10 flex grow flex-col">
			<!-- Logo/Header -->
			<div class="flex h-16 shrink-0 items-center px-6">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg neo-glass">
						<span class="text-xl">👨‍👩‍👧</span>
					</div>
					<span class="neo-gradient-text text-xl font-bold">Family Hub</span>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex flex-1 flex-col px-6 pb-4">
				<ul role="list" class="flex flex-1 flex-col gap-y-2">
					{#each navigation as item}
						{@const isActive = $page.url.pathname === item.href}
						{@const IconComponent = item.icon}
						<li>
							<a
								href={item.href}
								class="group flex gap-x-3 rounded-xl p-3 text-sm font-semibold leading-6 transition-all duration-300 hover:scale-105 {isActive
									? 'neo-nav-active text-white'
									: 'text-slate-300 hover:text-white neo-glass hover:bg-white/10'}"
							>
								<IconComponent
									class="h-5 w-5 shrink-0 transition-colors duration-300 {isActive
										? 'text-cyan-400'
										: 'text-slate-400 group-hover:text-cyan-400'}"
								/>
								{item.name}
							</a>
						</li>
					{/each}
				</ul>

				<!-- Theme Toggle -->
				<div class="mt-4 px-3">
					<ThemeToggle />
				</div>

				<!-- Footer with user info -->
				<div class="mt-6 pt-6 border-t border-white/10">
					<div class="flex items-center gap-3 px-3 py-2">
						<!-- User Avatar -->
						<div class="flex-shrink-0">
							{#if user?.photoURL}
								<img
									src={user.photoURL}
									alt={getDisplayName(user?.email, { nickname: user?.nickname })}
									class="h-8 w-8 rounded-full border border-white/20"
								/>
							{:else}
								<div class="flex h-8 w-8 items-center justify-center rounded-full neo-glass border border-white/20 text-sm font-medium text-cyan-400">
									{getDisplayName(user?.email, { nickname: user?.nickname }).charAt(0).toUpperCase()}
								</div>
							{/if}
						</div>

						<!-- User Name -->
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-slate-200 truncate">
								{getDisplayName(user?.email, { nickname: user?.nickname })}
							</p>
						</div>

						<!-- Sign Out -->
						<GlassChip size="small" onclick={handleSignOut} variant="accent">
							<LogOut class="h-4 w-4" />
						</GlassChip>
					</div>
				</div>
			</nav>
		</div>
	</div>
</aside>