import { createSubscriptionHook } from '../src/use-subscription';
import { RealtimeContext } from '../src/context';
import type { SubscriptionFieldMeta } from '@constructive-io/realtime';

describe('createSubscriptionHook', () => {
  const TEST_META: SubscriptionFieldMeta = {
    fieldName: 'onContactChanged',
    tableName: 'contact',
    dataFieldName: 'contact',
  };

  it('returns a function (hook)', () => {
    const hook = createSubscriptionHook(
      TEST_META,
      (filter) => ({
        document: 'subscription { onContactChanged { event } }',
        variables: filter ? { filter } : {},
      })
    );

    expect(typeof hook).toBe('function');
  });

  it('accepts default cache bridge config', () => {
    const hook = createSubscriptionHook(
      TEST_META,
      (filter) => ({
        document: 'subscription { onContactChanged { event } }',
        variables: filter ? { filter } : {},
      }),
      { detailKey: ['contacts', 'detail'], listKey: ['contacts', 'list'] }
    );

    expect(typeof hook).toBe('function');
  });
});

describe('RealtimeContext', () => {
  it('exports a React context', () => {
    expect(RealtimeContext).toBeDefined();
    expect(RealtimeContext.Provider).toBeDefined();
  });
});
