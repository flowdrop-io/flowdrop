/**
 * Tests for duration formatting helpers.
 *
 * Tier expectations mirror the backend
 * `Drupal\flowdrop\Utility\Duration::formatMicroseconds()` so the playground
 * and the Drupal admin pages render identical values.
 */
import { describe, it, expect } from 'vitest';
import { formatMicroseconds, formatStepDuration, parseDurationMs } from '$lib/utils/duration.js';

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

describe('parseDurationMs', () => {
  it('reads the backend duration tiers into milliseconds', () => {
    expect(parseDurationMs('150µs')).toBeCloseTo(0.15);
    expect(parseDurationMs('2.5ms')).toBe(2.5);
    expect(parseDurationMs('1.23s')).toBeCloseTo(1230);
    expect(parseDurationMs('2m 30s')).toBe(150_000);
    expect(parseDurationMs('1h 30m')).toBe(5_400_000);
  });

  it('returns null when there is no duration', () => {
    expect(parseDurationMs('')).toBeNull();
    expect(parseDurationMs(undefined)).toBeNull();
    expect(parseDurationMs('boom')).toBeNull();
  });
});

describe('formatStepDuration', () => {
  it('uses one decimal under 10 ms', () => {
    expect(formatStepDuration(0)).toBe('0.0 ms');
    expect(formatStepDuration(0.15)).toBe('0.2 ms');
    expect(formatStepDuration(0.8)).toBe('0.8 ms');
    expect(formatStepDuration(9.94)).toBe('9.9 ms');
  });

  it('uses whole milliseconds up to a second', () => {
    expect(formatStepDuration(10)).toBe('10 ms');
    expect(formatStepDuration(42.4)).toBe('42 ms');
    expect(formatStepDuration(998)).toBe('998 ms');
  });

  it('uses seconds with one decimal from a second on', () => {
    expect(formatStepDuration(999.6)).toBe('1.0 s');
    expect(formatStepDuration(1234)).toBe('1.2 s');
    expect(formatStepDuration(65_000)).toBe('65.0 s');
  });

  it('is null for a missing or invalid value', () => {
    expect(formatStepDuration(null)).toBeNull();
    expect(formatStepDuration(-1)).toBeNull();
    expect(formatStepDuration(Number.NaN)).toBeNull();
  });
});
