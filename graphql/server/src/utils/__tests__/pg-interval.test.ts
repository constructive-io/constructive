import {
  pgIntervalToMilliseconds,
  pgIntervalToSeconds,
} from '../pg-interval';

describe('pg interval utilities', () => {
  describe('pgIntervalToSeconds', () => {
    it('treats numeric strings as seconds', () => {
      expect(pgIntervalToSeconds('3600')).toBe(3600);
    });

    it('converts PostgreSQL interval objects to seconds', () => {
      expect(pgIntervalToSeconds({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe(
        93784,
      );
    });

    it('returns null for missing or invalid values', () => {
      expect(pgIntervalToSeconds(null)).toBeNull();
      expect(pgIntervalToSeconds(undefined)).toBeNull();
      expect(pgIntervalToSeconds('not-an-interval')).toBeNull();
    });

    it('preserves zero-second values', () => {
      expect(pgIntervalToSeconds('0')).toBe(0);
      expect(pgIntervalToSeconds({ seconds: 0 })).toBe(0);
    });
  });

  describe('pgIntervalToMilliseconds', () => {
    it('converts parsed seconds to milliseconds', () => {
      expect(pgIntervalToMilliseconds({ minutes: 10 })).toBe(10 * 60 * 1000);
    });
  });
});
