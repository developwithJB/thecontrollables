/**
 * Pricing configuration with testable clock override
 * 
 * This module provides the pricing logic with the ability to override
 * the current date for testing purposes.
 */

// Default launch end date - $29 until March 1, 2026, then $49
const DEFAULT_LAUNCH_END_DATE = new Date("2026-03-01T00:00:00Z");

// Clock override for testing - only set in test environment
let clockOverride: Date | null = null;

/**
 * Get the current date (uses override if set for testing)
 */
export const getCurrentDate = (): Date => {
  return clockOverride || new Date();
};

/**
 * Set a clock override for testing purposes
 * @param date - The date to use as "now", or null to reset
 */
export const setClockOverride = (date: Date | null): void => {
  clockOverride = date;
};

/**
 * Check if we're currently in the launch pricing period
 */
export const isLaunchPeriod = (launchEndDate: Date = DEFAULT_LAUNCH_END_DATE): boolean => {
  return getCurrentDate() < launchEndDate;
};

/**
 * Get the current pricing based on whether we're in launch period
 */
export const getPricing = (launchEndDate: Date = DEFAULT_LAUNCH_END_DATE) => ({
  amount: isLaunchPeriod(launchEndDate) ? 29 : 49,
  launchAmount: 29,
  regularAmount: 49,
  isLaunchPeriod: isLaunchPeriod(launchEndDate),
  launchEndDate,
});

/**
 * Check if launch price is currently active
 */
export const isLaunchPriceActive = (): boolean => {
  return isLaunchPeriod();
};

/**
 * Get the number of days until launch price ends
 */
export const getDaysUntilLaunchEnd = (launchEndDate: Date = DEFAULT_LAUNCH_END_DATE): number => {
  const now = getCurrentDate();
  const diff = launchEndDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Stripe price IDs (Production)
 */
export const PRICE_IDS = {
  launch: "price_1Ss8UWIrFORWV7K41FKh4zVY", // $29.99
  regular: "price_1Ss8XUIrFORWV7K4M9uAE2kY", // $49.99
} as const;

/**
 * Get the appropriate price ID based on current date
 */
export const getCurrentPriceId = (launchEndDate: Date = DEFAULT_LAUNCH_END_DATE): string => {
  return isLaunchPeriod(launchEndDate) ? PRICE_IDS.launch : PRICE_IDS.regular;
};
