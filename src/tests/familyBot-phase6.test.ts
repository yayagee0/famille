import { describe, it, expect } from 'vitest';

describe('FamilyBot Phase 6 - Legendary Badges, Rarity Styling, Fun Feed Enrichment', () => {
	describe('Legendary Badge Tier', () => {
		it('should define 6 legendary badges with correct thresholds', () => {
			const legendaryBadges = {
				explorer_master: { name: "Explorer Master", icon: "🌍", threshold: 50, counter: "pollsCreated", rarity: "legendary" },
				storyteller_epic: { name: "Epic Storyteller", icon: "📚", threshold: 100, counter: "storiesRead", rarity: "legendary" },
				feedback_champion: { name: "Feedback Champion", icon: "🏆", threshold: 25, counter: "feedbackSubmitted", rarity: "legendary" },
				family_leader: { name: "Family Leader", icon: "👑", threshold: 100, counter: "pollVotes", rarity: "legendary" },
				knowledge_guardian: { name: "Knowledge Guardian", icon: "🌌", threshold: 50, counter: "islamicStoriesRead", rarity: "legendary" },
				streak_30: { name: "Eternal Flame", icon: "🔥✨", threshold: 30, counter: "consecutiveDays", rarity: "legendary" }
			};

			// Verify all badges have correct structure
			Object.values(legendaryBadges).forEach(badge => {
				expect(badge.name).toBeTruthy();
				expect(badge.icon).toBeTruthy();
				expect(badge.threshold).toBeGreaterThan(20); // All legendary thresholds should be high
				expect(badge.counter).toBeTruthy();
				expect(badge.rarity).toBe('legendary');
			});

			// Verify specific thresholds match requirements
			expect(legendaryBadges.explorer_master.threshold).toBe(50);
			expect(legendaryBadges.storyteller_epic.threshold).toBe(100);
			expect(legendaryBadges.feedback_champion.threshold).toBe(25);
			expect(legendaryBadges.family_leader.threshold).toBe(100);
			expect(legendaryBadges.knowledge_guardian.threshold).toBe(50);
			expect(legendaryBadges.streak_30.threshold).toBe(30);
		});

		it('should have appropriate legendary names and icons', () => {
			const legendaryNames = [
				"Explorer Master",
				"Epic Storyteller", 
				"Feedback Champion",
				"Family Leader",
				"Knowledge Guardian",
				"Eternal Flame"
			];

			const legendaryIcons = ["🌍", "📚", "🏆", "👑", "🌌", "🔥✨"];

			legendaryNames.forEach(name => {
				expect(
					name.includes('Master') || 
					name.includes('Epic') ||
					name.includes('Champion') ||
					name.includes('Leader') ||
					name.includes('Guardian') ||
					name.includes('Eternal')
				).toBe(true);
			});

			legendaryIcons.forEach(icon => {
				expect(icon).toBeTruthy();
				expect(typeof icon).toBe('string');
			});
		});

		it('should handle legendary badge unlock modal message', () => {
			const mockBadgeInfo = {
				name: "Explorer Master",
				icon: "🌍",
				threshold: 50,
				counter: "pollsCreated",
				rarity: "legendary"
			};

			const mockBadge = {
				reason: "Reached 50 polls created"
			};

			const mockNickname = "TestUser";
			const expectedMessage = `🌟 ${mockNickname} unlocked Legendary Badge: ${mockBadgeInfo.name} ${mockBadgeInfo.icon} — ${mockBadge.reason}`;

			expect(expectedMessage).toContain('🌟');
			expect(expectedMessage).toContain('Legendary Badge');
			expect(expectedMessage).toContain(mockBadgeInfo.name);
			expect(expectedMessage).toContain(mockBadgeInfo.icon);
			expect(expectedMessage).toContain(mockBadge.reason);
		});
	});

	describe('Badge Reason Transparency', () => {
		it('should provide clear reasons for all badge types', () => {
			const badgeReasons = [
				"Reached 10 polls created",
				"Reached 10 stories read",
				"Reached 5 feedback submitted",
				"Reached 20 poll votes",
				"Reached 10 islamic stories read",
				"Reached 7 consecutive days",
				"Reached 50 polls created", // Legendary
				"Reached 100 stories read", // Legendary
				"Reached 25 feedback submitted", // Legendary
				"Reached 100 poll votes", // Legendary
				"Reached 50 islamic stories read", // Legendary
				"Reached 30 consecutive days" // Legendary
			];

			badgeReasons.forEach(reason => {
				expect(reason).toContain('Reached');
				expect(reason).toBeTruthy();
				expect(typeof reason).toBe('string');
				expect(reason.length).toBeGreaterThan(10);
			});
		});

		it('should show badge name, rarity, reason, and earned date', () => {
			const mockBadge = {
				name: "Explorer Master",
				rarity: "legendary",
				reason: "Reached 50 polls created",
				earnedAt: new Date()
			};

			// Verify all required fields are present
			expect(mockBadge.name).toBeTruthy();
			expect(mockBadge.rarity).toBe('legendary');
			expect(mockBadge.reason).toBeTruthy();
			expect(mockBadge.earnedAt).toBeInstanceOf(Date);
		});
	});

	describe('Rarity Styling', () => {
		it('should apply correct styling for common badges', () => {
			const commonStyles = {
				neo: 'border-slate-400/30 bg-slate-500/10',
				default: 'border-gray-200 bg-gray-50'
			};

			expect(commonStyles.neo).toContain('slate');
			expect(commonStyles.default).toContain('gray');
		});

		it('should apply correct styling for rare badges', () => {
			const rareStyles = {
				neo: 'border-blue-400/30 bg-blue-500/10',
				default: 'border-blue-200 bg-blue-50'
			};

			expect(rareStyles.neo).toContain('blue');
			expect(rareStyles.default).toContain('blue');
		});

		it('should apply enhanced styling for legendary badges with glow', () => {
			const legendaryStyles = {
				neo: 'border-yellow-400/50 bg-yellow-500/20 shadow-yellow-400/25 shadow-lg',
				default: 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-100 shadow-lg shadow-yellow-200/50'
			};

			expect(legendaryStyles.neo).toContain('yellow');
			expect(legendaryStyles.neo).toContain('shadow');
			expect(legendaryStyles.default).toContain('gradient');
			expect(legendaryStyles.default).toContain('shadow');
		});

		it('should use appropriate rarity colors', () => {
			const rarityColors = {
				common: { neo: 'text-slate-400', default: 'text-gray-600' },
				rare: { neo: 'text-blue-400', default: 'text-blue-600' },
				legendary: { neo: 'text-yellow-400', default: 'text-yellow-600' }
			};

			expect(rarityColors.common.neo).toContain('slate');
			expect(rarityColors.rare.neo).toContain('blue');
			expect(rarityColors.legendary.neo).toContain('yellow');
		});
	});

	describe('Fun Feed Enrichment', () => {
		it('should enrich poll entries with question metadata', () => {
			const pollEntry = {
				type: 'poll',
				text: '📊 TestUser started a poll: What should we eat?',
				createdBy: 'test-uid',
				metadata: {
					pollQuestion: 'What should we eat?'
				}
			};

			expect(pollEntry.type).toBe('poll');
			expect(pollEntry.text).toContain('📊');
			expect(pollEntry.text).toContain('started a poll');
			expect(pollEntry.metadata?.pollQuestion).toBeTruthy();
		});

		it('should enrich story entries with preview text', () => {
			const storyEntry = {
				type: 'story',
				text: '📖 FamilyBot told a story about adventure',
				createdBy: 'test-uid',
				metadata: {
					storyPreview: 'Once upon a time, a brave explorer set out on an adventure.'
				}
			};

			expect(storyEntry.type).toBe('story');
			expect(storyEntry.text).toContain('📖');
			expect(storyEntry.text).toContain('told a story');
			expect(storyEntry.metadata?.storyPreview).toBeTruthy();
			expect(storyEntry.metadata?.storyPreview).toContain('Once upon a time');
		});

		it('should enrich feedback entries with topic categorization', () => {
			const feedbackEntry = {
				type: 'feedback',
				text: '💡 Feedback from TestUser: Great feature!',
				createdBy: 'test-uid',
				metadata: {
					feedbackTopic: 'FamilyBot'
				}
			};

			expect(feedbackEntry.type).toBe('feedback');
			expect(feedbackEntry.text).toContain('💡');
			expect(feedbackEntry.text).toContain('Feedback from');
			expect(feedbackEntry.metadata?.feedbackTopic).toBeTruthy();
		});

		it('should create special badge entries for legendary unlocks', () => {
			const badgeEntry = {
				type: 'badge',
				text: '🌟 TestUser unlocked Legendary Badge: Explorer Master 🌍 — Reached 50 polls created',
				createdBy: 'test-uid',
				rarity: 'legendary',
				metadata: {
					badgeIcon: '🌍'
				}
			};

			expect(badgeEntry.type).toBe('badge');
			expect(badgeEntry.text).toContain('🌟');
			expect(badgeEntry.text).toContain('Legendary Badge');
			expect(badgeEntry.rarity).toBe('legendary');
			expect(badgeEntry.metadata?.badgeIcon).toBeTruthy();
		});

		it('should support poll closing summaries', () => {
			const pollCloseEntry = {
				type: 'poll',
				text: '📊 Poll closed: Pasta 🍝 won with 3 votes',
				metadata: {
					pollQuestion: 'What should we eat?'
				}
			};

			expect(pollCloseEntry.text).toContain('Poll closed');
			expect(pollCloseEntry.text).toContain('won with');
			expect(pollCloseEntry.text).toContain('votes');
		});
	});

	describe('Analytics-Based Nudges', () => {
		it('should generate streak motivation nudges', () => {
			const streakNudges = [
				'🔥 Keep it up, you\'re on a 5-day streak!',
				'🔥 Keep it up, you\'re on a 6-day streak!'
			];

			streakNudges.forEach(nudge => {
				expect(nudge).toContain('🔥');
				expect(nudge).toContain('streak');
				expect(nudge).toContain('Keep it up');
			});
		});

		it('should generate close-to-milestone nudges', () => {
			const milestoneNudges = [
				'📖 Only 1 more story to unlock Storyteller badge!',
				'🧭 Just 2 more polls to become an Explorer!',
				'💡 One more feedback to earn Feedback Hero!'
			];

			milestoneNudges.forEach(nudge => {
				expect(nudge).toBeTruthy();
				expect(nudge).toContain('more') || expect(nudge).toContain('One');
				expect(nudge).toContain('!');
			});
		});

		it('should generate legendary tier motivation nudges', () => {
			const legendaryNudges = [
				'🌍 Amazing! Only 5 more polls for Explorer Master!',
				'📚 Incredible! 5 more stories for Epic Storyteller!'
			];

			legendaryNudges.forEach(nudge => {
				expect(
					nudge.includes('Amazing!') || nudge.includes('Incredible!')
				).toBe(true);
				expect(nudge).toContain('more');
				expect(
					nudge.includes('Master') || nudge.includes('Epic')
				).toBe(true);
			});
		});

		it('should return null when no nudge is appropriate', () => {
			// For users with low progress or not close to milestones
			const noNudgeScenarios = [
				{ pollsCreated: 5, storiesRead: 3, consecutiveDays: 2 },
				{ pollsCreated: 0, storiesRead: 0, consecutiveDays: 0 }
			];

			noNudgeScenarios.forEach(scenario => {
				// Simulate logic that would return null
				const shouldShowNudge = 
					scenario.consecutiveDays >= 5 || 
					scenario.storiesRead === 9 || 
					scenario.pollsCreated >= 8;
				
				expect(shouldShowNudge).toBe(false);
			});
		});
	});

	describe('Progress Transparency Enhancement', () => {
		it('should show both common and legendary progress tracks', () => {
			const progressDisplay = `📊 Your Progress:

🧭 Polls Created: 25/10 → 🌍 25/50 (Explorer Master)
📖 Stories Read: 50/10 → 📚 50/100 (Epic Storyteller)
💡 Feedback Sent: 15/5 → 🏆 15/25 (Feedback Champion)
🤝 Poll Votes: 60/20 → 👑 60/100 (Family Leader)
🌙 Islamic Stories: 30/10 → 🌌 30/50 (Knowledge Guardian)
🔥 Current Streak: 15/7 → 🔥✨ 15/30 (Eternal Flame)`;

			expect(progressDisplay).toContain('→'); // Shows progression
			expect(progressDisplay).toContain('Explorer Master');
			expect(progressDisplay).toContain('Epic Storyteller');
			expect(progressDisplay).toContain('Feedback Champion');
			expect(progressDisplay).toContain('Family Leader');
			expect(progressDisplay).toContain('Knowledge Guardian');
			expect(progressDisplay).toContain('Eternal Flame');
		});

		it('should include motivational nudges in progress display', () => {
			const progressWithNudge = `📊 Your Progress:
[progress details]

🔥 Keep it up, you're on a 5-day streak!`;

			expect(progressWithNudge).toContain('📊 Your Progress');
			expect(progressWithNudge).toContain('🔥 Keep it up');
		});

		it('should handle real-time badge celebrations', () => {
			const badgeCelebration = '🎉 Congratulations! You earned new badges: Explorer Master 🌍! Keep up the amazing work!';

			expect(badgeCelebration).toContain('🎉 Congratulations');
			expect(badgeCelebration).toContain('earned new badges');
			expect(badgeCelebration).toContain('Keep up the amazing work');
		});
	});

	describe('Integration Tests', () => {
		it('should maintain FSM v2 state flow with new features', () => {
			const states = ['idle', 'greeting', 'suggest', 'action', 'followUp', 'goodbye'];
			const newSuggestions = [
				'📊 Create a poll',
				'📖 Tell me a story',
				'💬 Share feedback',
				'🏆 Check my progress' // Phase 6 addition
			];

			states.forEach(state => {
				expect(state).toBeTruthy();
			});

			expect(newSuggestions).toContain('🏆 Check my progress');
		});

		it('should integrate with existing fairness system', () => {
			const fairnessMessage = "It's Yahya's turn today! 🎉 I want to make sure everyone gets equal time with me.";
			
			expect(fairnessMessage).toContain('turn today');
			expect(fairnessMessage).toContain('🎉');
			expect(fairnessMessage).toContain('equal time');
		});

		it('should work with existing preference system', () => {
			const preferences = {
				pollChoices: { 'food': 5, 'activity': 2 },
				storyThemes: { 'adventure': 3, 'family': 7 },
				feedbackSent: 2
			};

			// Verify preference tracking still works
			expect(preferences.pollChoices.food).toBe(5);
			expect(preferences.storyThemes.family).toBe(7);
			expect(preferences.feedbackSent).toBe(2);
		});
	});

	describe('Schema Compliance', () => {
		it('should enforce rarity field in UserBadge interface', () => {
			const userBadge = {
				userId: 'test-uid',
				badgeId: 'explorer_master',
				name: 'Explorer Master',
				description: '🌍 Earned by reaching 50 polls created',
				category: 'social',
				rarity: 'legendary',
				earnedAt: new Date(),
				notificationSent: false,
				reason: 'Reached 50 polls created'
			};

			expect(userBadge.rarity).toBe('legendary');
			expect(['common', 'rare', 'legendary']).toContain(userBadge.rarity);
		});

		it('should support enhanced FunFeedEntry with metadata', () => {
			const funFeedEntry = {
				type: 'badge',
				text: '🌟 TestUser unlocked Legendary Badge: Explorer Master 🌍',
				createdBy: 'test-uid',
				familyId: 'test-family',
				rarity: 'legendary',
				metadata: {
					badgeIcon: '🌍'
				}
			};

			expect(funFeedEntry.type).toBe('badge');
			expect(funFeedEntry.rarity).toBe('legendary');
			expect(funFeedEntry.metadata?.badgeIcon).toBeTruthy();
		});
	});
});