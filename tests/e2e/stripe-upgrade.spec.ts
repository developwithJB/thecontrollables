/**
 * E2E Tests: Stripe Upgrade Flows
 * 
 * Tests checkout initiation and post-payment handling.
 * Uses mocked Stripe responses in test mode.
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('checkout creates session and attempts redirect', async ({ page }) => {
    // Mock the checkout endpoint
    await page.route('**/functions/v1/create-checkout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          url: 'https://checkout.stripe.com/c/pay/test_session_123' 
        }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Find and click an upgrade button
    const upgradeButton = page.locator('[data-testid*="upgrade"]').first();
    if (await upgradeButton.isVisible()) {
      // Listen for navigation (checkout redirect)
      const navigationPromise = page.waitForURL('**/checkout.stripe.com/**', { 
        timeout: 5000 
      }).catch(() => null);
      
      await upgradeButton.click();
      
      // Either navigated or button shows loading
      const navigated = await navigationPromise;
      if (!navigated) {
        await expect(upgradeButton).toContainText(/opening|loading/i);
      }
    }
  });

  test('checkout handles already-paid user gracefully', async ({ page }) => {
    // Mock checkout returning "already purchased" error
    await page.route('**/functions/v1/create-checkout', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'You already have Full Access!' 
        }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    const upgradeButton = page.locator('[data-testid*="upgrade"]').first();
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      
      // Should show info message, not error
      await expect(page.getByText(/already have full access/i)).toBeVisible({ 
        timeout: 5000 
      });
    }
  });
});

test.describe('Payment Success Handling', () => {
  test('payment=success URL param shows success toast', async ({ page }) => {
    // Mock check-payment to return paid status
    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isPaid: true,
          purchasedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/dashboard?payment=success');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Should show success toast
    await expect(page.getByText(/welcome to full access/i)).toBeVisible({ 
      timeout: 5000 
    });
    
    // URL should be cleaned up
    await expect(page).not.toHaveURL(/payment=success/);
  });

  test('payment=canceled URL param shows info toast', async ({ page }) => {
    await page.goto('/dashboard?payment=canceled');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Should show canceled message
    await expect(page.getByText(/payment canceled|no worries/i)).toBeVisible({ 
      timeout: 5000 
    });
    
    // URL should be cleaned up
    await expect(page).not.toHaveURL(/payment=canceled/);
  });
});

test.describe('Paid User Unlocks', () => {
  test.beforeEach(async ({ page }) => {
    // Mock check-payment to return paid status
    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isPaid: true,
          purchasedAt: '2025-01-15T12:00:00Z',
        }),
      });
    });
  });

  test('AI Operators unlocked for paid user', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Expand AI panel
    const aiPanel = page.getByTestId('ai-guide-panel');
    if (await aiPanel.isVisible()) {
      await aiPanel.click();
      
      // Should NOT show locked state
      const lockedState = page.getByTestId('ai-operators-locked');
      await expect(lockedState).not.toBeVisible();
      
      // Should show chat input
      await expect(page.getByTestId('ai-chat-input')).toBeVisible();
    }
  });

  test('Experience History unlocked for paid user', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await page.getByTestId('tab-experience').click();
    
    // Locked overlays should NOT be visible
    const lockedOverlays = page.locator('[data-testid="experience-locked-overlay"]');
    await expect(lockedOverlays).not.toBeVisible();
  });
});

test.describe('Post-Payment State Persistence', () => {
  test('paid status persists after page refresh', async ({ page }) => {
    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isPaid: true, purchasedAt: '2025-01-15' }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Verify unlocked state
    await page.getByTestId('tab-experience').click();
    const lockedOverlay = page.locator('[data-testid="experience-locked-overlay"]').first();
    await expect(lockedOverlay).not.toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should still be unlocked
    await page.getByTestId('tab-experience').click();
    await expect(lockedOverlay).not.toBeVisible();
  });
});
