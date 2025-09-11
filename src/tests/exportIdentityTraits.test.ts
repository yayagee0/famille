import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import the export function
import { exportIdentityTraits } from '../../scripts/exportIdentityTraits.js';

describe('exportIdentityTraits', () => {
	const outputFile = path.join(process.cwd(), 'identity-traits.md');

	// Clean up after each test
	afterEach(() => {
		if (fs.existsSync(outputFile)) {
			fs.unlinkSync(outputFile);
		}
	});

	it('should create identity-traits.md file', async () => {
		await exportIdentityTraits();
		
		expect(fs.existsSync(outputFile)).toBe(true);
	});

	it('should generate correct markdown format', async () => {
		await exportIdentityTraits();
		
		const content = fs.readFileSync(outputFile, 'utf-8');
		
		// Check header
		expect(content).toContain('# Family Hub – User Identity Traits');
		
		// Check user sections
		expect(content).toContain('## User: G');
		expect(content).toContain('## User: yazid');
	});

	it('should have exactly 40 traits per user', async () => {
		await exportIdentityTraits();
		
		const content = fs.readFileSync(outputFile, 'utf-8');
		const lines = content.split('\n');
		
		// Count numbered lines (should be 80 total: 40 per user × 2 users)
		const numberedLines = lines.filter(line => /^\d+\./.test(line));
		expect(numberedLines.length).toBe(80);
		
		// Check first user has 40 traits
		const gSection = content.split('## User: G')[1].split('## User:')[0];
		const gTraits = gSection.split('\n').filter(line => /^\d+\./.test(line));
		expect(gTraits.length).toBe(40);
		
		// Check second user has 40 traits  
		const yazidSection = content.split('## User: yazid')[1];
		const yazidTraits = yazidSection.split('\n').filter(line => /^\d+\./.test(line));
		expect(yazidTraits.length).toBe(40);
	});

	it('should have valid trait content', async () => {
		await exportIdentityTraits();
		
		const content = fs.readFileSync(outputFile, 'utf-8');
		
		// Each numbered line should have meaningful content
		const lines = content.split('\n');
		const numberedLines = lines.filter(line => /^\d+\./.test(line));
		
		numberedLines.forEach(line => {
			// Should have more than just the number
			expect(line.length).toBeGreaterThan(5);
			// Should contain actual trait text
			expect(line).toMatch(/^\d+\.\s+.+/);
		});
	});

	it('should use correct display names', async () => {
		await exportIdentityTraits();
		
		const content = fs.readFileSync(outputFile, 'utf-8');
		
		// Check that display names are used correctly
		expect(content).toContain('## User: G'); // Uses nickname
		expect(content).toContain('## User: yazid'); // Uses email local part
	});

	it('should handle file writing gracefully', async () => {
		// Should not throw errors
		await expect(exportIdentityTraits()).resolves.not.toThrow();
		
		// File should exist and be readable
		expect(fs.existsSync(outputFile)).toBe(true);
		const stats = fs.statSync(outputFile);
		expect(stats.size).toBeGreaterThan(0);
	});
});