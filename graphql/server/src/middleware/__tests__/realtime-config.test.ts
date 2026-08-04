import type { ConstructiveOptions } from '@constructive-io/graphql-types';

import {
  addRealtimeRuntimeDependencySchema,
  resolveGraphileRealtimeSchema
} from '../realtime-config';

describe('Graphile realtime configuration', () => {
  it('preserves the compatibility default only for enabled realtime surfaces', () => {
    expect(resolveGraphileRealtimeSchema({} as ConstructiveOptions, true)).toBe(
      'realtime_public'
    );
    expect(resolveGraphileRealtimeSchema({} as ConstructiveOptions, false)).toBeNull();
  });

  it('preserves one exact configured cursor schema', () => {
    const options = {
      graphile: { realtimeSchema: 'tenant_a_realtime' }
    } as ConstructiveOptions;

    expect(resolveGraphileRealtimeSchema(options, true)).toBe('tenant_a_realtime');
  });

  it('rejects an empty configured schema when realtime is enabled', () => {
    const options = {
      graphile: { realtimeSchema: '' }
    } as ConstructiveOptions;

    expect(() => resolveGraphileRealtimeSchema(options, true)).toThrow(
      'graphile.realtimeSchema must be one non-empty exact schema name'
    );
  });

  it('adds and deduplicates the cursor schema only in the runtime allowlist', () => {
    expect(addRealtimeRuntimeDependencySchema(
      ['extensions', 'tenant_a_realtime'],
      'tenant_a_realtime'
    )).toEqual(['extensions', 'tenant_a_realtime']);
    expect(addRealtimeRuntimeDependencySchema(['extensions'], null)).toEqual([
      'extensions'
    ]);
  });
});
