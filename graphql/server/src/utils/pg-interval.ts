import type { PgInterval } from '@constructive-io/express-context';

/**
 * Convert a PostgreSQL interval value from auth settings into seconds.
 *
 * Numeric string values are treated as seconds, matching the existing auth
 * settings cookie parser behavior.
 */
export function pgIntervalToSeconds(
  interval: string | PgInterval | null | undefined,
): number | null {
  if (!interval) return null;

  if (typeof interval === 'string') {
    const seconds = parseInt(interval, 10);
    return Number.isNaN(seconds) ? null : seconds;
  }

  let totalSeconds = 0;
  if (interval.years) totalSeconds += interval.years * 365 * 24 * 60 * 60;
  if (interval.months) totalSeconds += interval.months * 30 * 24 * 60 * 60;
  if (interval.days) totalSeconds += interval.days * 24 * 60 * 60;
  if (interval.hours) totalSeconds += interval.hours * 60 * 60;
  if (interval.minutes) totalSeconds += interval.minutes * 60;
  if (interval.seconds) totalSeconds += interval.seconds;
  if (interval.milliseconds) totalSeconds += interval.milliseconds / 1000;

  return totalSeconds;
}

export function pgIntervalToMilliseconds(
  interval: string | PgInterval | null | undefined,
): number | null {
  const seconds = pgIntervalToSeconds(interval);
  return seconds === null ? null : seconds * 1000;
}
