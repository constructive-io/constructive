import {
  validateFixtureSchema,
  validateFixtureTableCount,
} from '../src/fixture';

describe('fixture safety', () => {
  test('only accepts narrowly scoped benchmark schema names', () => {
    expect(validateFixtureSchema('cperf_example_1')).toBe('cperf_example_1');
    expect(() => validateFixtureSchema('public')).toThrow(
      'must start with cperf_'
    );
    expect(() =>
      validateFixtureSchema('cperf_example; drop schema public')
    ).toThrow('must start with cperf_');
  });

  test('bounds generated fixture size', () => {
    expect(validateFixtureTableCount(64)).toBe(64);
    expect(() => validateFixtureTableCount(0)).toThrow('between 1 and 500');
    expect(() => validateFixtureTableCount(501)).toThrow('between 1 and 500');
  });
});
