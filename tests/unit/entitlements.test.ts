/**
 * Unit tests for entitlement gating logic
 * 
 * Run with: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import {
  PAID_FEATURES,
  FREE_FEATURES,
  isFeatureLocked,
  canAccessFeature,
  getLockedFeatures,
  isValidEntitlement,
  type PaidFeature,
  type FreeFeature,
} from '../../src/lib/entitlements';

describe('Entitlement Gating Logic', () => {
  describe('PAID_FEATURES', () => {
    it('includes AI companions', () => {
      expect(PAID_FEATURES.aiCompanions).toBe(true);
    });

    it('includes progress history', () => {
      expect(PAID_FEATURES.progressHistory).toBe(true);
    });

    it('includes badges earned', () => {
      expect(PAID_FEATURES.badgesEarned).toBe(true);
    });

    it('includes momentum decay', () => {
      expect(PAID_FEATURES.momentumDecay).toBe(true);
    });

    it('includes reset history', () => {
      expect(PAID_FEATURES.resetHistory).toBe(true);
    });

    it('includes certificate download', () => {
      expect(PAID_FEATURES.certificateDownload).toBe(true);
    });

    it('includes multiple resets', () => {
      expect(PAID_FEATURES.multipleResets).toBe(true);
    });
  });

  describe('FREE_FEATURES', () => {
    it('includes 7-day reset', () => {
      expect(FREE_FEATURES.sevenDayReset).toBe(true);
    });

    it('includes build assessment', () => {
      expect(FREE_FEATURES.buildAssessment).toBe(true);
    });

    it('includes XP tracking', () => {
      expect(FREE_FEATURES.xpTracking).toBe(true);
    });

    it('includes time currency', () => {
      expect(FREE_FEATURES.timeCurrency).toBe(true);
    });

    it('includes integrity meter', () => {
      expect(FREE_FEATURES.integrityMeter).toBe(true);
    });
  });

  describe('isFeatureLocked', () => {
    const paidFeatures: PaidFeature[] = [
      'progressHistory',
      'resetHistory', 
      'badgesEarned',
      'momentumDecay',
      'aiCompanions',
      'certificateDownload',
      'multipleResets',
    ];

    paidFeatures.forEach(feature => {
      it(`locks ${feature} for free users`, () => {
        expect(isFeatureLocked(feature, false)).toBe(true);
      });

      it(`unlocks ${feature} for paid users`, () => {
        expect(isFeatureLocked(feature, true)).toBe(false);
      });
    });
  });

  describe('canAccessFeature', () => {
    // Free features accessible to all
    const freeFeatures: FreeFeature[] = [
      'sevenDayReset',
      'buildAssessment',
      'xpTracking',
      'timeCurrency',
      'integrityMeter',
    ];

    freeFeatures.forEach(feature => {
      it(`allows free users to access ${feature}`, () => {
        expect(canAccessFeature(feature, false)).toBe(true);
      });

      it(`allows paid users to access ${feature}`, () => {
        expect(canAccessFeature(feature, true)).toBe(true);
      });
    });

    // Paid features only for paid users
    const paidFeatures: PaidFeature[] = [
      'progressHistory',
      'aiCompanions',
    ];

    paidFeatures.forEach(feature => {
      it(`blocks free users from ${feature}`, () => {
        expect(canAccessFeature(feature, false)).toBe(false);
      });

      it(`allows paid users to access ${feature}`, () => {
        expect(canAccessFeature(feature, true)).toBe(true);
      });
    });
  });

  describe('getLockedFeatures', () => {
    it('returns all paid features for free users', () => {
      const locked = getLockedFeatures(false);
      expect(locked).toContain('aiCompanions');
      expect(locked).toContain('progressHistory');
      expect(locked).toContain('badgesEarned');
      expect(locked).toContain('momentumDecay');
      expect(locked).toContain('resetHistory');
      expect(locked).toContain('certificateDownload');
      expect(locked).toContain('multipleResets');
      expect(locked.length).toBe(7);
    });

    it('returns empty array for paid users', () => {
      const locked = getLockedFeatures(true);
      expect(locked).toEqual([]);
    });
  });

  describe('isValidEntitlement', () => {
    it('returns true for valid entitlement with purchasedAt', () => {
      expect(isValidEntitlement({
        isPaid: true,
        purchasedAt: '2025-01-15T12:00:00Z',
      })).toBe(true);
    });

    it('returns true for valid entitlement with null purchasedAt', () => {
      expect(isValidEntitlement({
        isPaid: false,
        purchasedAt: null,
      })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidEntitlement(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidEntitlement(undefined)).toBe(false);
    });

    it('returns false for missing isPaid', () => {
      expect(isValidEntitlement({
        purchasedAt: null,
      })).toBe(false);
    });

    it('returns false for wrong isPaid type', () => {
      expect(isValidEntitlement({
        isPaid: 'true',
        purchasedAt: null,
      })).toBe(false);
    });

    it('returns false for wrong purchasedAt type', () => {
      expect(isValidEntitlement({
        isPaid: true,
        purchasedAt: 12345,
      })).toBe(false);
    });
  });
});

describe('Gating Rules - Business Logic', () => {
  describe('Free User Capabilities', () => {
    const isPaid = false;

    it('can complete 7-Day Reset without paywall', () => {
      expect(canAccessFeature('sevenDayReset', isPaid)).toBe(true);
    });

    it('can use Build assessment', () => {
      expect(canAccessFeature('buildAssessment', isPaid)).toBe(true);
    });

    it('can track XP', () => {
      expect(canAccessFeature('xpTracking', isPaid)).toBe(true);
    });

    it('can log Time Currency', () => {
      expect(canAccessFeature('timeCurrency', isPaid)).toBe(true);
    });

    it('can use Integrity Meter', () => {
      expect(canAccessFeature('integrityMeter', isPaid)).toBe(true);
    });

    it('cannot access AI Companions', () => {
      expect(canAccessFeature('aiCompanions', isPaid)).toBe(false);
    });

    it('cannot download certificates', () => {
      expect(canAccessFeature('certificateDownload', isPaid)).toBe(false);
    });

    it('cannot access full Experience History', () => {
      expect(canAccessFeature('progressHistory', isPaid)).toBe(false);
      expect(canAccessFeature('badgesEarned', isPaid)).toBe(false);
      expect(canAccessFeature('momentumDecay', isPaid)).toBe(false);
    });
  });

  describe('Paid User Capabilities', () => {
    const isPaid = true;

    it('can access all free features', () => {
      expect(canAccessFeature('sevenDayReset', isPaid)).toBe(true);
      expect(canAccessFeature('buildAssessment', isPaid)).toBe(true);
      expect(canAccessFeature('xpTracking', isPaid)).toBe(true);
    });

    it('can access AI Companions', () => {
      expect(canAccessFeature('aiCompanions', isPaid)).toBe(true);
    });

    it('can access full Experience History', () => {
      expect(canAccessFeature('progressHistory', isPaid)).toBe(true);
      expect(canAccessFeature('badgesEarned', isPaid)).toBe(true);
      expect(canAccessFeature('momentumDecay', isPaid)).toBe(true);
    });

    it('can download certificates', () => {
      expect(canAccessFeature('certificateDownload', isPaid)).toBe(true);
    });
  });
});
