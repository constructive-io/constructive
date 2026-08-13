import {
  asBoolean,
  asDate,
  asInteger,
  asIsoString,
  asNumber,
  asOneOf,
  asRecord,
  asString,
  asStringArray,
  asStringList,
  CoerceError,
  requireInteger,
  requireOneOf,
  requireString
} from '../src';

describe('asString', () => {
  it('accepts a non-empty string', () => {
    expect(asString('thread-1')).toBe('thread-1');
  });

  it('rejects blank and whitespace-only strings so "" never reads as supplied', () => {
    expect(asString('')).toBeNull();
    expect(asString('   ')).toBeNull();
  });

  it('rejects non-strings without stringifying them', () => {
    expect(asString(1)).toBeNull();
    expect(asString(null)).toBeNull();
    expect(asString(undefined)).toBeNull();
    expect(asString({})).toBeNull();
  });
});

describe('asNumber', () => {
  it('accepts finite numbers including zero', () => {
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-1.5)).toBe(-1.5);
  });

  it('rejects non-finite numbers and numeric strings', () => {
    expect(asNumber(NaN)).toBeNull();
    expect(asNumber(Infinity)).toBeNull();
    expect(asNumber('5')).toBeNull();
  });
});

describe('asInteger', () => {
  it('accepts integers', () => {
    expect(asInteger(0)).toBe(0);
    expect(asInteger(42)).toBe(42);
  });

  it('rejects fractions, NaN and numeric strings', () => {
    expect(asInteger(1.5)).toBeNull();
    expect(asInteger(NaN)).toBeNull();
    expect(asInteger('1')).toBeNull();
  });
});

describe('asBoolean', () => {
  it('passes booleans through', () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean(false)).toBe(false);
  });

  it.each(['true', 'TRUE', '1', 'yes', 'on', 't', 'y'])('reads %s as true', value => {
    expect(asBoolean(value)).toBe(true);
  });

  it.each(['false', 'FALSE', '0', 'no', 'off', 'f', 'n'])('reads %s as false', value => {
    expect(asBoolean(value)).toBe(false);
  });

  it('keeps unset distinguishable from false', () => {
    expect(asBoolean('')).toBeNull();
    expect(asBoolean(undefined)).toBeNull();
    expect(asBoolean('maybe')).toBeNull();
    expect(asBoolean(1)).toBeNull();
  });
});

describe('asStringArray', () => {
  it('accepts an array of non-empty strings, including empty', () => {
    expect(asStringArray([])).toEqual([]);
    expect(asStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('rejects the whole list rather than silently dropping bad entries', () => {
    expect(asStringArray(['a', ''])).toBeNull();
    expect(asStringArray(['a', 2])).toBeNull();
  });

  it('rejects non-arrays', () => {
    expect(asStringArray('a')).toBeNull();
    expect(asStringArray({ 0: 'a' })).toBeNull();
  });
});

describe('asStringList', () => {
  it('splits a delimited string, trimming and dropping blanks', () => {
    expect(asStringList('a, b,')).toEqual(['a', 'b']);
    expect(asStringList('a:b', ':')).toEqual(['a', 'b']);
  });

  it('accepts an array form too', () => {
    expect(asStringList(['a', 'b'])).toEqual(['a', 'b']);
    expect(asStringList(['a', ''])).toBeNull();
  });

  it('rejects blanks and non-list values', () => {
    expect(asStringList('')).toBeNull();
    expect(asStringList(undefined)).toBeNull();
    expect(asStringList(1)).toBeNull();
  });
});

describe('asRecord', () => {
  it('accepts a plain object', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('rejects null and arrays, which are also typeof object', () => {
    expect(asRecord(null)).toBeNull();
    expect(asRecord([])).toBeNull();
  });
});

describe('asDate', () => {
  it('accepts a valid Date and an ISO string', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(asDate(date)).toBe(date);
    expect(asDate('2026-01-01T00:00:00.000Z')).toEqual(date);
  });

  it('rejects an invalid Date and unparseable strings', () => {
    expect(asDate(new Date('nope'))).toBeNull();
    expect(asDate('nope')).toBeNull();
    expect(asDate(0)).toBeNull();
  });
});

describe('asIsoString', () => {
  it('serialises a Date', () => {
    expect(asIsoString(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00.000Z');
  });

  it('passes a string through verbatim so a cursor survives byte-for-byte', () => {
    expect(asIsoString('2026-01-01 00:00:00+00')).toBe('2026-01-01 00:00:00+00');
  });

  it('rejects an invalid Date and blanks', () => {
    expect(asIsoString(new Date('nope'))).toBeNull();
    expect(asIsoString('')).toBeNull();
    expect(asIsoString(null)).toBeNull();
  });
});

describe('asOneOf', () => {
  it('narrows to the allowed literals', () => {
    const role: 'user' | 'assistant' | null = asOneOf('user', ['user', 'assistant'] as const);
    expect(role).toBe('user');
  });

  it('rejects values outside the set', () => {
    expect(asOneOf('root', ['user', 'assistant'] as const)).toBeNull();
    expect(asOneOf('', ['user'] as const)).toBeNull();
  });
});

describe('require*', () => {
  it('returns the coerced value', () => {
    expect(requireString('a', 'message_id')).toBe('a');
    expect(requireInteger(2, 'attempt')).toBe(2);
    expect(requireOneOf('user', ['user'] as const, 'author_role')).toBe('user');
  });

  it('throws a labelled CoerceError naming what was expected', () => {
    expect(() => requireString('', 'message_id')).toThrow(CoerceError);
    expect(() => requireString('', 'message_id')).toThrow(
      'message_id is required (expected a non-empty string)'
    );
    expect(() => requireInteger(1.5, 'attempt')).toThrow('attempt is required (expected an integer)');
    expect(() => requireOneOf('root', ['user', 'assistant'] as const, 'author_role')).toThrow(
      'author_role is required (expected one of user, assistant)'
    );
  });

  it('carries the label for transports that map it to a status', () => {
    try {
      requireString(undefined, 'thread_id');
      throw new Error('expected a throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CoerceError);
      expect((err as CoerceError).label).toBe('thread_id');
    }
  });
});
