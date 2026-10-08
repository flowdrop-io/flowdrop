/**
 * Duration formatting helpers.
 *
 * Mirrors the backend `Drupal\flowdrop\Utility\Duration::formatMicroseconds()`
 * tiers so the playground and the Drupal admin pages render identical values.
 */

/**
 * Formats a duration in human-readable form from microseconds.
 *
 * Examples: `150µs`, `2.5ms`, `25.1ms`, `250ms`, `1.23s`, `45s`,
 * `2m 30s`, `1h 30m`.
 */
export function formatMicroseconds(microseconds: number | null | undefined): string | null {
  if (microseconds == null || !Number.isFinite(microseconds) || microseconds < 0) return null;

  const us = Math.round(microseconds);
  if (us < 1000) {
    return `${us}µs`;
  }
  if (us < 1_000_000) {
    const ms = us / 1000;
    if (us < 100_000) {
      // 2 decimals below 10ms, 1 decimal below 100ms — matches PHP round().
      const decimals = us < 10_000 ? 2 : 1;
      // Drop trailing zeros the way PHP round() renders (2.50 → 2.5, 3.00 → 3).
      return `${parseFloat(ms.toFixed(decimals))}ms`;
    }
    return `${Math.round(ms)}ms`;
  }
  if (us < 10_000_000) {
    return `${parseFloat((us / 1_000_000).toFixed(2))}s`;
  }
  if (us < 60_000_000) {
    return `${Math.floor(us / 1_000_000)}s`;
  }
  const totalSeconds = Math.floor(us / 1_000_000);
  if (us < 3_600_000_000) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Parses a duration string as produced by {@link formatMicroseconds}
 * (`150µs`, `2.5ms`, `1.23s`, `2m 30s`, `1h 30m`) into milliseconds.
 * Returns null when the text holds no duration.
 */
export function parseDurationMs(text: string | null | undefined): number | null {
  if (!text) return null;
  const unitMs: Record<string, number> = {
    µs: 0.001,
    μs: 0.001,
    us: 0.001,
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000
  };
  let total = 0;
  let found = false;
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(µs|μs|us|ms|s|m|h)(?![a-z])/gi)) {
    total += parseFloat(match[1]) * unitMs[match[2].toLowerCase()];
    found = true;
  }
  return found ? total : null;
}

/**
 * Step duration for the Playground's steps table, from milliseconds: one
 * decimal under 10 ms (`0.8 ms`), whole milliseconds up to a second
 * (`42 ms`), seconds with one decimal from a second on (`1.2 s`).
 * Returns null for a missing or invalid value.
 */
export function formatStepDuration(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 10) return `${(Math.round(ms * 10) / 10).toFixed(1)} ms`;
  if (ms < 999.5) return `${Math.round(ms)} ms`;
  return `${(Math.round(ms / 100) / 10).toFixed(1)} s`;
}
