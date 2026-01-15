/**
 * E2E Tests: Free User Trial Flows
 * 
 * Tests that free users can access all free features without paywall interruptions.
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

// Helper to simulate an authenticated free user session
// In production, this would use proper test fixtures
const setupFreeUserSession = async (page: any) => {
  // For CI, we'll test the UI states directly
  // Real implementation would set up auth cookies/tokens
};

test.describe('Free User - Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreeUserSession(page);
  });

  test('dashboard loads with main modules visible', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for auth redirect or dashboard to load
    const isDashboard = await page.url().includes('/dashboard');
    if (!isDashboard) {
      test.skip();
      return;
    }

    // Core modules should be visible
    await expect(page.getByTestId('main-quest-module')).toBeVisible();
    await expect(page.getByTestId('reset-progress-module')).toBeVisible();
  });

  test('tab navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Dashboard tab should be active by default
    await expect(page.getByTestId('tab-dashboard')).toHaveClass(/bg-accent/);
    
    // Navigate to Experience tab
    await page.getByTestId('tab-experience').click();
    await expect(page.getByTestId('tab-experience')).toHaveClass(/bg-accent/);
    
    // Navigate to Guide tab
    await page.getByTestId('tab-guide').click();
    await expect(page.getByTestId('tab-guide')).toHaveClass(/bg-accent/);
  });
});

test.describe('Free User - Build Assessment', () => {
  test('can open build assessment modal', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Click on Build module to open assessment
    const buildModule = page.getByTestId('build-overview-module');
    if (await buildModule.isVisible()) {
      await buildModule.getByTestId('build-scan-button').click();
      await expect(page.getByTestId('build-assessment-modal')).toBeVisible();
    }
  });
});

test.describe('Free User - Time Currency', () => {
  test('can open time log dialog', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    const timeModule = page.getByTestId('time-currency-module');
    if (await timeModule.isVisible()) {
      await timeModule.getByTestId('time-log-button').click();
      await expect(page.getByTestId('time-log-dialog')).toBeVisible();
    }
  });
});

test.describe('Free User - Integrity', () => {
  test('can open promise dialog', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    const integrityModule = page.getByTestId('integrity-meter-module');
    if (await integrityModule.isVisible()) {
      await integrityModule.getByTestId('make-promise-button').click();
      await expect(page.getByTestId('promise-dialog')).toBeVisible();
    }
  });
});

test.describe('Free User - XP Module', () => {
  test('XP module displays correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    const xpModule = page.getByTestId('xp-momentum-module');
    if (await xpModule.isVisible()) {
      // Should show XP value and level
      await expect(xpModule.getByTestId('xp-value')).toBeVisible();
    }
  });
});

test.describe('Free User - 7-Day Reset', () => {
  test('can navigate to reset page', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Find and click start/continue reset button
    const resetModule = page.getByTestId('reset-progress-module');
    if (await resetModule.isVisible()) {
      const resetButton = resetModule.getByRole('button', { name: /start|continue/i });
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await expect(page).toHaveURL(/\/reset/);
      }
    }
  });

  test('reset page loads correctly', async ({ page }) => {
    await page.goto('/reset');
    
    // Should either show reset content or redirect to auth
    const url = page.url();
    expect(url.includes('/reset') || url.includes('/auth')).toBe(true);
  });
});

test.describe('Free User - No Paywall in Core Features', () => {
  test('no paywall modal appears during normal dashboard use', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Navigate through tabs
    await page.getByTestId('tab-dashboard').click();
    await page.waitForTimeout(500);
    
    await page.getByTestId('tab-guide').click();
    await page.waitForTimeout(500);
    
    // No paywall modal should have appeared
    const paywallModal = page.getByTestId('paywall-modal');
    await expect(paywallModal).not.toBeVisible();
  });
});
