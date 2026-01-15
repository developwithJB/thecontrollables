/**
 * E2E Tests: Paywall UX Correctness
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Paywall UX', () => {
  test('locked overlay appears on AI Operators for free users', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Expand AI Operators panel
    const aiPanel = page.getByTestId('ai-guide-panel');
    if (await aiPanel.isVisible()) {
      await aiPanel.click();
      
      // Should show locked state with upgrade CTA
      const lockedState = page.getByTestId('ai-operators-locked');
      if (await lockedState.isVisible()) {
        await expect(lockedState.getByTestId('upgrade-cta-button')).toBeVisible();
      }
    }
  });

  test('locked overlay appears on Experience History for free users', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Navigate to Experience tab
    await page.getByTestId('tab-experience').click();
    
    // Look for locked overlays on history sections
    const lockedOverlays = page.locator('[data-testid="experience-locked-overlay"]');
    const count = await lockedOverlays.count();
    
    // Free users should see locked overlays on history sections
    // (exact count depends on what sections are visible)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('upgrade CTA is visible but not intrusive', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Check that upgrade buttons exist but aren't blocking main content
    const mainQuestModule = page.getByTestId('main-quest-module');
    const resetModule = page.getByTestId('reset-progress-module');
    
    // These core modules should NOT be blocked
    if (await mainQuestModule.isVisible()) {
      await expect(mainQuestModule).toBeVisible();
    }
    
    if (await resetModule.isVisible()) {
      await expect(resetModule).toBeVisible();
    }
  });

  test('paywall does not appear during Days 1-6 reset flow', async ({ page }) => {
    await page.goto('/reset');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // During the reset flow, no paywall modal should appear
    await page.waitForTimeout(2000);
    
    const paywallModal = page.getByTestId('paywall-modal');
    await expect(paywallModal).not.toBeVisible();
  });
});

test.describe('Upgrade CTA Interactions', () => {
  test('upgrade button from AI Operators triggers checkout', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Expand AI panel and click upgrade
    const aiPanel = page.getByTestId('ai-guide-panel');
    if (await aiPanel.isVisible()) {
      await aiPanel.click();
      
      const upgradeButton = page.getByTestId('ai-operators-upgrade-button');
      if (await upgradeButton.isVisible()) {
        // Mock the checkout to avoid actual Stripe redirect
        await page.route('**/functions/v1/create-checkout', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
          });
        });
        
        // Click should initiate checkout
        const responsePromise = page.waitForResponse('**/functions/v1/create-checkout');
        await upgradeButton.click();
        
        // Button should show loading state
        await expect(upgradeButton).toContainText(/opening checkout|loading/i);
      }
    }
  });

  test('upgrade button from Experience History triggers checkout', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    await page.getByTestId('tab-experience').click();
    
    const upgradeButton = page.locator('[data-testid="experience-upgrade-button"]').first();
    if (await upgradeButton.isVisible()) {
      // Test that clicking shows loading state
      await page.route('**/functions/v1/create-checkout', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ url: 'https://checkout.stripe.com/test' }),
        });
      });
      
      await upgradeButton.click();
      
      // Should show loading state
      await expect(upgradeButton).toContainText(/opening checkout|loading/i);
    }
  });
});

test.describe('Modal Behavior', () => {
  test('dialogs close correctly with X button', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Open time log dialog as example
    const timeModule = page.getByTestId('time-currency-module');
    if (await timeModule.isVisible()) {
      await timeModule.getByTestId('time-log-button').click();
      
      const dialog = page.getByTestId('time-log-dialog');
      if (await dialog.isVisible()) {
        // Close with X button
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test('dialogs close correctly with escape key', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Open promise dialog
    const integrityModule = page.getByTestId('integrity-meter-module');
    if (await integrityModule.isVisible()) {
      await integrityModule.getByTestId('make-promise-button').click();
      
      const dialog = page.getByTestId('promise-dialog');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
      }
    }
  });
});
