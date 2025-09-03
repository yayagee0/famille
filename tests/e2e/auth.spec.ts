import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should redirect unauthenticated users to login page', async ({ page }) => {
		// Should be redirected to login page when not authenticated
		await expect(page).toHaveURL(/.*\/login/);
	});

	test('should display login page elements', async ({ page }) => {
		await page.goto('/login');
		
		// Check for Google OAuth button or login elements
		await expect(page.locator('text=Sign in')).toBeVisible();
		
		// The page should have Family Hub branding
		await expect(page.getByRole('heading', { name: 'Welcome to Family Hub' })).toBeVisible();
	});

	test('should have proper page title and meta tags', async ({ page }) => {
		await page.goto('/login');
		
		// Check page title
		await expect(page).toHaveTitle(/Family Hub/);
		
		// Check viewport meta tag is present (responsive design)
		const viewportMeta = page.locator('meta[name="viewport"]');
		await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
	});
});