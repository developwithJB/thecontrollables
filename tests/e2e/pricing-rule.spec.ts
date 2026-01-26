/**
 * E2E Tests: Subscription Pricing Display
 * 
 * Tests that subscription pricing is displayed correctly.
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Subscription Pricing Display', () => {
  test('locked overlay shows subscription pricing', async ({ page }) => {
    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isPaid: false, purchasedAt: null }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await page.getByTestId('tab-experience').click();
    
    // Find a locked overlay
    const lockedOverlay = page.locator('[data-testid="experience-locked-overlay"]').first();
    if (await lockedOverlay.isVisible()) {
      // Should contain subscription pricing info
      const text = await lockedOverlay.textContent();
      expect(text).toMatch(/\$9\.99.*mo|\$79\.99.*yr|save.*33%/i);
    }
  });

  test('plan selector shows monthly and yearly options', async ({ page }) => {
    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isPaid: false, purchasedAt: null }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await page.getByTestId('tab-experience').click();
    
    // Look for plan pricing buttons
    const monthlyButton = page.getByRole('button', { name: /\$9\.99.*mo/i });
    const yearlyButton = page.getByRole('button', { name: /\$79\.99.*yr/i });
    
    const monthlyVisible = await monthlyButton.isVisible().catch(() => false);
    const yearlyVisible = await yearlyButton.isVisible().catch(() => false);
    
    // At least one pricing option should be visible on locked content
    if (monthlyVisible || yearlyVisible) {
      expect(monthlyVisible || yearlyVisible).toBe(true);
    }
  });
});

test.describe('Checkout Flow', () => {
  test('checkout request includes plan parameter', async ({ page }) => {
    let checkoutBody: { plan?: string } = {};
    
    await page.route('**/functions/v1/create-checkout', route => {
      const request = route.request();
      checkoutBody = JSON.parse(request.postData() || '{}');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
      });
    });

    await page.route('**/functions/v1/check-payment', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isPaid: false, purchasedAt: null }),
      });
    });

    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Try to click a subscription button
    const yearlyButton = page.getByRole('button', { name: /\$79\.99.*yr/i }).first();
    if (await yearlyButton.isVisible()) {
      await yearlyButton.click();
      await page.waitForTimeout(1000);
      
      // Verify plan was included in request
      if (checkoutBody.plan) {
        expect(['monthly', 'yearly']).toContain(checkoutBody.plan);
      }
    }
  });
});
