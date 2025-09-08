<script lang="ts">
	import { onMount } from "svelte";
	import { createPoll, sendFeedback, getRandomStoryTemplate } from "$lib/smartEngine";
	import { getFirestore, doc, getDoc } from "firebase/firestore";
	import { auth } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';

	type State = "idle" | "greeting" | "suggest" | "action" | "close";

	let state: State = $state("idle");
	let nickname = $state("Friend");
	let suggestionMessage = $state("");
	let suggestions: { label: string; action: () => Promise<void> }[] = $state([]);
	let isLoading = $state(false);

	const db = getFirestore();

	// Get current user from auth using derived
	const currentUser = $derived(auth.currentUser);
	const uid = $derived(currentUser?.uid || "");

	async function loadNickname() {
		try {
			if (!currentUser?.email) return;
			
			// Use the same getDisplayName helper used throughout the app
			nickname = getDisplayName(currentUser.email);
		} catch (e) {
			console.error("Failed to load nickname:", e);
			nickname = "Friend";
		}
	}

	function startInteraction() {
		state = "greeting";
		suggestionMessage = `Hello ${nickname}! 👋 I can help you today.`;
		setTimeout(() => showSuggestions(), 1200);
	}

	function showSuggestions() {
		state = "suggest";
		suggestions = [
			{
				label: "🍝 Create a lunch poll",
				action: async () => {
					await createPoll({
						question: "What should we eat for lunch?",
						options: ["Pasta 🍝", "Pizza 🍕", "Rice 🍚"]
					});
					finish("I've created a lunch poll for the family!");
				}
			},
			{
				label: "📖 Tell me a story",
				action: async () => {
					const story = await getRandomStoryTemplate();
					finish(story);
				}
			}
		];
	}

	async function handleAction(fn: () => Promise<void>) {
		if (isLoading) return;
		
		state = "action";
		isLoading = true;
		
		try {
			await fn();
		} catch (error) {
			console.error("FamilyBot action failed:", error);
			finish("Sorry, something went wrong. Please try again! 😅");
		} finally {
			isLoading = false;
		}
	}

	function finish(message: string) {
		suggestionMessage = message;
		state = "close";
		setTimeout(() => (state = "idle"), 2500);
	}

	function closeBot() {
		state = "idle";
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			startInteraction();
		}
	}

	onMount(() => {
		if (currentUser) {
			loadNickname();
		}
	});

	// Update nickname when user changes
	$effect(() => {
		if (currentUser) {
			loadNickname();
		}
	});
</script>

<style>
	.bot-button {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: #4f46e5;
		border-radius: 50%;
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		animation: bounce 3s infinite;
		color: white;
		font-size: 2rem;
		box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		z-index: 1000;
		transition: transform 0.2s ease;
	}
	
	.bot-button:hover {
		transform: scale(1.05);
	}
	
	.panel {
		position: fixed;
		bottom: 5rem;
		right: 1rem;
		background: white;
		border-radius: 1rem;
		padding: 1rem;
		width: 260px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		z-index: 1000;
		border: 1px solid #e5e7eb;
	}
	
	.panel button {
		display: block;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.5rem;
		background: #f3f4f6;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
		text-align: left;
	}
	
	.panel button:hover {
		background: #e5e7eb;
	}
	
	.panel button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.close-button {
		background: #ef4444 !important;
		color: white;
		text-align: center !important;
		margin-top: 0.75rem;
	}
	
	.close-button:hover {
		background: #dc2626 !important;
	}
	
	.message {
		font-size: 0.9rem;
		line-height: 1.4;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		color: #6b7280;
	}
	
	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #4f46e5;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}
	
	@keyframes bounce {
		0%, 100% { 
			transform: translateY(0); 
		}
		50% { 
			transform: translateY(-5px); 
		}
	}
	
	@keyframes spin {
		0% { 
			transform: rotate(0deg); 
		}
		100% { 
			transform: rotate(360deg); 
		}
	}
</style>

<!-- Floating Bot Button -->
{#if state === "idle"}
	<div 
		class="bot-button" 
		onclick={startInteraction} 
		onkeydown={handleKeydown}
		role="button" 
		tabindex="0"
		aria-label="Open FamilyBot assistant"
	>
		🤖
	</div>
{/if}

<!-- Bot Panel -->
{#if state !== "idle"}
	<div class="panel">
		{#if state === "action" && isLoading}
			<div class="loading">
				<div class="loading-spinner"></div>
				<span>Working on it...</span>
			</div>
		{:else}
			<div class="message">{suggestionMessage}</div>
			
			{#if state === "suggest"}
				{#each suggestions as s}
					<button onclick={() => handleAction(s.action)} disabled={isLoading}>
						{s.label}
					</button>
				{/each}
			{/if}
			
			{#if state === "suggest" || state === "close"}
				<button class="close-button" onclick={closeBot}>
					{state === "close" ? "Thanks!" : "Close"}
				</button>
			{/if}
		{/if}
	</div>
{/if}