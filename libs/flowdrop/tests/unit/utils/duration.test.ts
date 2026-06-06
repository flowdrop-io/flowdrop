/**
 * Tests for duration formatting helpers.
 *
 * Tier expectations mirror the backend
 * `Drupal\flowdrop\Utility\Duration::formatMicroseconds()` so the playground
 * and the Drupal admin pages render identical values.
 */
import { describe, it, expect } from 'vitest';
import { formatMicroseconds } from '$lib/utils/duration.js';

describe('formatMicroseconds', () => {
  it('returns null for missing or invalid input', () => {
    expect(formatMicroseconds(null)).toBeNull();
    expect(formatMicroseconds(undefined)).toBeNull();
    expect(formatMicroseconds(NaN)).toBeNull();
    expect(formatMicroseconds(-1)).toBeNull();
  });

  it('formats sub-millisecond durations in µs', () => {
    expect(formatMicroseconds(0)).toBe('0µs');
    expect(formatMicroseconds(150)).toBe('150µs');
    expect(formatMicroseconds(999)).toBe('999µs');
  });

  it('formats milliseconds with tiered precision', () => {
    expect(formatMicroseconds(1000)).toBe('1ms');
    expect(formatMicroseconds(2500)).toBe('2.5ms');
    expect(formatMicroseconds(2547)).toBe('2.55ms');
    expect(formatMicroseconds(25_100)).toBe('25.1ms');
    expect(formatMicroseconds(250_000)).toBe('250ms');
    expect(formatMicroseconds(999_499)).toBe('999ms');
  });

  it('formats seconds with tiered precision', () => {
    expect(formatMicroseconds(1_230_000)).toBe('1.23s');
    expect(formatMicroseconds(9_990_000)).toBe('9.99s');
    expect(formatMicroseconds(45_000_000)).toBe('45s');
  });

  it('formats minutes and hours', () => {
    expect(formatMicroseconds(150_000_000)).toBe('2m 30s');
    expect(formatMicroseconds(120_000_000)).toBe('2m');
    expect(formatMicroseconds(5_400_000_000)).toBe('1h 30m');
    expect(formatMicroseconds(3_600_000_000)).toBe('1h');
  });
});
