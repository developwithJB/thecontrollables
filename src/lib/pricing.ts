/**
 * Pricing configuration with testable clock override
 * 
 * This module provides the pricing logic with the ability to override
 * the current date for testing purposes.
 */

// Default launch end date
const DEFAULT_LAUNCH_END_DATE = new Date("2025-03-01T00:00:00Z");

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
 * Stripe price IDs
 */
export const PRICE_IDS = {
  launch: "price_1SpvHDIMSETiQTDGpCxLkNtR", // $29
  regular: "price_regular_TODO", // $49 - to be created after launch
} as const;

/**
 * Get the appropriate price ID based on current date
 */
export const getCurrentPriceId = (launchEndDate: Date = DEFAULT_LAUNCH_END_DATE): string => {
  return isLaunchPeriod(launchEndDate) ? PRICE_IDS.launch : PRICE_IDS.regular;
};
