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
