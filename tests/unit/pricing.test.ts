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
    it('has correct Plus annual price', () => {
      expect(PRICING.plus.annual).toBe(79.99);
    });

    it('has correct Pro annual price', () => {
      expect(PRICING.pro.annual).toBe(119.99);
    });

    it('has correct Plus monthly equivalent', () => {
      expect(PRICING.plus.monthlyEquivalent).toBe(6.67);
    });

    it('has correct Pro monthly equivalent', () => {
      expect(PRICING.pro.monthlyEquivalent).toBe(9.99);
    });
  });

  describe('PRICE_IDS', () => {
    it('has Plus price ID', () => {
      expect(PRICE_IDS.plus).toBe("price_1Sty3RIrFORWV7K4lF4DZhPV");
    });

    it('has Pro price ID', () => {
      expect(PRICE_IDS.pro).toBe("price_1Sty37IrFORWV7K43PkIVSJx");
    });
  });

  describe('getPricing', () => {
    it('returns all pricing info', () => {
      const pricing = getPricing();
      
      expect(pricing.plus.annual).toBe(79.99);
      expect(pricing.plus.monthlyEquivalent).toBe(6.67);
      expect(pricing.pro.annual).toBe(119.99);
      expect(pricing.pro.monthlyEquivalent).toBe(9.99);
    });
  });

  describe('getPriceId', () => {
    it('returns Plus price ID', () => {
      expect(getPriceId("plus")).toBe(PRICE_IDS.plus);
    });

    it('returns Pro price ID', () => {
      expect(getPriceId("pro")).toBe(PRICE_IDS.pro);
    });
  });

  describe('formatPrice', () => {
    it('formats Plus price correctly', () => {
      expect(formatPrice("plus")).toBe("$79.99/yr");
    });

    it('formats Pro price correctly', () => {
      expect(formatPrice("pro")).toBe("$119.99/yr");
    });
  });

  describe('getPlanLabel', () => {
    it('returns "Plus" for plus plan', () => {
      expect(getPlanLabel("plus")).toBe("Plus");
    });

    it('returns "Pro" for pro plan', () => {
      expect(getPlanLabel("pro")).toBe("Pro");
    });
  });

  describe('Pricing math validation', () => {
    it('Plus monthly equivalent matches annual price', () => {
      expect(Math.abs(PRICING.plus.monthlyEquivalent * 12 - PRICING.plus.annual)).toBeLessThan(0.1);
    });

    it('Pro monthly equivalent matches annual price', () => {
      expect(Math.abs(PRICING.pro.monthlyEquivalent * 12 - PRICING.pro.annual)).toBeLessThan(0.2);
    });
  });
});
