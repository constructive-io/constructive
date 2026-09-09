import {
  makeScopedCatalogLayout,
  parseScopedCatalogSize,
  SCOPED_CATALOG_SCALES,
  validateScopedCatalogFixtureName,
} from '../src/scoped-catalog-fixture';

describe('scoped catalog fixture safety', () => {
  it('derives bounded cperf schema names from an explicit fixture name', () => {
    expect(makeScopedCatalogLayout('cperf_catalog_20260819')).toEqual({
      fixture: 'cperf_catalog_20260819',
      rootSchema: 'cperf_catalog_20260819_root',
      dependencySchema: 'cperf_catalog_20260819_dep',
      noiseSchema: 'cperf_catalog_20260819_noise',
    });
    expect(() => validateScopedCatalogFixtureName('public')).toThrow(
      'must start with cperf_'
    );
    expect(() =>
      validateScopedCatalogFixtureName('cperf_fixture; drop schema public')
    ).toThrow('must start with cperf_');
    expect(() => validateScopedCatalogFixtureName(`cperf_${'a'.repeat(50)}`))
      .toThrow('at most 52 characters');
  });

  it('defines increasing small, medium, and large catalog scales', () => {
    expect(parseScopedCatalogSize('small')).toBe('small');
    expect(parseScopedCatalogSize('medium')).toBe('medium');
    expect(parseScopedCatalogSize('large')).toBe('large');
    expect(() => parseScopedCatalogSize('production')).toThrow(
      "'small', 'medium', or 'large'"
    );
    expect(SCOPED_CATALOG_SCALES.small.noiseTableCount).toBeLessThan(
      SCOPED_CATALOG_SCALES.medium.noiseTableCount
    );
    expect(SCOPED_CATALOG_SCALES.medium.noiseTableCount).toBeLessThan(
      SCOPED_CATALOG_SCALES.large.noiseTableCount
    );
  });
});
