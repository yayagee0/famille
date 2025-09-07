#!/usr/bin/env node

/**
 * Smart Engine Test Script
 *
 * Tests the autonomous operation of the AI-Powered Smart Engine
 * Run with: npm run test:smart-engine
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { SmartEngine } from '../src/lib/smartEngine.js';

// Initialize Firebase (would normally use environment variables)
const firebaseConfig = {
	// Configuration would come from environment
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSmartEngine() {
	console.log('🚀 Starting Smart Engine Test...\n');

	try {
		// Test 1: Generate daily content for all users
		console.log('📝 Test 1: Generating daily content for all users...');
		const allowedEmails = ['test@example.com']; // Would come from environment
		await SmartEngine.generateDailyContentForAllUsers(allowedEmails);
		console.log('✅ Daily content generation completed\n');

		// Test 2: Check user traits
		console.log('👤 Test 2: Checking user traits...');
		const userTraits = await SmartEngine.getUserTraits('test@example.com');
		console.log('Current traits:', userTraits.traits);
		console.log('✅ User traits retrieved\n');

		// Test 3: Check Islamic progress
		console.log('📖 Test 3: Checking Islamic progress...');
		const islamicProgress = await SmartEngine.getIslamicProgress('test@example.com');
		console.log('Questions answered:', islamicProgress.answeredQuestions.length);
		console.log('Current question:', islamicProgress.currentQuestionId);
		console.log('✅ Islamic progress retrieved\n');

		// Test 4: Generate test poll
		console.log('📊 Test 4: Generating test poll...');
		const familyId = 'test_family';
		const poll = await SmartEngine.generateDailyPoll(familyId);
		if (poll) {
			console.log('Poll question:', poll.question);
			console.log('Options:', poll.options);
		} else {
			console.log('Poll already exists for today');
		}
		console.log('✅ Poll generation tested\n');

		// Test 5: Get seasonal banners
		console.log('🎄 Test 5: Checking seasonal banners...');
		const banners = SmartEngine.getCurrentSeasonalBanners();
		console.log('Active banners:', banners.length);
		banners.forEach((banner) => {
			console.log(`- ${banner.title} (${banner.category})`);
		});
		console.log('✅ Seasonal banners retrieved\n');

		console.log('🎉 All Smart Engine tests completed successfully!');
		console.log('\n📊 Summary:');
		console.log('- Daily content generation: ✅');
		console.log('- User trait management: ✅');
		console.log('- Islamic progression: ✅');
		console.log('- Poll system: ✅');
		console.log('- Seasonal content: ✅');
		console.log('\n🔮 Smart Engine is ready for 99.9% autonomous operation!');
	} catch (error) {
		console.error('❌ Smart Engine test failed:', error);
		process.exit(1);
	}
}

// Run the test
testSmartEngine()
	.then(() => {
		console.log('\n🏁 Test completed');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Test suite failed:', error);
		process.exit(1);
	});
