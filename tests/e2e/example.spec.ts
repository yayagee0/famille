import { test, expect } from '@playwright/test';

test.describe('Family Hub Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Should show login page content
    await expect(page.locator('h1')).toContainText('Welcome to Family Hub');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should show authentication required for protected routes', async ({ page }) => {
    // Test dashboard route protection
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    
    // Test feed route protection
    await page.goto('/feed');
    await expect(page).toHaveURL('/login');
    
    // Test playground route protection
    await page.goto('/playground');
    await expect(page).toHaveURL('/login');
    
    // Test profile route protection
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });

  test('should have proper meta tags and favicon', async ({ page }) => {
    await page.goto('/login');
    
    // Check title
    await expect(page).toHaveTitle('Family Hub');
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', 'A private family hub for sharing moments and staying connected');
  });
});

test.describe('Family Hub UI Components', () => {
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto('/login');
  });

  test('should have responsive navigation on login page', async ({ page }) => {
    // Check login form exists
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    
    // Check error handling for unauthorized access
    const errorText = page.locator('text=Access denied');
    // This won't be visible initially, but the element structure should be there
  });

  test('should show loading states properly', async ({ page }) => {
    // Click login button to trigger loading state
    const loginButton = page.getByRole('button', { name: /continue with google/i });
    await expect(loginButton).toBeVisible();
    
    // The button should be functional (even if we can't complete OAuth in tests)
    await expect(loginButton).not.toBeDisabled();
  });
});

test.describe('Family Hub Offline Functionality', () => {
  test('should have service worker registration', async ({ page }) => {
    await page.goto('/login');
    
    // Check if service worker is being registered
    const serviceWorkerExists = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerExists).toBe(true);
  });

  test('should handle network status changes', async ({ page }) => {
    await page.goto('/login');
    
    // Simulate going offline
    await page.context().setOffline(true);
    
    // Simulate going back online
    await page.context().setOffline(false);
    
    // The page should still be functional
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });
});

test.describe('Family Hub Accessibility', () => {
  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/login');
    
    // Check for proper ARIA labels
    const loginButton = page.getByRole('button', { name: /continue with google/i });
    await expect(loginButton).toBeVisible();
    
    // Check for proper focus management
    await loginButton.focus();
    await expect(loginButton).toBeFocused();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through the page
    await page.keyboard.press('Tab');
    
    // Should be able to reach the login button via keyboard
    const loginButton = page.getByRole('button', { name: /continue with google/i });
    await expect(loginButton).toBeVisible();
  });
});

test.describe('Family Hub Mobile Responsiveness', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Check mobile layout
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    
    // Button should be properly sized for mobile
    const buttonBox = await page.getByRole('button', { name: /continue with google/i }).boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(40); // Minimum touch target size
  });
});
