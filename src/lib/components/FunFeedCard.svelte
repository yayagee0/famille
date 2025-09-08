<script lang="ts">
	import { createPollFromSuggestion } from '$lib/smartEngine';
	import { auth } from '$lib/firebase';
	import type { FunFeedEntry } from '$lib/schema';
	
	let { entry } = $props<{ entry: FunFeedEntry }>();
	
	const currentUser = $derived(auth.currentUser);
	let isCreatingPoll = $state(false);
	
	// Format timestamp for display
	function formatTimestamp(timestamp: any): string {
		try {
			if (timestamp?.toDate) {
				return timestamp.toDate().toLocaleString();
			} else if (timestamp instanceof Date) {
				return timestamp.toLocaleString();
			} else {
				return new Date().toLocaleString();
			}
		} catch {
			return new Date().toLocaleString();
		}
	}
	
	// Handle creating a poll from suggestion
	async function handleCreatePoll() {
		if (!currentUser?.uid || !entry.metadata?.pollQuestion) return;
		
		try {
			isCreatingPoll = true;
			await createPollFromSuggestion(entry.metadata.pollQuestion, currentUser.uid);
			// TODO: Could show a success message or refresh the feed
		} catch (error) {
			console.error('Failed to create poll from suggestion:', error);
		} finally {
			isCreatingPoll = false;
		}
	}
	
	// Get card styling based on entry type
	function getCardStyling(type: string): string {
		switch (type) {
			case 'pollSuggestion':
				return 'border-blue-200 bg-blue-50';
			case 'feedbackSuggestion':
				return 'border-green-200 bg-green-50';
			case 'badge':
				if (entry.rarity === 'legendary') {
					return 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg';
				}
				return 'border-purple-200 bg-purple-50';
			case 'poll':
				return 'border-indigo-200 bg-indigo-50';
			case 'story':
				return 'border-emerald-200 bg-emerald-50';
			case 'feedback':
				return 'border-amber-200 bg-amber-50';
			default:
				return 'border-gray-200 bg-gray-50';
		}
	}
	
	// Get icon for entry type
	function getTypeIcon(type: string): string {
		switch (type) {
			case 'poll':
			case 'pollSuggestion':
				return '📊';
			case 'story':
				return '📖';
			case 'feedback':
			case 'feedbackSuggestion':
				return '💡';
			case 'badge':
				return entry.metadata?.badgeIcon || '🏆';
			default:
				return '✨';
		}
	}
</script>

<div class="rounded-2xl border-2 p-4 {getCardStyling(entry.type)} shadow-sm">
	<!-- Entry Header -->
	<div class="flex items-start justify-between mb-2">
		<div class="flex items-center gap-2">
			<span class="text-lg">{getTypeIcon(entry.type)}</span>
			<div>
				<p class="text-sm font-medium text-gray-900">
					{entry.text}
				</p>
				
				<!-- Suggestion Attribution -->
				{#if entry.type.endsWith('Suggestion')}
					<p class="text-xs text-gray-500 mt-1">
						Suggested by FamilyBot
					</p>
				{/if}
			</div>
		</div>
		
		<!-- Rarity indicator for legendary badges -->
		{#if entry.rarity === 'legendary'}
			<span class="text-xs px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full font-medium shadow-sm">
				✨ Legendary
			</span>
		{/if}
	</div>
	
	<!-- Entry Content Based on Type -->
	{#if entry.type === 'pollSuggestion' && entry.metadata?.pollQuestion}
		<div class="mt-3 p-3 bg-white rounded-lg border border-blue-200">
			<p class="text-sm text-gray-700 mb-3">
				<strong>Poll Question:</strong> {entry.metadata.pollQuestion}
			</p>
			<button
				class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={handleCreatePoll}
				disabled={isCreatingPoll || !currentUser}
			>
				{isCreatingPoll ? 'Creating...' : '➕ Create Poll'}
			</button>
		</div>
	{:else if entry.type === 'feedbackSuggestion' && entry.metadata?.feedbackTopic}
		<div class="mt-3 p-3 bg-white rounded-lg border border-green-200">
			<p class="text-sm text-gray-700">
				<strong>Feedback Topic:</strong> {entry.metadata.feedbackTopic}
			</p>
			<p class="text-xs text-gray-500 mt-1">
				Share your thoughts with the family about this topic!
			</p>
		</div>
	{:else if entry.type === 'story' && entry.metadata?.storyPreview}
		<div class="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
			<p class="text-sm text-gray-700 italic">
				"{entry.metadata.storyPreview}"
			</p>
		</div>
	{:else if entry.type === 'poll' && entry.metadata?.pollQuestion}
		<div class="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
			<p class="text-sm text-gray-700">
				<strong>Question:</strong> {entry.metadata.pollQuestion}
			</p>
		</div>
	{:else if entry.type === 'feedback' && entry.metadata?.feedbackTopic}
		<div class="mt-3 p-3 bg-white rounded-lg border border-amber-200">
			<p class="text-sm text-gray-700">
				<strong>Topic:</strong> {entry.metadata.feedbackTopic}
			</p>
		</div>
	{:else if entry.type === 'badge' && entry.rarity === 'legendary'}
		<div class="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-300">
			<p class="text-sm text-gray-800 font-medium">
				🌟 A legendary achievement unlocked! This is a special milestone worth celebrating.
			</p>
		</div>
	{/if}
	
	<!-- Timestamp -->
	<div class="mt-3 pt-2 border-t border-gray-200">
		<p class="text-xs text-gray-500">
			{formatTimestamp(entry.createdAt)}
		</p>
	</div>
</div>