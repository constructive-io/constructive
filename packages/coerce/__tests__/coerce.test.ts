import {
  asArrayOf,
  asBigInt,
  asBoolean,
  asDate,
  asDuration,
  asEmail,
  asHostname,
  asInteger,
  asIntegerIn,
  asIsoString,
  asJson,
  asNumber,
  asNumberIn,
  asNumeric,
  asNumericInteger,
  asOneOf,
  asPort,
  asRecord,
  asString,
  asStringArray,
  asStringList,
  asUrl,
  asUuid,
  CoerceError,
  requireArrayOf,
  requireInteger,
  requireIntegerIn,
  requireNumberIn,
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

describe('asArrayOf / requireArrayOf', () => {
  it('coerces every entry through the element coercer', () => {
    expect(asArrayOf([], asInteger)).toEqual([]);
    expect(asArrayOf([1, 2], asInteger)).toEqual([1, 2]);
  });

  it('rejects the whole array on one bad entry', () => {
    expect(asArrayOf([1, 'x'], asInteger)).toBeNull();
    expect(asArrayOf('nope', asInteger)).toBeNull();
  });

  it('requireArrayOf throws a labelled CoerceError with the expected text', () => {
    expect(requireArrayOf([1], asInteger, 'run.seconds', 'an array of integers')).toEqual([1]);
    expect(() => requireArrayOf([1, 'x'], asInteger, 'run.seconds', 'an array of integers')).toThrow(
      'run.seconds is required (expected an array of integers)'
    );
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

describe('asNumeric', () => {
  it('parses a number carried as text, and passes numbers through', () => {
    expect(asNumeric('5')).toBe(5);
    expect(asNumeric(' 5.5 ')).toBe(5.5);
    expect(asNumeric(5)).toBe(5);
  });

  it('rejects blank text rather than reading it as 0', () => {
    expect(asNumeric('')).toBeNull();
    expect(asNumeric('  ')).toBeNull();
    expect(asNumeric(undefined)).toBeNull();
  });

  it('rejects text that is not a number', () => {
    expect(asNumeric('abc')).toBeNull();
    expect(asNumeric('5s')).toBeNull();
    expect(asNumeric(Infinity)).toBeNull();
  });

  it('restricts to integers on request', () => {
    expect(asNumericInteger('42')).toBe(42);
    expect(asNumericInteger('4.2')).toBeNull();
  });
});

describe('asNumberIn', () => {
  it('accepts values inside inclusive bounds', () => {
    expect(asNumberIn(5, { min: 1, max: 10 })).toBe(5);
    expect(asNumberIn(1, { min: 1 })).toBe(1);
    expect(asNumberIn(10, { max: 10 })).toBe(10);
  });

  it('misses rather than clamps, so an invalid value never looks configured', () => {
    expect(asNumberIn(0, { min: 1 })).toBeNull();
    expect(asNumberIn(11, { max: 10 })).toBeNull();
  });

  it('restricts to integers on request', () => {
    expect(asIntegerIn(4, { min: 1 })).toBe(4);
    expect(asIntegerIn(4.5, { min: 1 })).toBeNull();
  });

  it('describes the bound it wanted when required', () => {
    expect(() => requireNumberIn(0, { min: 1, max: 10 }, 'weight')).toThrow(
      'weight is required (expected a number in 1..10)'
    );
    expect(() => requireIntegerIn(0, { min: 1 }, 'attempt')).toThrow(
      'attempt is required (expected an integer >= 1)'
    );
  });
});

describe('asPort', () => {
  it('accepts a port as a number or as text', () => {
    expect(asPort(5432)).toBe(5432);
    expect(asPort('5432')).toBe(5432);
  });

  it('rejects anything outside 1..65535', () => {
    expect(asPort(0)).toBeNull();
    expect(asPort(65536)).toBeNull();
    expect(asPort('80.5')).toBeNull();
    expect(asPort('http')).toBeNull();
  });
});

describe('asBigInt', () => {
  it('accepts the three shapes a 64-bit id travels in', () => {
    expect(asBigInt(10n)).toBe(10n);
    expect(asBigInt(10)).toBe(10n);
    expect(asBigInt('9007199254740993')).toBe(9007199254740993n);
  });

  it('rejects fractions and non-numeric text', () => {
    expect(asBigInt(1.5)).toBeNull();
    expect(asBigInt('1.5')).toBeNull();
    expect(asBigInt('ten')).toBeNull();
  });
});

describe('asUrl', () => {
  it('accepts an absolute URL verbatim', () => {
    expect(asUrl('https://constructive.io/a?b=c')).toBe('https://constructive.io/a?b=c');
    expect(asUrl('postgres://user@host:5432/db')).toBe('postgres://user@host:5432/db');
  });

  it('rejects a scheme-less value, which is a path and not a host', () => {
    expect(asUrl('constructive.io')).toBeNull();
    expect(asUrl('/relative')).toBeNull();
  });
});

describe('asHostname', () => {
  it('accepts a bare hostname or IP', () => {
    expect(asHostname('localhost')).toBe('localhost');
    expect(asHostname('db.internal.example.com')).toBe('db.internal.example.com');
    expect(asHostname('127.0.0.1')).toBe('127.0.0.1');
    expect(asHostname('::1')).toBe('::1');
  });

  it('rejects a value carrying a scheme, port or path', () => {
    expect(asHostname('localhost:5432')).toBeNull();
    expect(asHostname('https://localhost')).toBeNull();
    expect(asHostname('localhost/db')).toBeNull();
  });
});

describe('asEmail', () => {
  it('accepts an addressable shape', () => {
    expect(asEmail('developers@constructive.io')).toBe('developers@constructive.io');
  });

  it('rejects values missing a domain or carrying whitespace', () => {
    expect(asEmail('developers@localhost')).toBeNull();
    expect(asEmail('developers')).toBeNull();
    expect(asEmail('dev eloper@constructive.io')).toBeNull();
  });
});

describe('asUuid', () => {
  it('accepts canonical 8-4-4-4-12 hex in either case', () => {
    expect(asUuid('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    );
    expect(asUuid('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(
      '3F2504E0-4F89-11D3-9A0C-0305E82C3301'
    );
  });

  it('rejects truncated, unhyphenated or non-hex values', () => {
    expect(asUuid('3f2504e0-4f89-11d3-9a0c')).toBeNull();
    expect(asUuid('3f2504e04f8911d39a0c0305e82c3301')).toBeNull();
    expect(asUuid('zzzzzzzz-4f89-11d3-9a0c-0305e82c3301')).toBeNull();
  });
});

describe('asDuration', () => {
  it('normalises every suffix to milliseconds', () => {
    expect(asDuration('500ms')).toBe(500);
    expect(asDuration('30s')).toBe(30_000);
    expect(asDuration('5m')).toBe(300_000);
    expect(asDuration('2h')).toBe(7_200_000);
    expect(asDuration('1d')).toBe(86_400_000);
    expect(asDuration('1w')).toBe(604_800_000);
  });

  it('treats a unit-less value as milliseconds', () => {
    expect(asDuration('250')).toBe(250);
    expect(asDuration(250)).toBe(250);
  });

  it('rejects an unknown unit instead of dropping it', () => {
    expect(asDuration('30sec')).toBeNull();
    expect(asDuration('soon')).toBeNull();
  });
});

describe('asJson', () => {
  it('parses a document and passes an already-parsed one through', () => {
    expect(asJson('{"a":1}')).toEqual({ a: 1 });
    expect(asJson('[1,2]')).toEqual([1, 2]);
    expect(asJson({ a: 1 })).toEqual({ a: 1 });
  });

  it('rejects malformed JSON and bare scalars', () => {
    expect(asJson('{a:1}')).toBeNull();
    expect(asJson('5')).toBeNull();
    expect(asJson(5)).toBeNull();
  });
});
