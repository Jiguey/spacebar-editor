/**
 * Compact numeric formatters for the chat footer and stream-metrics labels.
 * Pure helpers with no store/reactive dependencies.
 */

/** Format a token count as a short human string, e.g. 1234 -> "1.2k", 2_500_000 -> "2.5M". */
export function formatTok(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Format a tokens-per-second rate with resolution that scales down as the number grows. */
export function formatTokRate(r: number): string {
  if (r >= 100) return String(Math.round(r));
  if (r >= 10) return r.toFixed(1);
  return r.toFixed(2);
}

/** Format a duration in seconds as ms / fractional seconds / whole seconds. */
export function formatDuration(sec: number): string {
  if (sec < 1) return `${Math.max(1, Math.round(sec * 1000))}ms`;
  if (sec < 10) return `${sec.toFixed(1)}s`;
  return `${Math.round(sec)}s`;
}
