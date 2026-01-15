/**
 * Unit tests for pricing logic
 * 
 * Run with: npm run test:unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getCurrentDate, 
  setClockOverride, 
  isLaunchPeriod, 
  getPricing,
  getCurrentPriceId,
  PRICE_IDS
} from '../../src/lib/pricing';

describe('Pricing Logic', () => {
  const LAUNCH_END = new Date('2025-03-01T00:00:00Z');
  
  afterEach(() => {
    // Always reset clock after each test
    setClockOverride(null);
  });

  describe('isLaunchPeriod', () => {
    it('returns true when current date is before launch end', () => {
      setClockOverride(new Date('2025-01-15T12:00:00Z'));
      expect(isLaunchPeriod(LAUNCH_END)).toBe(true);
    });

    it('returns true on the last day before launch end', () => {
      setClockOverride(new Date('2025-02-28T23:59:59Z'));
      expect(isLaunchPeriod(LAUNCH_END)).toBe(true);
    });

    it('returns false exactly at launch end', () => {
      setClockOverride(new Date('2025-03-01T00:00:00Z'));
      expect(isLaunchPeriod(LAUNCH_END)).toBe(false);
    });

    it('returns false after launch end', () => {
      setClockOverride(new Date('2025-03-15T12:00:00Z'));
      expect(isLaunchPeriod(LAUNCH_END)).toBe(false);
    });

    it('returns false long after launch end', () => {
      setClockOverride(new Date('2026-01-01T00:00:00Z'));
      expect(isLaunchPeriod(LAUNCH_END)).toBe(false);
    });
  });

  describe('getPricing', () => {
    it('returns $29 during launch period', () => {
      setClockOverride(new Date('2025-01-15T12:00:00Z'));
      const pricing = getPricing(LAUNCH_END);
      
      expect(pricing.amount).toBe(29);
      expect(pricing.isLaunchPeriod).toBe(true);
      expect(pricing.launchAmount).toBe(29);
      expect(pricing.regularAmount).toBe(49);
    });

    it('returns $49 after launch period', () => {
      setClockOverride(new Date('2025-04-01T12:00:00Z'));
      const pricing = getPricing(LAUNCH_END);
      
      expect(pricing.amount).toBe(49);
      expect(pricing.isLaunchPeriod).toBe(false);
    });

    it('returns correct launch end date', () => {
      const pricing = getPricing(LAUNCH_END);
      expect(pricing.launchEndDate).toEqual(LAUNCH_END);
    });
  });

  describe('getCurrentPriceId', () => {
    it('returns launch price ID during launch period', () => {
      setClockOverride(new Date('2025-01-15T12:00:00Z'));
      expect(getCurrentPriceId(LAUNCH_END)).toBe(PRICE_IDS.launch);
    });

    it('returns regular price ID after launch period', () => {
      setClockOverride(new Date('2025-04-01T12:00:00Z'));
      expect(getCurrentPriceId(LAUNCH_END)).toBe(PRICE_IDS.regular);
    });
  });

  describe('Clock Override', () => {
    it('uses real date when no override set', () => {
      setClockOverride(null);
      const now = getCurrentDate();
      const realNow = new Date();
      
      // Should be within 1 second of real time
      expect(Math.abs(now.getTime() - realNow.getTime())).toBeLessThan(1000);
    });

    it('uses override date when set', () => {
      const testDate = new Date('2024-06-15T10:30:00Z');
      setClockOverride(testDate);
      
      expect(getCurrentDate()).toEqual(testDate);
    });

    it('can reset override to null', () => {
      setClockOverride(new Date('2020-01-01'));
      setClockOverride(null);
      
      const now = getCurrentDate();
      expect(now.getFullYear()).toBeGreaterThanOrEqual(2024);
    });
  });
});
