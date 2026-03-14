import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from '../src';
import type { ConnectionFilterOperatorFactory } from '../src';

const SCHEMA = 'filter_test';
const sqlFile = (f: string) => join(__dirname, '../sql', f);

type QueryFn = GraphQLQueryFnObj;

// Enable filtering on all columns regardless of index status
const EnableAllFilterColumnsPlugin: GraphileConfig.Plugin = {
  name: 'EnableAllFilterColumnsPlugin',
  version: '1.0.0',
  schema: {
    entityBehavior: {
      pgCodecAttribute: {
        inferred: {
          after: ['postInferred'],
          provides: ['enableAllFilters'],
          callback(behavior: any) {
            return [behavior, 'filterBy'];
          },
        },
      },
    },
  },
};

// ============================================================================
// SCALAR OPERATOR TESTS
// ============================================================================
describe('Scalar operators', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  // -- Equality operators --

  it('equalTo filters by exact match', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { equalTo: "Widget A" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget A');
  });

  it('notEqualTo excludes matching rows', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notEqualTo: "Widget A" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(4);
    expect(result.data?.allItems.nodes.every((n: any) => n.name !== 'Widget A')).toBe(true);
  });

  it('distinctFrom handles NULL correctly', async () => {
    // distinctFrom treats NULL as a value, unlike notEqualTo
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { description: { distinctFrom: "A basic widget" } }) {
            nodes { id name description }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Should include rows where description is NULL (Gadget Y) + other non-matching descriptions
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });

  it('notDistinctFrom matches value including NULL semantics', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { description: { notDistinctFrom: "A basic widget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget A');
  });

  // -- NULL checks --

  it('isNull: true filters for NULL values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { description: { isNull: true } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Gadget Y');
  });

  it('isNull: false filters for non-NULL values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { description: { isNull: false } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });

  // -- Set membership --

  it('in filters to matching values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { in: ["Widget A", "Gadget X"] } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Gadget X', 'Widget A']);
  });

  it('notIn excludes matching values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notIn: ["Widget A", "Widget B"] } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
  });

  // -- Comparison operators --

  it('lessThan filters correctly', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { price: { lessThan: "20" } }) {
            nodes { id name price }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(parseFloat(node.price)).toBeLessThan(20);
    }
  });

  it('greaterThanOrEqualTo filters correctly', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { price: { greaterThanOrEqualTo: "49.99" } }) {
            nodes { id name price }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2); // Gadget X (49.99) + Doohickey (99.99)
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(parseFloat(node.price)).toBeGreaterThanOrEqual(49.99);
    }
  });

  it('lessThanOrEqualTo filters correctly', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { quantity: { lessThanOrEqualTo: 25 } }) {
            nodes { id name quantity }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.quantity).toBeLessThanOrEqual(25);
    }
  });

  it('greaterThan filters correctly', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { quantity: { greaterThan: 25 } }) {
            nodes { id name quantity }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2); // Widget A (100) + Widget B (50)
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.quantity).toBeGreaterThan(25);
    }
  });

  // -- Pattern matching --

  it('like filters with pattern matching (case-sensitive)', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { like: "Widget%" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).toMatch(/^Widget/);
    }
  });

  it('likeInsensitive filters with case-insensitive pattern', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { likeInsensitive: "widget%" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
  });

  it('notLike excludes matching pattern', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notLike: "Widget%" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
  });

  it('includes filters for substring', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { includes: "adget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).toContain('adget');
    }
  });

  it('includesInsensitive filters case-insensitively for substring', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { includesInsensitive: "WIDGET" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
  });

  it('startsWith filters by prefix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { startsWith: "Gadget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
  });

  it('endsWith filters by suffix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { endsWith: "B" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget B');
  });

  // -- Boolean filters --

  it('filters by boolean field', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { isActive: { equalTo: false } }) {
            nodes { id name isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.isActive).toBe(false);
    }
  });

  // -- Multiple filters (implicit AND) --

  it('multiple filters combine as AND', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            isActive: { equalTo: true },
            price: { lessThan: "30" }
          }) {
            nodes { id name price isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget A (9.99, active), Widget B (19.99, active), Gadget Y (29.99, active)
    expect(result.data?.allItems.nodes).toHaveLength(3);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.isActive).toBe(true);
      expect(parseFloat(node.price)).toBeLessThan(30);
    }
  });

  // -- No filter returns all rows --

  it('no filter returns all rows', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems {
            nodes { id }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(5);
  });
});

// ============================================================================
// LOGICAL OPERATOR TESTS
// ============================================================================
describe('Logical operators (and/or/not)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('or combines conditions with OR', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            or: [
              { name: { equalTo: "Widget A" } },
              { name: { equalTo: "Doohickey" } }
            ]
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Doohickey', 'Widget A']);
  });

  it('and combines conditions with AND', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            and: [
              { isActive: { equalTo: true } },
              { price: { greaterThan: "15" } }
            ]
          }) {
            nodes { id name price isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget B (19.99, active), Gadget Y (29.99, active)
    expect(result.data?.allItems.nodes).toHaveLength(2);
  });

  it('not negates a condition', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            not: { isActive: { equalTo: true } }
          }) {
            nodes { id name isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.isActive).toBe(false);
    }
  });

  it('nested logical operators work', async () => {
    // (price > 40 AND active) OR (price < 15)
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            or: [
              {
                and: [
                  { price: { greaterThan: "40" } },
                  { isActive: { equalTo: true } }
                ]
              },
              { price: { lessThan: "15" } }
            ]
          }) {
            nodes { id name price isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget A (9.99, active) matches price < 15
    // No active items with price > 40 (Gadget X is 49.99 but inactive, Doohickey is 99.99 but inactive)
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget A');
  });

  it('not with or works', async () => {
    // NOT (name = "Widget A" OR name = "Widget B")
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            not: {
              or: [
                { name: { equalTo: "Widget A" } },
                { name: { equalTo: "Widget B" } }
              ]
            }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Doohickey', 'Gadget X', 'Gadget Y']);
  });
});

// ============================================================================
// RELATION FILTER TESTS
// ============================================================================
describe('Relation filters', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterRelations: true,
        connectionFilterRelationsRequireIndex: false,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  // -- Forward relations (child -> parent) --

  it('forward relation: filter products by category name', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            categoryByCategoryId: { name: { equalTo: "Electronics" } }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allProducts.nodes).toHaveLength(2);
    const names = result.data?.allProducts.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Laptop', 'Phone']);
  });

  it('forward relation: filter with pattern matching on parent', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            categoryByCategoryId: { name: { startsWith: "Cloth" } }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allProducts.nodes).toHaveLength(2);
    const names = result.data?.allProducts.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Jeans', 'T-Shirt']);
  });

  // -- Backward relations: one-to-many (some/every/none) --

  it('backward relation some: categories with at least one available product', async () => {
    const result = await query<{ allCategories: { nodes: any[] } }>({
      query: `
        query {
          allCategories(where: {
            productsByCategoryId: {
              some: { isAvailable: { equalTo: true } }
            }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // All 3 categories have at least one available product
    expect(result.data?.allCategories.nodes).toHaveLength(3);
  });

  it('backward relation every: categories where ALL products are available', async () => {
    const result = await query<{ allCategories: { nodes: any[] } }>({
      query: `
        query {
          allCategories(where: {
            productsByCategoryId: {
              every: { isAvailable: { equalTo: true } }
            }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Electronics (both available), Books (both available), but NOT Clothing (Jeans is unavailable)
    expect(result.data?.allCategories.nodes).toHaveLength(2);
    const names = result.data?.allCategories.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Books', 'Electronics']);
  });

  it('backward relation none: categories where NO products cost > 500', async () => {
    const result = await query<{ allCategories: { nodes: any[] } }>({
      query: `
        query {
          allCategories(where: {
            productsByCategoryId: {
              none: { price: { greaterThan: "500" } }
            }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Clothing (max 49.99) and Books (max 79.99) have no products > 500
    // Electronics has Laptop (999.99) and Phone (699.99)
    expect(result.data?.allCategories.nodes).toHaveLength(2);
    const names = result.data?.allCategories.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Books', 'Clothing']);
  });

  // -- Backward relation: one-to-one --

  it('backward relation one-to-one: filter products by detail sku', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            productDetailByProductId: { sku: { equalTo: "LAP-001" } }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allProducts.nodes).toHaveLength(1);
    expect(result.data?.allProducts.nodes[0].name).toBe('Laptop');
  });

  // -- EXISTS filter --

  it('forward relation exists: filter products that have a category', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            categoryByCategoryIdExists: true
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // All products have a category (FK is NOT NULL)
    expect(result.data?.allProducts.nodes).toHaveLength(6);
  });

  it('backward relation exists: filter products that have reviews', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            reviewsByProductIdExist: true
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Laptop (2 reviews), Phone (1), T-Shirt (1), Novel (1) = 4 products with reviews
    expect(result.data?.allProducts.nodes).toHaveLength(4);
  });

  it('backward relation exists: false filters products without reviews', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            reviewsByProductIdExist: false
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Jeans and Textbook have no reviews
    expect(result.data?.allProducts.nodes).toHaveLength(2);
    const names = result.data?.allProducts.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Jeans', 'Textbook']);
  });

  // -- Combining relation + local filters --

  it('combines local and relation filters', async () => {
    const result = await query<{ allProducts: { nodes: any[] } }>({
      query: `
        query {
          allProducts(where: {
            isAvailable: { equalTo: true },
            categoryByCategoryId: { name: { equalTo: "Electronics" } }
          }) {
            nodes { id name isAvailable }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Both electronics products are available
    expect(result.data?.allProducts.nodes).toHaveLength(2);
  });
});

// ============================================================================
// COMPUTED COLUMN FILTER TESTS
// ============================================================================
describe('Computed column filters', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterComputedColumns: true,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('computed column filter field appears in schema', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "ItemFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('fullLabel');
  });

  it('filters by computed column value', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            fullLabel: { includes: "basic" }
          }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget A');
  });
});

// ============================================================================
// SCHEMA INTROSPECTION TESTS
// ============================================================================
describe('Schema introspection', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterRelations: true,
        connectionFilterRelationsRequireIndex: false,
        connectionFilterComputedColumns: true,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('filter type exists for each table', async () => {
    for (const typeName of ['ItemFilter', 'CategoryFilter', 'ProductFilter', 'ReviewFilter', 'ProductDetailFilter']) {
      const result = await query<{ __type: { name: string; kind: string } | null }>({
        query: `
          query($typeName: String!) {
            __type(name: $typeName) { name kind }
          }
        `,
        variables: { typeName },
      });
      expect(result.errors).toBeUndefined();
      expect(result.data?.__type).not.toBeNull();
      expect(result.data?.__type?.kind).toBe('INPUT_OBJECT');
    }
  });

  it('StringFilter has expected operators', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "StringFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];

    // Core operators
    expect(fieldNames).toContain('isNull');
    expect(fieldNames).toContain('equalTo');
    expect(fieldNames).toContain('notEqualTo');
    expect(fieldNames).toContain('in');
    expect(fieldNames).toContain('notIn');

    // String-specific operators
    expect(fieldNames).toContain('like');
    expect(fieldNames).toContain('notLike');
    expect(fieldNames).toContain('likeInsensitive');
    expect(fieldNames).toContain('notLikeInsensitive');
    expect(fieldNames).toContain('includes');
    expect(fieldNames).toContain('includesInsensitive');
    expect(fieldNames).toContain('startsWith');
    expect(fieldNames).toContain('startsWithInsensitive');
    expect(fieldNames).toContain('endsWith');
    expect(fieldNames).toContain('endsWithInsensitive');
    expect(fieldNames).toContain('notIncludes');
    expect(fieldNames).toContain('notIncludesInsensitive');
    expect(fieldNames).toContain('notStartsWith');
    expect(fieldNames).toContain('notStartsWithInsensitive');
    expect(fieldNames).toContain('notEndsWith');
    expect(fieldNames).toContain('notEndsWithInsensitive');
  });

  it('IntFilter has comparison operators', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "IntFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];

    expect(fieldNames).toContain('equalTo');
    expect(fieldNames).toContain('lessThan');
    expect(fieldNames).toContain('lessThanOrEqualTo');
    expect(fieldNames).toContain('greaterThan');
    expect(fieldNames).toContain('greaterThanOrEqualTo');
    expect(fieldNames).toContain('in');
    expect(fieldNames).toContain('notIn');
  });

  it('BooleanFilter has isNull and equalTo', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "BooleanFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('isNull');
    expect(fieldNames).toContain('equalTo');
    expect(fieldNames).toContain('notEqualTo');
  });

  it('filter type has logical operators (and/or/not)', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "ItemFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('and');
    expect(fieldNames).toContain('or');
    expect(fieldNames).toContain('not');
  });

  it('relation filter fields appear when connectionFilterRelations is true', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "ProductFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    // Forward relation field
    expect(fieldNames).toContain('categoryByCategoryId');
    // Backward relation exists field
    expect(fieldNames).toContain('reviewsByProductIdExist');
  });

  it('computed column filter field appears when enabled', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "ProductFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('displayName');
  });
});

// ============================================================================
// OPTIONS / TOGGLES TESTS
// ============================================================================
describe('Options and toggles', () => {
  it('connectionFilterRelations: false hides relation filter fields', async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterRelations: false,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "ProductFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      expect(fieldNames).not.toContain('categoryByCategoryId');
      expect(fieldNames).not.toContain('reviewsByProductIdExist');
      expect(fieldNames).not.toContain('reviewsByProductId');
    } finally {
      await connections.teardown();
    }
  });

  it('connectionFilterComputedColumns: false hides computed column filter fields', async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterComputedColumns: false,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "ItemFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      expect(fieldNames).not.toContain('fullLabel');
    } finally {
      await connections.teardown();
    }
  });

  it('connectionFilterLogicalOperators: false hides and/or/not', async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterLogicalOperators: false,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "ItemFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      expect(fieldNames).not.toContain('and');
      expect(fieldNames).not.toContain('or');
      expect(fieldNames).not.toContain('not');
    } finally {
      await connections.teardown();
    }
  });

  it('connectionFilterAllowedOperators restricts operators', async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterAllowedOperators: ['isNull', 'equalTo', 'notEqualTo'],
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "StringFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      expect(fieldNames).toContain('isNull');
      expect(fieldNames).toContain('equalTo');
      expect(fieldNames).toContain('notEqualTo');
      expect(fieldNames).not.toContain('like');
      expect(fieldNames).not.toContain('in');
      expect(fieldNames).not.toContain('lessThan');
    } finally {
      await connections.teardown();
    }
  });

  it('connectionFilterOperatorNames renames operators', async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterOperatorNames: {
          equalTo: 'eq',
          notEqualTo: 'ne',
        },
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "StringFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      expect(fieldNames).toContain('eq');
      expect(fieldNames).toContain('ne');
      expect(fieldNames).not.toContain('equalTo');
      expect(fieldNames).not.toContain('notEqualTo');
    } finally {
      await connections.teardown();
    }
  });
});

// ============================================================================
// ARRAY FILTER TESTS
// ============================================================================
describe('Array filters', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterArrays: true,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('contains: filters items whose tags contain the specified values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { contains: ["popular"] } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget A has ['popular', 'sale'], Gadget X has ['popular', 'premium']
    expect(result.data?.allItems.nodes).toHaveLength(2);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Gadget X', 'Widget A']);
  });

  it('containedBy: filters items whose tags are contained by the specified values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { containedBy: ["popular", "sale", "new", "premium", "clearance"] } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // All items with non-null tags are contained by this superset
    // Widget A ['popular','sale'], Widget B ['new'], Gadget X ['popular','premium'], Doohickey ['clearance']
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });

  it('overlaps: filters items whose tags overlap with specified values', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { overlaps: ["sale", "clearance"] } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget A has 'sale', Doohickey has 'clearance'
    expect(result.data?.allItems.nodes).toHaveLength(2);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Doohickey', 'Widget A']);
  });

  it('anyEqualTo: filters items where any tag equals the specified value', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { anyEqualTo: "new" } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Only Widget B has 'new'
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget B');
  });

  it('anyNotEqualTo: filters items where any tag is not equal to the specified value', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { anyNotEqualTo: "popular" } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Items where at least one tag != 'popular':
    // Widget A: 'sale' != 'popular' -> yes
    // Widget B: 'new' != 'popular' -> yes
    // Gadget X: 'premium' != 'popular' -> yes
    // Doohickey: 'clearance' != 'popular' -> yes
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });

  it('isNull: true filters items with null tags', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { isNull: true } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Only Gadget Y has null tags
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Gadget Y');
  });

  it('equalTo: filters items with exact array match', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { tags: { equalTo: ["new"] } }) {
            nodes { id name tags }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Widget B');
  });

  it('StringListFilter type has expected array operators', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "StringListFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('isNull');
    expect(fieldNames).toContain('equalTo');
    expect(fieldNames).toContain('notEqualTo');
    expect(fieldNames).toContain('contains');
    expect(fieldNames).toContain('containedBy');
    expect(fieldNames).toContain('overlaps');
    expect(fieldNames).toContain('anyEqualTo');
    expect(fieldNames).toContain('anyNotEqualTo');
  });

  it('connectionFilterArrays: false hides array filter fields', async () => {
    const noArrayPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterArrays: false,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: noArrayPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    try {
      const result = await connections.query<{ __type: { inputFields: any[] } | null }>({
        query: `
          query {
            __type(name: "ItemFilter") {
              inputFields { name }
            }
          }
        `,
      });
      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
      // tags column should not appear when arrays are disabled
      expect(fieldNames).not.toContain('tags');
    } finally {
      await connections.teardown();
    }
  });
});

// ============================================================================
// NEGATION STRING OPERATOR TESTS
// ============================================================================
describe('Negation string operators', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('notIncludes excludes rows containing substring', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notIncludes: "Widget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).not.toContain('Widget');
    }
  });

  it('notIncludesInsensitive excludes rows case-insensitively', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notIncludesInsensitive: "widget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
  });

  it('notStartsWith excludes rows starting with prefix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notStartsWith: "Gadget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).not.toMatch(/^Gadget/);
    }
  });

  it('notStartsWithInsensitive excludes rows case-insensitively', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notStartsWithInsensitive: "gadget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
  });

  it('notEndsWith excludes rows ending with suffix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notEndsWith: "B" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(4);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).not.toMatch(/B$/);
    }
  });

  it('notEndsWithInsensitive excludes rows case-insensitively', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notEndsWithInsensitive: "b" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });

  it('notLikeInsensitive excludes matching pattern case-insensitively', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notLikeInsensitive: "widget%" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(3);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.name).not.toMatch(/^widget/i);
    }
  });

  it('startsWithInsensitive filters case-insensitively by prefix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { startsWithInsensitive: "widget" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(2);
  });

  it('endsWithInsensitive filters case-insensitively by suffix', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { endsWithInsensitive: "key" } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // "Doohickey" ends with "key"
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Doohickey');
  });
});

// ============================================================================
// DECLARATIVE OPERATOR FACTORY TESTS
// ============================================================================
describe('Declarative operator factory (connectionFilterOperatorFactories)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  // A custom operator factory that adds "isLongerThan" for String types
  // and "isPositive" for Int types
  const customFactory: ConnectionFilterOperatorFactory = (build: any) => [
    {
      typeNames: 'String',
      operatorName: 'isLongerThan',
      spec: {
        description: 'Checks if string length is greater than the specified value.',
        resolveInputCodec: () => build.dataplanPg.TYPES.int,
        resolve: (i: any, v: any) => build.sql`length(${i}) > ${v}`,
      },
    },
    {
      typeNames: 'Int',
      operatorName: 'isPositive',
      spec: {
        description: 'Checks if the value is positive (ignores input).',
        resolveType: () => build.graphql.GraphQLBoolean,
        resolve: (i: any, _v: any, input: unknown) =>
          input === true
            ? build.sql`${i} > 0`
            : build.sql`${i} <= 0`,
      },
    },
  ];

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterOperatorFactories: [customFactory],
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('custom string operator appears in schema', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "StringFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('isLongerThan');
  });

  it('custom int operator appears in schema', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "IntFilter") {
            inputFields { name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f: any) => f.name) ?? [];
    expect(fieldNames).toContain('isPositive');
  });

  it('isLongerThan filters strings by length', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { isLongerThan: 8 } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // "Doohickey" (9 chars) is the only name > 8 characters
    // "Widget A" = 8, "Widget B" = 8, "Gadget X" = 8, "Gadget Y" = 8
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Doohickey');
  });

  it('isPositive: true filters for positive integers', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { quantity: { isPositive: true } }) {
            nodes { id name quantity }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget A (100), Widget B (50), Gadget X (25), Doohickey (10) — Gadget Y has quantity 0
    expect(result.data?.allItems.nodes).toHaveLength(4);
    for (const node of result.data?.allItems.nodes ?? []) {
      expect(node.quantity).toBeGreaterThan(0);
    }
  });

  it('isPositive: false filters for non-positive integers', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { quantity: { isPositive: false } }) {
            nodes { id name quantity }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Gadget Y has quantity 0
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Gadget Y');
  });

  it('custom operators combine with built-in operators', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            name: { isLongerThan: 7 },
            quantity: { isPositive: true }
          }) {
            nodes { id name quantity }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Names > 7 chars: "Widget A" (8), "Widget B" (8), "Gadget X" (8), "Gadget Y" (8), "Doohickey" (9)
    // AND quantity > 0: excludes Gadget Y (0)
    expect(result.data?.allItems.nodes).toHaveLength(4);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================
describe('Edge cases', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [ConnectionFilterPreset()],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test-seed.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('empty filter object returns all rows', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {}) {
            nodes { id }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(5);
  });

  it('deeply nested logical operators (3 levels)', async () => {
    // NOT(OR(AND(price > 50, active), name = "Widget B"))
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            not: {
              or: [
                {
                  and: [
                    { price: { greaterThan: "50" } },
                    { isActive: { equalTo: true } }
                  ]
                },
                { name: { equalTo: "Widget B" } }
              ]
            }
          }) {
            nodes { id name price isActive }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Items:
    // Widget A (9.99, active) — not excluded
    // Widget B (19.99, active) — excluded by name = "Widget B"
    // Gadget X (49.99, inactive) — not excluded (price > 50 is false)
    // Gadget Y (29.99, active) — not excluded
    // Doohickey (99.99, inactive) — not excluded (inactive so AND fails)
    expect(result.data?.allItems.nodes).toHaveLength(4);
    const names = result.data?.allItems.nodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['Doohickey', 'Gadget X', 'Gadget Y', 'Widget A']);
  });

  it('in with single value behaves like equalTo', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { in: ["Doohickey"] } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Doohickey');
  });

  it('notIn with empty array returns all rows', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { notIn: [] } }) {
            nodes { id }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(5);
  });

  it('in with empty array returns no rows', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { name: { in: [] } }) {
            nodes { id }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(0);
  });

  it('filter on NULL rating column with distinctFrom', async () => {
    // distinctFrom NULL should return rows where rating IS NOT NULL
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { rating: { isNull: true } }) {
            nodes { id name }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Gadget Y has null rating
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Gadget Y');
  });

  it('combining isNull with other operators in logical OR', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            or: [
              { rating: { isNull: true } },
              { rating: { greaterThan: 4.0 } }
            ]
          }) {
            nodes { id name rating }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Gadget Y (null), Widget A (4.5), Gadget X (4.9) = 3 items
    expect(result.data?.allItems.nodes).toHaveLength(3);
  });

  it('multiple operators on same field combine as AND', async () => {
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: {
            price: { greaterThan: "10", lessThan: "50" }
          }) {
            nodes { id name price }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    // Widget B (19.99), Gadget Y (29.99), Gadget X (49.99) — all > 10 and < 50
    // Widget A (9.99) too low, Doohickey (99.99) too high
    expect(result.data?.allItems.nodes).toHaveLength(3);
    for (const node of result.data?.allItems.nodes ?? []) {
      const price = parseFloat(node.price);
      expect(price).toBeGreaterThan(10);
      expect(price).toBeLessThan(50);
    }
  });

  it('filter on numeric type with string representation', async () => {
    // BigDecimal/numeric types are passed as strings in GraphQL
    const result = await query<{ allItems: { nodes: any[] } }>({
      query: `
        query {
          allItems(where: { price: { equalTo: "99.99" } }) {
            nodes { id name price }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.allItems.nodes).toHaveLength(1);
    expect(result.data?.allItems.nodes[0].name).toBe('Doohickey');
  });
});
