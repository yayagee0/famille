<script lang="ts">
	import { onMount } from 'svelte';
	import { Bell, X } from 'lucide-svelte';
	import { subscribeToNotifications, markNotificationAsRead } from './firebase';
	import { getDisplayName } from './getDisplayName';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import type { User } from 'firebase/auth';

	dayjs.extend(relativeTime);

	let { user } = $props<{ user: User }>();

	let notifications = $state<any[]>([]);
	let showDropdown = $state(false);
	let unreadCount = $derived(notifications.filter((n) => !n.read).length);
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		if (user?.uid) {
			// Subscribe to real-time notifications
			unsubscribe = subscribeToNotifications(user.uid, (notificationData) => {
				notifications = notificationData;
			});
		}

		// Close dropdown when clicking outside
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!target.closest('.notification-dropdown')) {
				showDropdown = false;
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			unsubscribe?.();
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	async function handleNotificationClick(notification: any) {
		if (!notification.read) {
			await markNotificationAsRead(user.uid, notification.id);
		}

		// Navigate to link if provided
		if (notification.link) {
			window.location.href = notification.link;
		}

		showDropdown = false;
	}

	function formatTime(timestamp: any) {
		if (!timestamp) return '';

		// Handle Firestore Timestamp
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return dayjs(date).fromNow();
	}

	function getNotificationIcon(type: string) {
		switch (type) {
			case 'newPost':
				return '📝';
			case 'comment':
				return '💬';
			case 'birthday':
				return '🎂';
			case 'system':
				return '⚙️';
			default:
				return '🔔';
		}
	}
</script>

<div class="notification-dropdown relative">
	<button
		onclick={toggleDropdown}
		class="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
		aria-label="Notifications"
	>
		<Bell class="h-6 w-6" />
		{#if unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>

	{#if showDropdown}
		<div
			class="ring-opacity-5 absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black focus:outline-none"
		>
			<div class="p-4">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Notifications</h3>
					<button
						onclick={() => (showDropdown = false)}
						class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>

			<div class="max-h-96 overflow-y-auto">
				{#if notifications.length === 0}
					<div class="p-4 text-center text-gray-500">
						<Bell class="mx-auto h-8 w-8 text-gray-300" />
						<p class="mt-2">No notifications yet</p>
					</div>
				{:else}
					{#each notifications as notification (notification.id)}
						<button
							onclick={() => handleNotificationClick(notification)}
							class="w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
							class:bg-blue-50={!notification.read}
						>
							<div class="flex items-start space-x-3">
								<span class="text-2xl">{getNotificationIcon(notification.type)}</span>
								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between">
										<p class="truncate text-sm font-medium text-gray-900">
											{notification.title}
										</p>
										{#if !notification.read}
											<span class="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>
										{/if}
									</div>
									<p class="mt-1 line-clamp-2 text-sm text-gray-500">
										{notification.body}
									</p>
									<p class="mt-1 text-xs text-gray-400">
										{formatTime(notification.createdAt)}
									</p>
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>

			{#if notifications.length > 0}
				<div class="border-t border-gray-100 p-4">
					<button class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
						View all notifications
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
