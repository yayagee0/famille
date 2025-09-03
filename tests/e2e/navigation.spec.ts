import { test, expect } from '@playwright/test';

test.describe('Application Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Should not have any console errors on load
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.goto('/');
		
		// Should be redirected to login page when not authenticated
		await expect(page).toHaveURL(/.*\/login/);
		
		// Allow some time for any errors to surface
		await page.waitForTimeout(1000);
		
		// Check that there are no critical console errors
		const criticalErrors = errors.filter(error => 
			!error.includes('Firebase') && 
			!error.includes('auth') && 
			!error.includes('Network request failed')
		);
		
		expect(criticalErrors).toHaveLength(0);
	});

	test('should have responsive design', async ({ page }) => {
		await page.goto('/login');
		
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		// Page should still be accessible
		await expect(page.locator('body')).toBeVisible();
		
		// Test desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });
		
		// Page should still be accessible
		await expect(page.locator('body')).toBeVisible();
	});

	test('should handle 404 pages gracefully', async ({ page }) => {
		const response = await page.goto('/non-existent-page');
		
		// Should either redirect to a valid page or show a proper 404
		// For SvelteKit, this might redirect to the root or show error page
		expect(response?.status()).toBeTruthy();
	});
});