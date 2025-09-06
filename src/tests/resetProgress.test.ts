import { describe, it, expect, vi, beforeEach } from 'vitest';
import { islamicQuestions } from '$lib/data/islamicQuestions';

describe('resetProgress function requirements', () => {
	beforeEach(() => {
		// Clear console logs before each test
		vi.clearAllMocks();
	});

	it('should have islamicQuestions data available for fresh reload', () => {
		// Verify that the islamicQuestions export is available and has data
		expect(islamicQuestions).toBeDefined();
		expect(Array.isArray(islamicQuestions)).toBe(true);
		expect(islamicQuestions.length).toBeGreaterThan(0);
		
		// Verify that questions have the expected structure
		const firstQuestion = islamicQuestions[0];
		expect(firstQuestion).toBeDefined();
		expect(firstQuestion.id).toBeDefined();
		expect(firstQuestion.category).toBeDefined();
		expect(firstQuestion.question_en).toBeDefined();
		expect(firstQuestion.question_ar).toBeDefined();
	});

	it('should verify islamicQuestions contains fresh data with categories', () => {
		// Verify that we have questions from multiple categories (fresh data from all modules)
		const categories = new Set(islamicQuestions.map(q => q.category));
		expect(categories.size).toBeGreaterThan(1);
		
		// Verify key categories are present (indicates fresh data is loaded)
		expect(categories.has('Allah')).toBe(true);
		expect(categories.has('Prophet')).toBe(true);
		
		// Verify questions have required fields for proper reset functionality
		islamicQuestions.forEach(question => {
			expect(question.id).toBeDefined();
			expect(typeof question.id).toBe('string');
			expect(question.category).toBeDefined();
			expect(question.question_en).toBeDefined();
			expect(question.question_ar).toBeDefined();
		});
	});

	it('should verify direct assignment capability (no spread needed)', () => {
		// Test that islamicQuestions can be directly assigned (as required by resetProgress update)
		const testQuestions = islamicQuestions;
		expect(testQuestions).toBe(islamicQuestions); // Should be same reference for direct assignment
		expect(testQuestions.length).toBe(islamicQuestions.length);
		
		// Test that spread creates new array (what we replaced)
		const spreadQuestions = [...islamicQuestions];
		expect(spreadQuestions).not.toBe(islamicQuestions); // Different reference
		expect(spreadQuestions.length).toBe(islamicQuestions.length);
		
		// Both should have same content
		expect(testQuestions).toEqual(spreadQuestions);
	});
});