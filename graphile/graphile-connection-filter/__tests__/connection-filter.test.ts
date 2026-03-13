import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from '../src';

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
          allItems(filter: { name: { equalTo: "Widget A" } }) {
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
          allItems(filter: { name: { notEqualTo: "Widget A" } }) {
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
          allItems(filter: { description: { distinctFrom: "A basic widget" } }) {
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
          allItems(filter: { description: { notDistinctFrom: "A basic widget" } }) {
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
          allItems(filter: { description: { isNull: true } }) {
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
          allItems(filter: { description: { isNull: false } }) {
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
          allItems(filter: { name: { in: ["Widget A", "Gadget X"] } }) {
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
          allItems(filter: { name: { notIn: ["Widget A", "Widget B"] } }) {
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
          allItems(filter: { price: { lessThan: "20" } }) {
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
          allItems(filter: { price: { greaterThanOrEqualTo: "49.99" } }) {
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
          allItems(filter: { quantity: { lessThanOrEqualTo: 25 } }) {
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
          allItems(filter: { quantity: { greaterThan: 25 } }) {
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
          allItems(filter: { name: { like: "Widget%" } }) {
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
          allItems(filter: { name: { likeInsensitive: "widget%" } }) {
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
          allItems(filter: { name: { notLike: "Widget%" } }) {
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
          allItems(filter: { name: { includes: "adget" } }) {
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
          allItems(filter: { name: { includesInsensitive: "WIDGET" } }) {
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
          allItems(filter: { name: { startsWith: "Gadget" } }) {
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
          allItems(filter: { name: { endsWith: "B" } }) {
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
          allItems(filter: { isActive: { equalTo: false } }) {
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
          allItems(filter: {
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
          allItems(filter: {
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
          allItems(filter: {
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
          allItems(filter: {
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
          allItems(filter: {
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
          allItems(filter: {
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
          allProducts(filter: {
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
          allProducts(filter: {
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
          allCategories(filter: {
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
          allCategories(filter: {
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
          allCategories(filter: {
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
          allProducts(filter: {
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
          allProducts(filter: {
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
          allProducts(filter: {
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
          allProducts(filter: {
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
          allProducts(filter: {
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
          allItems(filter: {
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
