import { resolveConstructiveIntrospectionCapabilityExtensions } from
  '../src/presets/constructive-preset';

describe('Constructive scoped-introspection extension capabilities', () => {
  it('derives only the exact extensions required by enabled plugins', () => {
    expect(resolveConstructiveIntrospectionCapabilityExtensions()).toEqual([
      'pg_trgm',
      'vector',
      'pg_textsearch',
      'postgis',
      'ltree'
    ]);
    expect(resolveConstructiveIntrospectionCapabilityExtensions({
      enableSearch: false,
      enableLlm: false,
      enablePostgis: false,
      enableLtree: false
    })).toEqual([]);
    expect(resolveConstructiveIntrospectionCapabilityExtensions({
      enableSearch: false,
      enableLlm: true,
      enablePostgis: false,
      enableLtree: false
    })).toEqual(['vector']);
  });
});
