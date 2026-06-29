/**
 * General PPE / intangible depreciation & amortization schedules.
 * Premium implementation follows the exact quality bar of ifrs16:
 * - exact Money + allocate for sums-to-the-cent
 * - only kernel createBalancedEntry
 * - golden master tests
 * - citations (IAS 16 / ASC 360)
 */
export * from './schedule.js';
export * from './entries.js';
