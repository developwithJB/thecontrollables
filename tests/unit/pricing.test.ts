/**
 * Unit tests for subscription pricing logic
 * 
 * Run with: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { 
  getPricing,
  getPriceId,
  formatPrice,
  getPlanLabel,
  PRICE_IDS,
  PRICING
} from '../../src/lib/pricing';

describe('Subscription Pricing', () => {
  describe('PRICING constants', () => {
    it('has correct monthly price', () => {
      expect(PRICING.monthly).toBe(9.99);
    });

    it('has correct yearly price', () => {
      expect(PRICING.yearly).toBe(79.99);
    });

    it('has correct yearly monthly equivalent', () => {
      expect(PRICING.yearlyMonthlyEquivalent).toBe(6.67);
    });

    it('has correct yearly savings percent', () => {
      expect(PRICING.yearlySavingsPercent).toBe(33);
    });

    it('has correct yearly savings amount', () => {
      expect(PRICING.yearlySavingsAmount).toBe(40);
    });
  });

  describe('PRICE_IDS', () => {
    it('has monthly price ID', () => {
      expect(PRICE_IDS.monthly).toBe("price_1Sty37IrFORWV7K43PkIVSJx");
    });

    it('has yearly price ID', () => {
      expect(PRICE_IDS.yearly).toBe("price_1Sty3RIrFORWV7K4lF4DZhPV");
    });
  });

  describe('getPricing', () => {
    it('returns all pricing info', () => {
      const pricing = getPricing();
      
      expect(pricing.monthly).toBe(9.99);
      expect(pricing.yearly).toBe(79.99);
      expect(pricing.yearlyMonthlyEquivalent).toBe(6.67);
      expect(pricing.yearlySavingsPercent).toBe(33);
      expect(pricing.yearlySavingsAmount).toBe(40);
    });
  });

  describe('getPriceId', () => {
    it('returns monthly price ID for monthly plan', () => {
      expect(getPriceId("monthly")).toBe(PRICE_IDS.monthly);
    });

    it('returns yearly price ID for yearly plan', () => {
      expect(getPriceId("yearly")).toBe(PRICE_IDS.yearly);
    });
  });

  describe('formatPrice', () => {
    it('formats monthly price correctly', () => {
      expect(formatPrice("monthly")).toBe("$9.99/mo");
    });

    it('formats yearly price correctly', () => {
      expect(formatPrice("yearly")).toBe("$79.99/yr");
    });
  });

  describe('getPlanLabel', () => {
    it('returns "Monthly" for monthly plan', () => {
      expect(getPlanLabel("monthly")).toBe("Monthly");
    });

    it('returns "Yearly" for yearly plan', () => {
      expect(getPlanLabel("yearly")).toBe("Yearly");
    });
  });

  describe('Pricing math validation', () => {
    it('yearly is cheaper than 12 months of monthly', () => {
      const yearlyMonthlyCost = PRICING.monthly * 12;
      expect(PRICING.yearly).toBeLessThan(yearlyMonthlyCost);
    });

    it('savings amount is approximately correct', () => {
      const yearlyMonthlyCost = PRICING.monthly * 12; // $119.88
      const actualSavings = yearlyMonthlyCost - PRICING.yearly; // ~$39.89
      // Allow small rounding difference
      expect(Math.abs(actualSavings - PRICING.yearlySavingsAmount)).toBeLessThan(1);
    });

    it('savings percent is approximately correct', () => {
      const yearlyMonthlyCost = PRICING.monthly * 12;
      const actualPercent = ((yearlyMonthlyCost - PRICING.yearly) / yearlyMonthlyCost) * 100;
      // Allow small rounding difference
      expect(Math.abs(actualPercent - PRICING.yearlySavingsPercent)).toBeLessThan(1);
    });
  });
});
