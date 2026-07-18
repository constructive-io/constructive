import {
  COMPARISON_FILTER_OPERATORS,
  FILTER_OPERATORS,
  Filter,
  isFilterOperator,
  isLogicalOperator,
  OrderByItem
} from '../src';

describe('query-spec', () => {
  it('exposes the full operator list without duplicates', () => {
    expect(new Set(FILTER_OPERATORS).size).toBe(FILTER_OPERATORS.length);
    expect(FILTER_OPERATORS).toEqual(
      expect.arrayContaining(['isNull', 'equalTo', 'in', 'like', 'startsWith', 'contains', 'intersects'])
    );
  });

  it('groups operators', () => {
    expect(COMPARISON_FILTER_OPERATORS).toContain('greaterThanOrEqualTo');
  });

  it('validates operators at runtime', () => {
    expect(isFilterOperator('equalTo')).toBe(true);
    expect(isFilterOperator('bogus')).toBe(false);
    expect(isLogicalOperator('or')).toBe(true);
    expect(isLogicalOperator('equalTo')).toBe(false);
  });

  it('types nested filters', () => {
    const filter: Filter = {
      status: { in: ['queued', 'retry'] },
      attempts: { lessThan: 5 },
      or: [{ priority: { greaterThan: 0 } }, { escalated: { equalTo: true } }],
      not: { archived: { equalTo: true } },
      tags: { some: { name: { startsWith: 'a' } } }
    };
    expect(filter).toBeDefined();

    const order: OrderByItem[] = [{ field: 'name', direction: 'asc' }];
    expect(order[0].direction).toBe('asc');
  });
});
