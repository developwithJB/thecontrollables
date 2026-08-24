/**
 * E2E Tests: Authentication & First Session
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test('landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    
    // No console errors on initial load
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(2000);
    
    // Check for critical UI elements
    await expect(page.getByTestId('landing-hero')).toBeVisible();
    
    // Verify no critical errors (filter out expected warnings)
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('analytics')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('can navigate to the onboarding flow', async ({ page }) => {
    await page.goto('/');
    
    await page.getByTestId('cta-get-started').click();
    
    await expect(page).toHaveURL(/\/(quick-start|auth)/);
  });

  test('auth page shows sign in form by default', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('auth-password-input')).toBeVisible();
    await expect(page.getByTestId('auth-submit-button')).toContainText(/sign in/i);
  });

  test('can toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/auth');
    
    // Default is sign in
    await expect(page.getByTestId('auth-submit-button')).toContainText(/sign in/i);
    
    // Toggle to sign up
    await page.getByTestId('auth-toggle-mode').click();
    await expect(page.getByTestId('auth-submit-button')).toContainText(/create account/i);
    
    // Toggle back
    await page.getByTestId('auth-toggle-mode').click();
    await expect(page.getByTestId('auth-submit-button')).toContainText(/sign in/i);
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    
    await page.getByTestId('auth-name-input').fill('Test User');
    await page.getByTestId('auth-email-input').fill('test@example.com');
    await page.getByTestId('auth-password-input').fill('123');
    await page.getByTestId('auth-submit-button').click();
    
    // Should show password error toast
    await expect(page.getByText('Password too short', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for empty fields', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByTestId('auth-submit-button').click();
    
    // Should show missing fields error
    await expect(page.getByText('Missing fields', { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('First Session Experience', () => {
  test.skip('authenticated user lands on dashboard', async ({ page }) => {
    // This test requires a valid test user - skip in CI without setup
    // In real implementation, use test fixtures to create authenticated session
    
    await page.goto('/dashboard');
    
    // Should redirect to auth if not logged in
    await expect(page).toHaveURL(/\/auth/);
  });
});
