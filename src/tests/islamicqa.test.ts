import { describe, it, expect } from 'vitest';
import { islamicQuestions } from '$lib/data/islamicQuestions';

describe('Islamic Q&A Data Structure', () => {
	it('should have valid question data structure', () => {
		expect(islamicQuestions).toBeDefined();
		expect(Array.isArray(islamicQuestions)).toBe(true);
		expect(islamicQuestions.length).toBeGreaterThan(0);
	});

	it('should have questions with required fields', () => {
		islamicQuestions.forEach((question) => {
			expect(question.id).toBeDefined();
			expect(typeof question.id).toBe('string');
			expect(question.category).toBeDefined();
			expect(typeof question.category).toBe('string');
			expect(question.question_en).toBeDefined();
			expect(typeof question.question_en).toBe('string');
			expect(question.question_ar).toBeDefined();
			expect(typeof question.question_ar).toBe('string');
			expect(['mcq', 'open', 'story']).toContain(question.format);
			expect(question.feedback_en).toBeDefined();
			expect(question.feedback_ar).toBeDefined();
			expect(question.reference).toBeDefined();
		});
	});

	it('should have unique question IDs', () => {
		const ids = islamicQuestions.map(q => q.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it('should have questions in multiple categories', () => {
		const categories = new Set(islamicQuestions.map(q => q.category));
		expect(categories.size).toBeGreaterThan(1);
		expect(categories.has('Allah')).toBe(true);
	});

	it('should have MCQ questions with options', () => {
		const mcqQuestions = islamicQuestions.filter(q => q.format === 'mcq');
		mcqQuestions.forEach((question) => {
			expect(question.options).toBeDefined();
			expect(Array.isArray(question.options)).toBe(true);
			expect(question.options!.length).toBeGreaterThan(1);
		});
	});
});