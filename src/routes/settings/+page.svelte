<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { 
		collection, 
		doc, 
		getDoc, 
		setDoc, 
		updateDoc, 
		getDocs, 
		query, 
		orderBy 
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { SmartEngine, type UserTraits, type IslamicProgress, type DailyPoll } from '$lib/smartEngine';
	import { identityTraits, nudgeTemplates, badgeTemplates } from '$lib/data/smartEngine';
	import { pollTemplates } from '$lib/data/polls';
	import { getCurrentSeasonalBanners, getCurrentSeasonalConfig } from '$lib/data/seasonal';
	import { type DailyAnalytics } from '$lib/data/analytics';
	import { themeStore } from '$lib/themes/neo';
	import LoadingSpinner from '$lib/LoadingSpinner.svelte';
	import PlayCard from '$lib/components/PlayCard.svelte';
	import GlassCard from '$lib/themes/neo/components/GlassCard.svelte';
	import { 
		Settings, 
		User, 
		Brain, 
		Star, 
		Award, 
		RefreshCw, 
		Save,
		MessageSquare,
		BarChart,
		Vote,
		Calendar,
		Zap
	} from 'lucide-svelte';

	// State
	let loading = $state(true);
	let currentTheme = $state('default');
	let user = $state(auth.currentUser);
	let activeTab = $state('traits');
	let saving = $state(false);

	// User data
	let userTraits = $state<UserTraits | null>(null);
	let islamicProgress = $state<IslamicProgress | null>(null);
	let selectedTraits = $state<string[]>([]);
	let customTraits = $state<string[]>([]);

	// Analytics data
	let todayAnalytics = $state<DailyAnalytics | null>(null);
	let currentPoll = $state<DailyPoll | null>(null);
	let seasonalBanners = $state<any[]>([]);
	let seasonalConfig = $state<any>(null);

	// Subscribe to theme changes
	$effect(() => {
		const unsubscribe = themeStore.subscribe((theme) => {
			currentTheme = theme;
		});
		return unsubscribe;
	});

	// Initialize data
	onMount(async () => {
		if (!user?.uid) {
			loading = false;
			return;
		}

		try {
			// Load user traits and progress
			const [traits, progress] = await Promise.all([
				SmartEngine.getUserTraits(user.uid),
				SmartEngine.getIslamicProgress(user.uid)
			]);

			userTraits = traits;
			islamicProgress = progress;
			selectedTraits = [...traits.traits];
			customTraits = [...(traits.customTraits || [])];

			// Load analytics and seasonal data
			await loadAnalyticsData();
			loadSeasonalData();

		} catch (error) {
			console.error('[Settings] Failed to load user data:', error);
		} finally {
			loading = false;
		}
	});

	// Load analytics data
	async function loadAnalyticsData() {
		try {
			const dateString = new Date().toISOString().split('T')[0];
			const analyticsDoc = await getDoc(doc(db, 'analytics', dateString));
			
			if (analyticsDoc.exists()) {
				todayAnalytics = analyticsDoc.data() as DailyAnalytics;
			}

			// Load current poll
			const familyId = process.env.VITE_FAMILY_ID || 'default_family';
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const pollQuery = query(
				collection(db, 'daily_polls'),
				where('familyId', '==', familyId),
				where('createdAt', '>=', today),
				where('createdAt', '<', tomorrow),
				orderBy('createdAt', 'desc')
			);

			const pollSnapshot = await getDocs(pollQuery);
			if (!pollSnapshot.empty) {
				currentPoll = { id: pollSnapshot.docs[0].id, ...pollSnapshot.docs[0].data() } as DailyPoll;
			}
		} catch (error) {
			console.error('[Settings] Failed to load analytics data:', error);
		}
	}

	// Load seasonal data
	function loadSeasonalData() {
		seasonalBanners = getCurrentSeasonalBanners();
		seasonalConfig = getCurrentSeasonalConfig();
	}

	// Save trait changes
	async function saveTraits() {
		if (!user?.uid || !userTraits) return;

		try {
			saving = true;

			await updateDoc(doc(db, 'identity_traits', user.uid), {
				traits: selectedTraits,
				customTraits: customTraits,
				updatedAt: new Date()
			});

			userTraits.traits = [...selectedTraits];
			userTraits.customTraits = [...customTraits];

			console.log('[Settings] Traits saved successfully');
		} catch (error) {
			console.error('[Settings] Failed to save traits:', error);
		} finally {
			saving = false;
		}
	}

	// Generate test nudge
	async function generateTestNudge() {
		if (!user?.uid) return;

		try {
			const nudge = await SmartEngine.generateDailyNudge(user.uid);
			if (nudge) {
				alert(`Test nudge generated: ${nudge.generatedText}`);
			} else {
				alert('Already have a nudge for today. Try again tomorrow!');
			}
		} catch (error) {
			console.error('[Settings] Failed to generate test nudge:', error);
			alert('Failed to generate test nudge');
		}
	}

	// Create weekly feedback
	async function createTestFeedback() {
		if (!user?.uid) return;

		try {
			await SmartEngine.createWeeklyFeedback(user.uid);
			alert('Test weekly feedback created!');
		} catch (error) {
			console.error('[Settings] Failed to create test feedback:', error);
			alert('Failed to create test feedback');
		}
	}

	// Generate test poll
	async function generateTestPoll() {
		try {
			const familyId = process.env.VITE_FAMILY_ID || 'default_family';
			const poll = await SmartEngine.generateDailyPoll(familyId);
			if (poll) {
				currentPoll = poll;
				alert(`Test poll generated: ${poll.question}`);
			} else {
				alert('Poll already exists for today');
			}
		} catch (error) {
			console.error('[Settings] Failed to generate test poll:', error);
			alert('Failed to generate test poll');
		}
	}

	// Generate all daily content
	async function generateAllDailyContent() {
		try {
			const allowedEmails = process.env.VITE_ALLOWED_EMAILS?.split(',') || [];
			await SmartEngine.generateDailyContentForAllUsers(allowedEmails);
			alert('Daily content generated for all users!');
			await loadAnalyticsData(); // Refresh analytics
		} catch (error) {
			console.error('[Settings] Failed to generate daily content:', error);
			alert('Failed to generate daily content');
		}
	}

	// Get tab styling
	function getTabStyling(tabId: string) {
		const isActive = activeTab === tabId;
		if (currentTheme === 'neo') {
			return isActive 
				? 'border-lime-400/50 bg-lime-500/20 text-lime-400' 
				: 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50';
		} else {
			return isActive
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
		}
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="{currentTheme === 'neo' ? 'neo-gradient-text' : ''} text-2xl font-bold {currentTheme === 'neo' ? '' : 'text-gray-900'}">
			Settings & Admin
		</h1>
		<p class="mt-1 text-sm {currentTheme === 'neo' ? 'text-slate-300' : 'text-gray-500'}">
			Manage traits, nudges, and Smart Engine configuration
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else}
		<!-- Navigation Tabs -->
		<div class="flex space-x-1 rounded-lg border {currentTheme === 'neo' ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-100'} p-1">
			{#each [
				{ id: 'traits', label: 'Identity Traits', icon: User },
				{ id: 'progress', label: 'Islamic Progress', icon: Star },
				{ id: 'analytics', label: 'Analytics', icon: BarChart },
				{ id: 'polls', label: 'Polls', icon: Vote },
				{ id: 'seasonal', label: 'Seasonal', icon: Calendar },
				{ id: 'testing', label: 'Testing', icon: RefreshCw }
			] as tab}
				{@const TabIcon = tab.icon}
				<button
					onclick={() => activeTab = tab.id}
					class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors {getTabStyling(tab.id)}"
				>
					<TabIcon class="h-4 w-4" />
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'traits'}
			{#if currentTheme === 'neo'}
				<GlassCard header="🔧 Identity Traits">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<User class="h-5 w-5 text-lime-400" />
							<h2 class="text-xl font-bold text-slate-200">Identity Traits</h2>
						</div>

						{#if userTraits}
							<!-- Current Selection -->
							<div class="space-y-3">
								<h3 class="font-medium text-slate-300">Current Traits ({selectedTraits.length})</h3>
								<div class="flex flex-wrap gap-2">
									{#each selectedTraits as traitId}
										{@const trait = identityTraits.find(t => t.id === traitId)}
										{#if trait}
											<span class="rounded-full border border-lime-400/30 bg-lime-500/20 px-3 py-1 text-sm text-lime-300">
												{trait.name}
											</span>
										{/if}
									{/each}
									{#each customTraits as trait}
										<span class="rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
											{trait} (custom)
										</span>
									{/each}
								</div>
							</div>

							<!-- Save Button -->
							<div class="flex justify-end">
								<button
									onclick={saveTraits}
									disabled={saving}
									class="flex items-center gap-2 rounded-lg border border-lime-400/50 bg-lime-500/20 px-4 py-2 font-medium text-lime-400 hover:bg-lime-500/30 disabled:opacity-50"
								>
									{#if saving}
										<LoadingSpinner size="small" />
									{:else}
										<Save class="h-4 w-4" />
									{/if}
									Save Changes
								</button>
							</div>
						{/if}
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="🔧 Identity Traits">
					{#if userTraits}
						<div class="space-y-6">
							<!-- Current Selection -->
							<div class="space-y-3">
								<h3 class="font-medium text-gray-700">Current Traits ({selectedTraits.length})</h3>
								<div class="flex flex-wrap gap-2">
									{#each selectedTraits as traitId}
										{@const trait = identityTraits.find(t => t.id === traitId)}
										{#if trait}
											<span class="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
												{trait.name}
											</span>
										{/if}
									{/each}
									{#each customTraits as trait}
										<span class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
											{trait} (custom)
										</span>
									{/each}
								</div>
							</div>

							<!-- Save Button -->
							<div class="flex justify-end">
								<button
									onclick={saveTraits}
									disabled={saving}
									class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
								>
									{#if saving}
										<LoadingSpinner size="small" />
									{:else}
										<Save class="h-4 w-4" />
									{/if}
									Save Changes
								</button>
							</div>
						</div>
					{/if}
				</PlayCard>
			{/if}

		{:else if activeTab === 'progress'}
			{#if currentTheme === 'neo'}
				<GlassCard header="📊 Islamic Progress">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<Star class="h-5 w-5 text-cyan-400" />
							<h2 class="text-xl font-bold text-slate-200">Islamic Progress</h2>
						</div>

						{#if islamicProgress}
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
								<div class="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4">
									<h3 class="font-medium text-cyan-300">Questions Answered</h3>
									<p class="text-2xl font-bold text-slate-200">{islamicProgress.answeredQuestions.length}</p>
								</div>
								<div class="rounded-lg border border-lime-400/30 bg-lime-500/10 p-4">
									<h3 class="font-medium text-lime-300">Correct Answers</h3>
									<p class="text-2xl font-bold text-slate-200">{islamicProgress.totalCorrect}</p>
								</div>
								<div class="rounded-lg border border-purple-400/30 bg-purple-500/10 p-4">
									<h3 class="font-medium text-purple-300">Current Streak</h3>
									<p class="text-2xl font-bold text-slate-200">{islamicProgress.streak}</p>
								</div>
							</div>

							{#if islamicProgress.currentQuestionId}
								<div class="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
									<h3 class="font-medium text-slate-300">Next Question</h3>
									<p class="text-slate-400">ID: {islamicProgress.currentQuestionId}</p>
								</div>
							{/if}
						{/if}
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="📊 Islamic Progress">
					{#if islamicProgress}
						<div class="space-y-6">
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
								<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
									<h3 class="font-medium text-blue-700">Questions Answered</h3>
									<p class="text-2xl font-bold text-gray-800">{islamicProgress.answeredQuestions.length}</p>
								</div>
								<div class="rounded-lg border border-green-200 bg-green-50 p-4">
									<h3 class="font-medium text-green-700">Correct Answers</h3>
									<p class="text-2xl font-bold text-gray-800">{islamicProgress.totalCorrect}</p>
								</div>
								<div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
									<h3 class="font-medium text-purple-700">Current Streak</h3>
									<p class="text-2xl font-bold text-gray-800">{islamicProgress.streak}</p>
								</div>
							</div>
						</div>
					{/if}
				</PlayCard>
			{/if}

		{:else if activeTab === 'analytics'}
			{#if currentTheme === 'neo'}
				<GlassCard header="📊 Smart Engine Analytics">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<BarChart class="h-5 w-5 text-cyan-400" />
							<h2 class="text-xl font-bold text-slate-200">Today's Analytics</h2>
						</div>

						{#if todayAnalytics}
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div class="rounded-lg border border-lime-400/30 bg-lime-500/10 p-4">
									<h3 class="font-medium text-lime-300">Nudges Generated</h3>
									<p class="text-2xl font-bold text-slate-200">{todayAnalytics.metrics.nudgesGenerated}</p>
								</div>
								<div class="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4">
									<h3 class="font-medium text-cyan-300">Engagement Rate</h3>
									<p class="text-2xl font-bold text-slate-200">{Math.round(todayAnalytics.metrics.nudgeEngagementRate * 100)}%</p>
								</div>
								<div class="rounded-lg border border-purple-400/30 bg-purple-500/10 p-4">
									<h3 class="font-medium text-purple-300">Poll Votes</h3>
									<p class="text-2xl font-bold text-slate-200">{todayAnalytics.metrics.pollVotes}</p>
								</div>
								<div class="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
									<h3 class="font-medium text-amber-300">Active Users</h3>
									<p class="text-2xl font-bold text-slate-200">{todayAnalytics.metrics.activeUsers}</p>
								</div>
							</div>

							<!-- Optimization Recommendations -->
							{#if todayAnalytics.optimization}
								<div class="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
									<h3 class="font-medium text-slate-300 mb-3">Smart Optimization</h3>
									<div class="space-y-2">
										<div>
											<span class="text-sm text-slate-400">Recommended Nudge Types:</span>
											<div class="flex flex-wrap gap-1 mt-1">
												{#each todayAnalytics.optimization.recommendedNudgeTypes as type}
													<span class="rounded-full bg-lime-500/20 px-2 py-1 text-xs text-lime-300">{type}</span>
												{/each}
											</div>
										</div>
										{#if todayAnalytics.optimization.lowEngagementUsers.length > 0}
											<div>
												<span class="text-sm text-amber-400">Low Engagement Users: {todayAnalytics.optimization.lowEngagementUsers.length}</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{:else}
							<p class="text-slate-400">No analytics data available for today</p>
						{/if}
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="📊 Smart Engine Analytics">
					{#if todayAnalytics}
						<div class="space-y-6">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div class="rounded-lg border border-green-200 bg-green-50 p-4">
									<h3 class="font-medium text-green-700">Nudges Generated</h3>
									<p class="text-2xl font-bold text-gray-800">{todayAnalytics.metrics.nudgesGenerated}</p>
								</div>
								<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
									<h3 class="font-medium text-blue-700">Engagement Rate</h3>
									<p class="text-2xl font-bold text-gray-800">{Math.round(todayAnalytics.metrics.nudgeEngagementRate * 100)}%</p>
								</div>
								<div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
									<h3 class="font-medium text-purple-700">Poll Votes</h3>
									<p class="text-2xl font-bold text-gray-800">{todayAnalytics.metrics.pollVotes}</p>
								</div>
								<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
									<h3 class="font-medium text-amber-700">Active Users</h3>
									<p class="text-2xl font-bold text-gray-800">{todayAnalytics.metrics.activeUsers}</p>
								</div>
							</div>
						</div>
					{:else}
						<p class="text-gray-600">No analytics data available for today</p>
					{/if}
				</PlayCard>
			{/if}

		{:else if activeTab === 'polls'}
			{#if currentTheme === 'neo'}
				<GlassCard header="📊 Daily Polls Management">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<Vote class="h-5 w-5 text-cyan-400" />
							<h2 class="text-xl font-bold text-slate-200">Daily Polls</h2>
						</div>

						{#if currentPoll}
							<div class="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4">
								<h3 class="font-medium text-cyan-300 mb-2">Today's Poll</h3>
								<p class="text-slate-200 mb-3">{currentPoll.question}</p>
								<div class="flex flex-wrap gap-2">
									{#each currentPoll.options as option}
										<span class="rounded-full bg-slate-700/50 px-3 py-1 text-sm text-slate-300">{option}</span>
									{/each}
								</div>
								<p class="text-xs text-slate-400 mt-2">
									Votes: {Object.keys(currentPoll.votes || {}).length} | 
									Status: {currentPoll.isClosed ? 'Closed' : 'Open'}
								</p>
							</div>
						{:else}
							<p class="text-slate-400">No poll generated for today</p>
						{/if}

						<div class="space-y-3">
							<h3 class="font-medium text-slate-300">Available Poll Templates ({pollTemplates.length})</h3>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{#each pollTemplates.slice(0, 6) as template}
									<div class="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
										<p class="text-sm text-slate-200">{template.question}</p>
										<span class="inline-block mt-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-400">{template.category}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="📊 Daily Polls Management">
					<div class="space-y-6">
						{#if currentPoll}
							<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
								<h3 class="font-medium text-blue-700 mb-2">Today's Poll</h3>
								<p class="text-gray-800 mb-3">{currentPoll.question}</p>
								<div class="flex flex-wrap gap-2">
									{#each currentPoll.options as option}
										<span class="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">{option}</span>
									{/each}
								</div>
								<p class="text-xs text-gray-600 mt-2">
									Votes: {Object.keys(currentPoll.votes || {}).length} | 
									Status: {currentPoll.isClosed ? 'Closed' : 'Open'}
								</p>
							</div>
						{:else}
							<p class="text-gray-600">No poll generated for today</p>
						{/if}

						<div class="space-y-3">
							<h3 class="font-medium text-gray-700">Available Poll Templates ({pollTemplates.length})</h3>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{#each pollTemplates.slice(0, 6) as template}
									<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
										<p class="text-sm text-gray-800">{template.question}</p>
										<span class="inline-block mt-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">{template.category}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</PlayCard>
			{/if}

		{:else if activeTab === 'seasonal'}
			{#if currentTheme === 'neo'}
				<GlassCard header="📅 Seasonal Content">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<Calendar class="h-5 w-5 text-purple-400" />
							<h2 class="text-xl font-bold text-slate-200">Seasonal Content</h2>
						</div>

						{#if seasonalBanners.length > 0}
							<div class="space-y-3">
								<h3 class="font-medium text-slate-300">Active Seasonal Banners</h3>
								{#each seasonalBanners as banner}
									<div class="rounded-lg border border-purple-400/30 bg-purple-500/10 p-4">
										<div class="flex items-center gap-2 mb-2">
											<span class="text-xl">{banner.emoji}</span>
											<h4 class="font-medium text-purple-300">{banner.title}</h4>
											<span class="rounded bg-slate-700 px-2 py-1 text-xs text-slate-400">{banner.category}</span>
										</div>
										<p class="text-slate-200 text-sm">{banner.message}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-slate-400">No active seasonal banners</p>
						{/if}

						{#if seasonalConfig}
							<div class="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
								<h3 class="font-medium text-slate-300 mb-3">Current Season: {seasonalConfig.season}</h3>
								<div class="space-y-2">
									<div>
										<span class="text-sm text-slate-400">Boosted Nudge Types:</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each seasonalConfig.nudgeBoosts as boost}
												<span class="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">{boost}</span>
											{/each}
										</div>
									</div>
									<div>
										<span class="text-sm text-slate-400">Special Badges Available:</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each seasonalConfig.specialBadges as badge}
												<span class="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">{badge}</span>
											{/each}
										</div>
									</div>
								</div>
							</div>
						{:else}
							<p class="text-slate-400">No seasonal configuration active</p>
						{/if}
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="📅 Seasonal Content">
					<div class="space-y-6">
						{#if seasonalBanners.length > 0}
							<div class="space-y-3">
								<h3 class="font-medium text-gray-700">Active Seasonal Banners</h3>
								{#each seasonalBanners as banner}
									<div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
										<div class="flex items-center gap-2 mb-2">
											<span class="text-xl">{banner.emoji}</span>
											<h4 class="font-medium text-purple-700">{banner.title}</h4>
											<span class="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">{banner.category}</span>
										</div>
										<p class="text-gray-800 text-sm">{banner.message}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-600">No active seasonal banners</p>
						{/if}

						{#if seasonalConfig}
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<h3 class="font-medium text-gray-700 mb-3">Current Season: {seasonalConfig.season}</h3>
								<div class="space-y-2">
									<div>
										<span class="text-sm text-gray-600">Boosted Nudge Types:</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each seasonalConfig.nudgeBoosts as boost}
												<span class="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">{boost}</span>
											{/each}
										</div>
									</div>
									<div>
										<span class="text-sm text-gray-600">Special Badges Available:</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each seasonalConfig.specialBadges as badge}
												<span class="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{badge}</span>
											{/each}
										</div>
									</div>
								</div>
							</div>
						{:else}
							<p class="text-gray-600">No seasonal configuration active</p>
						{/if}
					</div>
				</PlayCard>
			{/if}

		{:else if activeTab === 'testing'}
			{#if currentTheme === 'neo'}
				<GlassCard header="🧪 Testing & Debug">
					<div class="space-y-6">
						<div class="flex items-center gap-2">
							<RefreshCw class="h-5 w-5 text-amber-400" />
							<h2 class="text-xl font-bold text-slate-200">Testing & Debug</h2>
						</div>

						<div class="space-y-4">
							<button
								onclick={generateTestNudge}
								class="w-full rounded-lg border border-lime-400/50 bg-lime-500/20 p-4 text-left hover:bg-lime-500/30"
							>
								<h3 class="font-medium text-lime-400">Generate Test Nudge</h3>
								<p class="text-sm text-slate-400">Create a daily nudge for testing purposes</p>
							</button>

							<button
								onclick={createTestFeedback}
								class="w-full rounded-lg border border-cyan-400/50 bg-cyan-500/20 p-4 text-left hover:bg-cyan-500/30"
							>
								<h3 class="font-medium text-cyan-400">Create Test Feedback</h3>
								<p class="text-sm text-slate-400">Generate a weekly feedback card</p>
							</button>

							<button
								onclick={generateTestPoll}
								class="w-full rounded-lg border border-purple-400/50 bg-purple-500/20 p-4 text-left hover:bg-purple-500/30"
							>
								<h3 class="font-medium text-purple-400">Generate Test Poll</h3>
								<p class="text-sm text-slate-400">Create a daily poll for testing</p>
							</button>

							<button
								onclick={generateAllDailyContent}
								class="w-full rounded-lg border border-amber-400/50 bg-amber-500/20 p-4 text-left hover:bg-amber-500/30"
							>
								<div class="flex items-center gap-2">
									<Zap class="h-4 w-4 text-amber-400" />
									<h3 class="font-medium text-amber-400">Generate All Daily Content</h3>
								</div>
								<p class="text-sm text-slate-400">Run complete daily content generation for all users</p>
							</button>
						</div>
					</div>
				</GlassCard>
			{:else}
				<PlayCard header="🧪 Testing & Debug">
					<div class="space-y-4">
						<button
							onclick={generateTestNudge}
							class="w-full rounded-lg border border-green-300 bg-green-50 p-4 text-left hover:bg-green-100"
						>
							<h3 class="font-medium text-green-700">Generate Test Nudge</h3>
							<p class="text-sm text-gray-600">Create a daily nudge for testing purposes</p>
						</button>

						<button
							onclick={createTestFeedback}
							class="w-full rounded-lg border border-blue-300 bg-blue-50 p-4 text-left hover:bg-blue-100"
						>
							<h3 class="font-medium text-blue-700">Create Test Feedback</h3>
							<p class="text-sm text-gray-600">Generate a weekly feedback card</p>
						</button>

						<button
							onclick={generateTestPoll}
							class="w-full rounded-lg border border-purple-300 bg-purple-50 p-4 text-left hover:bg-purple-100"
						>
							<h3 class="font-medium text-purple-700">Generate Test Poll</h3>
							<p class="text-sm text-gray-600">Create a daily poll for testing</p>
						</button>

						<button
							onclick={generateAllDailyContent}
							class="w-full rounded-lg border border-amber-300 bg-amber-50 p-4 text-left hover:bg-amber-100"
						>
							<div class="flex items-center gap-2">
								<Zap class="h-4 w-4 text-amber-700" />
								<h3 class="font-medium text-amber-700">Generate All Daily Content</h3>
							</div>
							<p class="text-sm text-gray-600">Run complete daily content generation for all users</p>
						</button>
					</div>
				</PlayCard>
			{/if}
		{/if}
	{/if}
</div>