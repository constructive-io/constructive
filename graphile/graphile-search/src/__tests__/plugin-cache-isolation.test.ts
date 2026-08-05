import type { SearchAdapter } from '../types';
import { createUnifiedSearchPlugin } from '../plugin';

describe('UnifiedSearchPlugin build isolation', () => {
  it('does not reuse discovery results across same-named codecs from different builds', () => {
    const detectColumns = jest.fn((codec: any, build: any) => [
      { attributeName: build.tenantColumn ?? codec.extensions.tenantColumn },
    ]);
    const adapter: SearchAdapter = {
      name: 'tenant-test',
      filterPrefix: 'tenantTest',
      scoreSemantics: { metric: 'score', lowerIsBetter: false, range: null },
      detectColumns,
      registerTypes: jest.fn(),
      getFilterTypeName: jest.fn(() => 'TenantTestInput'),
      buildFilterApply: jest.fn(),
    };
    const plugin = createUnifiedSearchPlugin({
      adapters: [adapter],
      enableSearchScore: false,
      enableUnifiedSearch: false,
    });
    const callback = (plugin.schema!.entityBehavior!.pgCodecAttribute as any)
      .inferred.callback;
    const buildA = { tenantColumn: 'tenant_a_search' };
    const buildB = { tenantColumn: 'tenant_b_search' };
    const codecA = {
      name: 'documents',
      attributes: { tenant_a_search: {} },
      extensions: { tenantColumn: 'tenant_a_search' },
    };
    const codecB = {
      name: 'documents',
      attributes: { tenant_b_search: {} },
      extensions: { tenantColumn: 'tenant_b_search' },
    };

    expect(callback('default', [codecA, 'tenant_a_search'], buildA)).toContain(
      'unifiedSearch:select'
    );
    expect(callback('default', [codecB, 'tenant_b_search'], buildB)).toContain(
      'unifiedSearch:select'
    );
    expect(callback('default', [codecB, 'tenant_a_search'], buildB)).toBe('default');
    expect(detectColumns).toHaveBeenCalledTimes(2);

    // Reusing the same codec object within one build should still hit the cache.
    callback('default', [codecB, 'tenant_b_search'], buildB);
    expect(detectColumns).toHaveBeenCalledTimes(2);

    // Discovery is build-dependent, so even a reused codec object must not
    // carry adapter metadata across builds.
    const sharedCodec = {
      name: 'shared_documents',
      attributes: { tenant_a_search: {}, tenant_b_search: {} },
      extensions: { tenantColumn: 'unused' },
    };
    expect(callback('default', [sharedCodec, 'tenant_a_search'], buildA)).toContain(
      'unifiedSearch:select'
    );
    expect(callback('default', [sharedCodec, 'tenant_b_search'], buildB)).toContain(
      'unifiedSearch:select'
    );
    expect(detectColumns).toHaveBeenCalledTimes(4);
  });
});
