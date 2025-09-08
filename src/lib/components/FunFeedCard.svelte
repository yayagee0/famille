<script lang="ts">
	import { createPollFromSuggestion, createStoryFromSuggestion, addFunFeedReaction, addFunFeedComment } from '$lib/smartEngine';
	import { auth } from '$lib/firebase';
	import { getDisplayName } from '$lib/getDisplayName';
	import type { FunFeedEntry } from '$lib/schema';
	
	let { entry } = $props<{ entry: FunFeedEntry }>();
	
	const currentUser = $derived(auth.currentUser);
	let isCreatingPoll = $state(false);
	let isReadingStory = $state(false);
	let currentStory = $state('');
	let showReactions = $state(false);
	let showComments = $state(false);
	let newComment = $state('');
	let isAddingComment = $state(false);
	
	// Common emoji reactions
	const reactionEmojis = ['❤️', '😄', '👍', '🎉', '😮', '👏'];
	
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
	
	// Handle reading a story from suggestion
	async function handleReadStory() {
		if (!currentUser?.uid || !entry.metadata?.storyTheme || !entry.metadata?.targetNickname) return;
		
		try {
			isReadingStory = true;
			const story = await createStoryFromSuggestion(
				entry.metadata.storyTheme, 
				entry.metadata.targetNickname, 
				currentUser.uid
			);
			currentStory = story;
		} catch (error) {
			console.error('Failed to read story from suggestion:', error);
		} finally {
			isReadingStory = false;
		}
	}
	
	// Handle reaction toggle
	async function handleReaction(emoji: string) {
		if (!currentUser?.uid || !entry.id) return;
		
		try {
			await addFunFeedReaction(entry.id, emoji, currentUser.uid);
			// Note: In a real app, we'd want to refetch the entry or use reactive updates
		} catch (error) {
			console.error('Failed to add reaction:', error);
		}
	}
	
	// Get reaction count for an emoji
	function getReactionCount(emoji: string): number {
		return entry.reactions?.[emoji]?.length || 0;
	}
	
	// Check if current user has reacted with this emoji
	function hasUserReacted(emoji: string): boolean {
		return entry.reactions?.[emoji]?.includes(currentUser?.uid || '') || false;
	}
	
	// Handle adding a comment
	async function handleAddComment() {
		if (!currentUser?.uid || !newComment.trim() || isAddingComment) return;
		
		try {
			isAddingComment = true;
			await addFunFeedComment(entry.id!, newComment.trim(), currentUser.uid);
			
			// Add the comment locally for immediate feedback
			if (!entry.comments) entry.comments = [];
			entry.comments.push({
				id: Date.now().toString(),
				text: newComment.trim(),
				createdBy: currentUser.uid,
				createdAt: new Date() as any
			});
			
			newComment = '';
		} catch (error) {
			console.error('Failed to add comment:', error);
		} finally {
			isAddingComment = false;
		}
	}
	
	// Get card styling based on entry type
	function getCardStyling(type: string): string {
		switch (type) {
			case 'pollSuggestion':
				return 'border-blue-200 bg-blue-50';
			case 'feedbackSuggestion':
				return 'border-green-200 bg-green-50';
			case 'storySuggestion':
				return 'border-purple-200 bg-purple-50';
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
			case 'storySuggestion':
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
	{:else if entry.type === 'storySuggestion' && entry.metadata?.storyTheme && entry.metadata?.targetNickname}
		<div class="mt-3 p-3 bg-white rounded-lg border border-purple-200">
			<p class="text-sm text-gray-700 mb-3">
				<strong>Story Theme:</strong> {entry.metadata.storyTheme} for {entry.metadata.targetNickname}
			</p>
			<button
				class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={handleReadStory}
				disabled={isReadingStory || !currentUser}
			>
				{isReadingStory ? 'Loading...' : '📖 Read Story'}
			</button>
			
			<!-- Show story content if loaded -->
			{#if currentStory}
				<div class="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-300">
					<p class="text-sm text-gray-800 italic leading-relaxed">
						{currentStory}
					</p>
				</div>
			{/if}
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
	
	<!-- Reactions System -->
	<div class="mt-3 flex items-center justify-between">
		<!-- Reaction Emojis -->
		<div class="flex items-center gap-1">
			<button
				class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
				onclick={() => showReactions = !showReactions}
			>
				😊 React
			</button>
			
			<!-- Show existing reactions -->
			{#if entry.reactions}
				{#each Object.entries(entry.reactions) as [emoji, users]}
					{#if users.length > 0}
						<button
							class="text-xs px-2 py-1 rounded-full transition-colors {hasUserReacted(emoji) ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 hover:bg-gray-200'}"
							onclick={() => handleReaction(emoji)}
							disabled={!currentUser}
						>
							{emoji} {users.length}
						</button>
					{/if}
				{/each}
			{/if}
		</div>
	</div>
	
	<!-- Reaction Picker -->
	{#if showReactions}
		<div class="mt-2 p-2 bg-gray-50 rounded-lg border">
			<div class="flex gap-1 flex-wrap">
				{#each reactionEmojis as emoji}
					<button
						class="text-lg px-2 py-1 rounded hover:bg-gray-200 transition-colors {hasUserReacted(emoji) ? 'bg-blue-100' : ''}"
						onclick={() => {
							handleReaction(emoji);
							showReactions = false;
						}}
						disabled={!currentUser}
					>
						{emoji}
					</button>
				{/each}
			</div>
		</div>
	{/if}
	
	<!-- Comments Section -->
	<div class="mt-4">
		<!-- Comments toggle -->
		<button
			onclick={() => showComments = !showComments}
			class="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
		>
			💬 {entry.comments?.length || 0} comment{(entry.comments?.length || 0) !== 1 ? 's' : ''}
		</button>
		
		{#if showComments}
			<div class="mt-3 space-y-2">
				<!-- Existing comments -->
				{#if entry.comments && entry.comments.length > 0}
					{#each entry.comments as comment (comment.id)}
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="flex justify-between items-start">
								<span class="font-medium text-sm text-gray-700">
									{getDisplayName(comment.createdBy, {})}
								</span>
								<span class="text-xs text-gray-500">
									{formatTimestamp(comment.createdAt)}
								</span>
							</div>
							<p class="text-sm text-gray-600 mt-1">{comment.text}</p>
						</div>
					{/each}
				{/if}
				
				<!-- Add comment form -->
				{#if currentUser}
					<div class="flex gap-2 mt-3">
						<input
							type="text"
							bind:value={newComment}
							placeholder="Add a comment..."
							class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									handleAddComment();
								}
							}}
						/>
						<button
							onclick={handleAddComment}
							disabled={!newComment.trim() || isAddingComment}
							class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isAddingComment ? '⏳' : '💬'}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Timestamp -->
	<div class="mt-3 pt-2 border-t border-gray-200">
		<p class="text-xs text-gray-500">
			{formatTimestamp(entry.createdAt)}
		</p>
	</div>
</div>