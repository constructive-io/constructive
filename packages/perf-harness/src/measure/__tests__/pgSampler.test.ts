import { toBytes } from '../pgSampler';

describe('toBytes (docker MemUsage unit parser)', () => {
  test('bytes', () => {
    expect(toBytes('512B')).toBe(512);
  });

  test('KiB', () => {
    expect(toBytes('2KiB')).toBe(2048);
  });

  test('MiB', () => {
    expect(toBytes('1.5MiB')).toBe(1572864); // 1.5 * 1024^2
  });

  test('GiB', () => {
    expect(toBytes('4GiB')).toBe(4294967296); // 4 * 1024^3
    expect(toBytes('1.234GiB')).toBe(Math.round(1.234 * 1024 ** 3));
  });

  test('tolerates whitespace between value and unit', () => {
    expect(toBytes('1.234 GiB')).toBe(Math.round(1.234 * 1024 ** 3));
  });

  test('parses each side of a docker "used / limit" string', () => {
    const [used, limit] = '1.234GiB / 4GiB'.split('/').map((s) => toBytes(s));
    expect(used).toBe(Math.round(1.234 * 1024 ** 3));
    expect(limit).toBe(4294967296);
  });

  test('unknown / unparseable input returns null', () => {
    expect(toBytes('nonsense')).toBeNull();
    expect(toBytes('')).toBeNull();
  });
});
