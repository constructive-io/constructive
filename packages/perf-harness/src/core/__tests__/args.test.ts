import { asBool, asFloat, asInt, parseArgv } from '../args';

describe('parseArgv', () => {
  test('--flag value form', () => {
    expect(parseArgv(['--host', 'h'])).toEqual({ _: [], host: 'h' });
  });

  test('--flag=value form', () => {
    expect(parseArgv(['--host=h'])).toEqual({ _: [], host: 'h' });
  });

  test('bare --flag becomes true', () => {
    expect(parseArgv(['--verbose'])).toEqual({ _: [], verbose: true });
  });

  test('bare flag immediately before another flag is true', () => {
    const a = parseArgv(['--dry-run', '--tenants', '5']);
    expect(a['dry-run']).toBe(true);
    expect(a.tenants).toBe('5');
  });

  test('trailing bare flag is true', () => {
    const a = parseArgv(['--tenants', '5', '--allow-hub']);
    expect(a.tenants).toBe('5');
    expect(a['allow-hub']).toBe(true);
  });

  test('positionals collect into _', () => {
    const a = parseArgv(['fleet', 'subset', '--tenants', '5']);
    expect(a._).toEqual(['fleet', 'subset']);
    expect(a.tenants).toBe('5');
  });

  test('empty argv yields just _', () => {
    expect(parseArgv([])).toEqual({ _: [] });
  });
});

describe('coercions', () => {
  test('asBool truthy tokens', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'on']) expect(asBool(v)).toBe(true);
  });

  test('asBool falsy tokens + default', () => {
    for (const v of ['0', 'false', 'no', 'nope', 'off']) expect(asBool(v)).toBe(false);
    expect(asBool(undefined)).toBe(false);
    expect(asBool(undefined, true)).toBe(true);
    expect(asBool(null, true)).toBe(true);
    expect(asBool(true)).toBe(true);
    expect(asBool(false)).toBe(false);
  });

  test('asInt parses / falls back', () => {
    expect(asInt('42')).toBe(42);
    expect(asInt('42px')).toBe(42);
    expect(asInt(undefined, 7)).toBe(7);
    expect(asInt('notnum', 3)).toBe(3);
  });

  test('asFloat parses / falls back', () => {
    expect(asFloat('3.14')).toBeCloseTo(3.14);
    expect(asFloat(undefined, 1.5)).toBe(1.5);
    expect(asFloat('nope', 2.5)).toBe(2.5);
  });
});
