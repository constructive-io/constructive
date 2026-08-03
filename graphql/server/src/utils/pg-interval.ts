import type { PgInterval } from '@constructive-io/express-context';

/**
 * Convert a PostgreSQL interval value from auth settings into milliseconds.
 *
 * Numeric string values are treated as seconds, matching the existing auth
 * settings cookie parser behavior.
 */
export function pgIntervalToMilliseconds(
  interval: string | PgInterval | null | undefined
): number | null {
  if (!interval) return null;

  if (typeof interval === 'string') {
    const normalized = interval.trim();
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
    const seconds = Number(normalized);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
  }

  let totalMilliseconds = 0;
  if (interval.years) {
    totalMilliseconds += interval.years * 365 * 24 * 60 * 60 * 1000;
  }
  if (interval.months) {
    totalMilliseconds += interval.months * 30 * 24 * 60 * 60 * 1000;
  }
  if (interval.days) {
    totalMilliseconds += interval.days * 24 * 60 * 60 * 1000;
  }
  if (interval.hours) totalMilliseconds += interval.hours * 60 * 60 * 1000;
  if (interval.minutes) totalMilliseconds += interval.minutes * 60 * 1000;
  if (interval.seconds) totalMilliseconds += interval.seconds * 1000;
  if (interval.milliseconds) {
    totalMilliseconds += interval.milliseconds;
  }

  return totalMilliseconds > 0 ? totalMilliseconds : null;
}

/**
 * Convert a PostgreSQL interval into seconds for cookie configuration.
 */
export function pgIntervalToSeconds(
  interval: string | PgInterval | null | undefined
): number | null {
  const milliseconds = pgIntervalToMilliseconds(interval);
  return milliseconds === null ? null : milliseconds / 1000;
}
