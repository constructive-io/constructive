// Seed times in an AppSpec are the user's wall-clock time. A naive date-time
// would otherwise be stored as UTC, and a 9:00 shift would show at 16:00 for
// a user at UTC+7, so the desktop adds its own offset before the insert.

const NAIVE_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?$/;

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/**
 * `2026-10-22T09:00` read in the desktop's time zone, as
 * `2026-10-22T09:00:00+07:00`. A date, a time with an offset, or any other
 * value comes back unchanged.
 */
export function withLocalOffset(value: string): string {
  const match = value.match(NAIVE_DATE_TIME);
  if (!match) return value;
  const [year, month, day, hour, minute, second = '0', ms = '0'] = match.slice(1);
  const local = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(ms.padEnd(3, '0')),
  );
  if (Number.isNaN(local.getTime())) return value;
  const offset = -local.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const millis = local.getMilliseconds() ? `.${pad(local.getMilliseconds(), 3)}` : '';
  return (
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
    `T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}${millis}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  );
}
