import { pgIntervalToMilliseconds, pgIntervalToSeconds } from '../pg-interval';

describe('PostgreSQL interval conversion', () => {
  it('converts structured intervals without mixing seconds and milliseconds', () => {
    const interval = {
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      milliseconds: 500
    };

    expect(pgIntervalToMilliseconds(interval)).toBe(93_784_500);
    expect(pgIntervalToSeconds(interval)).toBe(93_784.5);
  });

  it('treats numeric strings as seconds', () => {
    expect(pgIntervalToMilliseconds('60')).toBe(60_000);
    expect(pgIntervalToSeconds('60.5')).toBe(60.5);
  });

  it('rejects ambiguous, empty, and non-positive values', () => {
    expect(pgIntervalToMilliseconds('2 hours')).toBeNull();
    expect(pgIntervalToMilliseconds('0')).toBeNull();
    expect(pgIntervalToMilliseconds(null)).toBeNull();
  });
});
