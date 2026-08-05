import { GraphQLInputObjectType } from 'graphql';

import { resolveBulkWhereType } from '../src/plugins/BulkTypesPlugin';

describe('bulk mutation where type resolution', () => {
  it('uses connection-filter without touching a disabled condition inflector', () => {
    const filter = new GraphQLInputObjectType({ name: 'ItemFilter', fields: {} });
    const getTypeByName = jest.fn((name: string) => name === 'ItemFilter' ? filter : undefined);
    const conditionType = jest.fn(() => {
      throw new Error('disabled condition inflector must not be called');
    });

    expect(resolveBulkWhereType({ getTypeByName } as any, { conditionType }, 'Item')).toBe(filter);
    expect(conditionType).not.toHaveBeenCalled();
    expect(getTypeByName).toHaveBeenCalledTimes(1);
  });

  it('falls back to the built-in condition type when no filter exists', () => {
    const condition = new GraphQLInputObjectType({ name: 'ItemCondition', fields: {} });
    const getTypeByName = jest.fn((name: string) =>
      name === 'ItemCondition' ? condition : undefined
    );

    expect(resolveBulkWhereType(
      { getTypeByName } as any,
      { conditionType: () => 'ItemCondition' },
      'Item'
    )).toBe(condition);
  });

  it('returns undefined when neither predicate plugin is enabled', () => {
    expect(resolveBulkWhereType(
      { getTypeByName: (): undefined => undefined } as any,
      {},
      'Item'
    )).toBeUndefined();
  });
});
