<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Sparkles, Monitor } from 'lucide-svelte';
	import { themeStore, type Theme } from '$lib/themes/neo';

	let {
		variant = 'minimal',
		showLabel = false
	}: {
		variant?: 'minimal' | 'full';
		showLabel?: boolean;
	} = $props();

	let currentTheme = $state<Theme>('default');
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});

		return () => {
			unsubscribe?.();
		};
	});

	function handleThemeChange(theme: Theme) {
		themeStore.theme = theme;
	}

	function toggleTheme() {
		themeStore.toggleTheme();
	}

	const themes = [
		{ value: 'default', label: 'Default', icon: Sun },
		{ value: 'neo', label: 'Neo', icon: Sparkles },
		{ value: 'system', label: 'System', icon: Monitor }
	] as const;
</script>

{#if variant === 'minimal'}
	<!-- Minimal toggle button -->
	<button
		onclick={toggleTheme}
		class="rounded-lg p-2 transition-all duration-200 {currentTheme === 'neo'
			? 'neo-button border border-cyan-400/50 bg-cyan-500/10 text-cyan-400'
			: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
		aria-label="Toggle theme"
		title="Switch between Default and Neo themes"
	>
		{#if currentTheme === 'neo'}
			<Sparkles class="h-4 w-4" />
		{:else}
			<Sun class="h-4 w-4" />
		{/if}
	</button>
{:else}
	<!-- Full theme selector -->
	<div class="space-y-2">
		{#if showLabel}
			<div
				class="text-sm font-medium {currentTheme === 'neo' ? 'text-slate-200' : 'text-gray-700'}"
			>
				Theme
			</div>
		{/if}

		<div class="flex space-x-2">
			{#each themes as theme}
				{@const isActive = currentTheme === theme.value}
				<button
					onclick={() => handleThemeChange(theme.value)}
					class="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 {isActive
						? currentTheme === 'neo'
							? 'neo-button border border-cyan-400/50 bg-cyan-500/20 text-cyan-400'
							: 'bg-indigo-100 text-indigo-700'
						: currentTheme === 'neo'
							? 'neo-glass text-slate-300 hover:bg-white/10'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					aria-label="Set {theme.label} theme"
				>
					{#if theme.value === 'default'}
						<Sun class="h-4 w-4" />
					{:else if theme.value === 'neo'}
						<Sparkles class="h-4 w-4" />
					{:else}
						<Monitor class="h-4 w-4" />
					{/if}
					<span>{theme.label}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
