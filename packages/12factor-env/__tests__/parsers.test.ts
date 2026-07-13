import {
  parseEnvBoolean as parseEnvBooleanFromRoot,
  parseEnvNumber as parseEnvNumberFromRoot,
  parseEnvStringArray as parseEnvStringArrayFromRoot,
} from '../src';
import {
  parseEnvBoolean,
  parseEnvNumber,
  parseEnvStringArray,
} from '../src/parsers';

describe('pure environment parsers', () => {
  it('re-exports the parser functions from the package root', () => {
    expect(parseEnvBooleanFromRoot).toBe(parseEnvBoolean);
    expect(parseEnvNumberFromRoot).toBe(parseEnvNumber);
    expect(parseEnvStringArrayFromRoot).toBe(parseEnvStringArray);
  });

  describe('parseEnvBoolean', () => {
    it.each(['true', 'TRUE', 'True', '1', 'yes', 'YES'])(
      'parses %p as true',
      (value) => {
        expect(parseEnvBoolean(value)).toBe(true);
      }
    );

    it.each([
      'false',
      'FALSE',
      '0',
      'no',
      'on',
      'off',
      'anything',
      '',
      ' true ',
    ])('parses defined non-true value %p as false', (value) => {
      expect(parseEnvBoolean(value)).toBe(false);
    });

    it('preserves an absent value as undefined', () => {
      expect(parseEnvBoolean(undefined)).toBeUndefined();
    });
  });

  describe('parseEnvNumber', () => {
    it.each([
      ['42', 42],
      ['-3.5', -3.5],
      ['0', 0],
      ['', 0],
      ['   ', 0],
      ['0x10', 16],
      ['Infinity', Infinity],
    ])('parses %p with Number semantics', (value, expected) => {
      expect(parseEnvNumber(value)).toBe(expected);
    });

    it.each([undefined, 'not-a-number', '12px'])(
      'returns undefined for %p',
      (value) => {
        expect(parseEnvNumber(value)).toBeUndefined();
      }
    );
  });

  describe('parseEnvStringArray', () => {
    it('splits commas, trims entries, and removes empty entries', () => {
      expect(parseEnvStringArray(' alpha, beta ,, gamma ')).toEqual([
        'alpha',
        'beta',
        'gamma',
      ]);
    });

    it('preserves order and duplicate values', () => {
      expect(parseEnvStringArray('alpha,beta,alpha')).toEqual([
        'alpha',
        'beta',
        'alpha',
      ]);
    });

    it.each([undefined, ''])(
      'returns undefined for an absent source value %p',
      (value) => {
        expect(parseEnvStringArray(value)).toBeUndefined();
      }
    );

    it.each([' ', ','])(
      'returns an empty array for non-empty blank input %p',
      (value) => {
        expect(parseEnvStringArray(value)).toEqual([]);
      }
    );
  });
});
