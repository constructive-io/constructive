/**
 * Integration test suite for ConstructivePreset
 *
 * Exercises multiple plugins working together in a single test database:
 * - Connection filter (scalar operators, logical operators, relation filters)
 * - PostGIS spatial filters (geometry column)
 * - pgvector (vector column, search function, distance ordering)
 * - tsvector search plugin (fullText matches, rank, orderBy)
 * - BM25 search (pg_textsearch body index, score, orderBy)
 *
 * Requires postgres-plus:18 image with postgis, vector, pg_textsearch extensions.
 */
import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { ConstructivePreset } from '../src/presets/constructive-preset';

const SCHEMA = 'integration_test';
const sqlFile = (f: string) => join(__dirname, '../sql', f);

type QueryFn = GraphQLQueryFnObj;

// ============================================================================
// SHARED SETUP
// ============================================================================
let teardown: () => Promise<void>;
let query: QueryFn;

beforeAll(async () => {
  const testPreset = {
    extends: [ConstructivePreset],
  };

  const connections = await getConnectionsObject(
    {
      schemas: [SCHEMA],
      preset: testPreset,
      useRoot: true,
    },
    [seed.sqlfile([sqlFile('integration-seed.sql')])]
  );

  teardown = connections.teardown;
  query = connections.query;
}, 30000);

afterAll(async () => {
  if (teardown) {
    await teardown();
  }
});

// ============================================================================
// SCHEMA INTROSPECTION
// ============================================================================
describe('Schema introspection', () => {
  it('LocationFilter type exists and has scalar filter fields', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "LocationFilter") {
            inputFields { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
    // Scalar fields
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('isActive');
    expect(fieldNames).toContain('rating');
    // Logical operators
    expect(fieldNames).toContain('and');
    expect(fieldNames).toContain('or');
    expect(fieldNames).toContain('not');
  });

  it('LocationFilter has relation filter fields', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "LocationFilter") {
            inputFields { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
    // Forward relation (location -> category)
    expect(fieldNames).toContain('category');
    // Backward relation (location <- tags)
    expect(fieldNames).toContain('tags');
    expect(fieldNames).toContain('tagsExist');
  });

  it('LocationFilter has tsvector search field', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "LocationFilter") {
            inputFields { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
    // tsvector search via PgSearchPlugin (prefix: fullText)
    expect(fieldNames).toContain('fullTextTsv');
  });

  it('Location type has vector embedding field', async () => {
    const result = await query<{ __type: { fields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "Location") {
            fields { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain('embedding');
  });

  it('locations connection exists and has filter argument but no condition', async () => {
    const result = await query<{ __type: { fields: { name: string; args: { name: string }[] }[] } | null }>({
      query: `
        query {
          __type(name: "Query") {
            fields {
              name
              args { name }
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const locations = result.data?.__type?.fields?.find((f) => f.name === 'locations');
    expect(locations).toBeDefined();
    const argNames = locations?.args?.map((a) => a.name) ?? [];
    expect(argNames).toContain('filter');
    // condition should NOT be present (we disabled it)
    expect(argNames).not.toContain('condition');
  });
});

// ============================================================================
// SCALAR + LOGICAL FILTERS
// ============================================================================
describe('Scalar and logical filters', () => {
  it('filters by string equalTo', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: { name: { equalTo: "MoMA" } }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.locations.nodes).toHaveLength(1);
    expect(result.data?.locations.nodes[0].name).toBe('MoMA');
  });

  it('filters by boolean field', async () => {
    const result = await query<{ locations: { nodes: { name: string; isActive: boolean }[] } }>({
      query: `
        query {
          locations(filter: { isActive: { equalTo: false } }) {
            nodes { name isActive }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Only Times Square Diner is inactive
    expect(result.data?.locations.nodes).toHaveLength(1);
    expect(result.data?.locations.nodes[0].name).toBe('Times Square Diner');
  });

  it('filters by numeric comparison', async () => {
    const result = await query<{ locations: { nodes: { name: string; rating: number }[] } }>({
      query: `
        query {
          locations(filter: { rating: { greaterThanOrEqualTo: "4.7" } }) {
            nodes { name rating }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations.nodes ?? [];
    // Brooklyn Bridge Park (4.8), MoMA (4.7), High Line Park (4.9)
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      expect(parseFloat(String(node.rating))).toBeGreaterThanOrEqual(4.7);
    }
  });

  it('isNull filters for NULL rating', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: { rating: { isNull: true } }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Only Prospect Park has NULL rating
    expect(result.data?.locations.nodes).toHaveLength(1);
    expect(result.data?.locations.nodes[0].name).toBe('Prospect Park');
  });

  it('OR combines conditions', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            or: [
              { name: { equalTo: "MoMA" } },
              { name: { equalTo: "Met Museum" } }
            ]
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.locations.nodes).toHaveLength(2);
    const names = result.data?.locations.nodes.map((n) => n.name).sort();
    expect(names).toEqual(['Met Museum', 'MoMA']);
  });

  it('NOT negates a condition', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            not: { isActive: { equalTo: false } }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // 6 active locations (all except Times Square Diner)
    expect(result.data?.locations.nodes).toHaveLength(6);
  });

  it('no filter returns all rows', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.locations.nodes).toHaveLength(7);
  });
});

// ============================================================================
// TSVECTOR SEARCH (PgSearchPlugin)
// ============================================================================
describe('tsvector search (PgSearchPlugin)', () => {
  it('fullTextTsv matches filters by text search', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: { fullTextTsv: "coffee" }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Only Central Park Cafe has "coffee" in tsv
    expect(result.data?.locations.nodes).toHaveLength(1);
    expect(result.data?.locations.nodes[0].name).toBe('Central Park Cafe');
  });

  it('fullTextTsv with broad term matches multiple rows', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: { fullTextTsv: "park" }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Central Park Cafe, Brooklyn Bridge Park, High Line Park, Prospect Park
    // all have "park" in tsv
    const names = result.data?.locations.nodes.map((n) => n.name).sort();
    expect(names).toContain('Central Park Cafe');
    expect(names).toContain('Brooklyn Bridge Park');
  });

  it('tsvector search combined with scalar filter', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            fullTextTsv: "park",
            isActive: { equalTo: true }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // All park locations are active, so same result
    expect(result.data?.locations.nodes.length).toBeGreaterThanOrEqual(2);
    for (const node of result.data?.locations.nodes ?? []) {
      expect(node.name).toBeDefined();
    }
  });
});

// ============================================================================
// PGVECTOR
// ============================================================================
describe('pgvector', () => {
  it('exposes embedding as array of floats', async () => {
    const result = await query<{ locations: { nodes: { name: string; embedding: number[] }[] } }>({
      query: `
        query {
          locations(filter: { name: { equalTo: "Central Park Cafe" } }) {
            nodes {
              name
              embedding
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const doc = result.data?.locations.nodes[0];
    expect(doc?.embedding).toEqual([1, 0, 0]);
  });

  it('vector search function returns results ordered by similarity', async () => {
    const result = await query<{ searchLocations: { nodes: { name: string; embedding: number[] }[] } }>({
      query: `
        query {
          searchLocations(queryEmbedding: [1, 0, 0]) {
            nodes {
              name
              embedding
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.searchLocations?.nodes;
    expect(nodes).toBeDefined();
    expect(nodes!.length).toBeGreaterThan(0);
    // Central Park Cafe [1,0,0] should be closest to query [1,0,0]
    expect(nodes![0].name).toBe('Central Park Cafe');
  });

  it('vector search respects result_limit', async () => {
    const result = await query<{ searchLocations: { nodes: { name: string }[] } }>({
      query: `
        query {
          searchLocations(queryEmbedding: [1, 0, 0], resultLimit: 2) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.searchLocations?.nodes?.length).toBe(2);
  });
});

// ============================================================================
// POSTGIS SPATIAL FILTERS
// ============================================================================
describe('PostGIS spatial filters', () => {
  it('geom column is exposed as GeoJSON', async () => {
    const result = await query<{ locations: { nodes: { name: string; geom: unknown }[] } }>({
      query: `
        query {
          locations(filter: { name: { equalTo: "Central Park Cafe" } }) {
            nodes {
              name
              geom { geojson }
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const loc = result.data?.locations.nodes[0];
    expect(loc).toBeDefined();
    expect(loc?.geom).toBeDefined();
  });
});

// ============================================================================
// RELATION FILTERS
// ============================================================================
describe('Relation filters', () => {
  it('forward relation: filter locations by category name', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            category: { name: { equalTo: "Parks" } }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Brooklyn Bridge Park, High Line Park, Prospect Park
    expect(result.data?.locations.nodes).toHaveLength(3);
    const names = result.data?.locations.nodes.map((n) => n.name).sort();
    expect(names).toEqual(['Brooklyn Bridge Park', 'High Line Park', 'Prospect Park']);
  });

  it('backward relation some: categories with at least one active location', async () => {
    const result = await query<{ categories: { nodes: { name: string }[] } }>({
      query: `
        query {
          categories(filter: {
            locations: {
              some: { isActive: { equalTo: true } }
            }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // All 3 categories have at least one active location
    expect(result.data?.categories.nodes).toHaveLength(3);
  });

  it('backward relation none: categories with NO inactive locations', async () => {
    const result = await query<{ categories: { nodes: { name: string }[] } }>({
      query: `
        query {
          categories(filter: {
            locations: {
              none: { isActive: { equalTo: false } }
            }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Parks (all active) and Museums (all active) — Restaurants has Times Square Diner (inactive)
    expect(result.data?.categories.nodes).toHaveLength(2);
    const names = result.data?.categories.nodes.map((n) => n.name).sort();
    expect(names).toEqual(['Museums', 'Parks']);
  });

  it('backward relation exists: locations that have tags', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            tagsExist: true
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // All locations except none — wait, let me check. Locations 1-7 all have tags
    expect(result.data?.locations.nodes).toHaveLength(7);
  });

  it('combines relation filter with scalar filter', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            category: { name: { equalTo: "Restaurants" } },
            isActive: { equalTo: true }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Only Central Park Cafe (active restaurant; Times Square Diner is inactive)
    expect(result.data?.locations.nodes).toHaveLength(1);
    expect(result.data?.locations.nodes[0].name).toBe('Central Park Cafe');
  });
});

// ============================================================================
// BM25 SEARCH (pg_textsearch)
// ============================================================================
describe('BM25 search (pg_textsearch)', () => {
  it('BM25 filter field exists on LocationFilter', async () => {
    const result = await query<{ __type: { inputFields: { name: string }[] } | null }>({
      query: `
        query {
          __type(name: "LocationFilter") {
            inputFields { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
    // BM25 auto-discovers indexes — should create bm25Body filter field
    expect(fieldNames).toContain('bm25Body');
  });

  it('BM25 search filters by body text', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            bm25Body: { query: "museum art" }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations?.nodes ?? [];
    // MoMA and Met Museum have "museum" and "art" in body
    expect(nodes.length).toBeGreaterThan(0);
    const names = nodes.map((n) => n.name);
    expect(names).toContain('MoMA');
  });

  it('BM25 score field is populated when filter is active', async () => {
    const result = await query<{ locations: { nodes: { name: string; bm25BodyScore: number | null }[] } }>({
      query: `
        query {
          locations(filter: {
            bm25Body: { query: "park" }
          }) {
            nodes {
              name
              bm25BodyScore
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.bm25BodyScore).toBeDefined();
      expect(typeof node.bm25BodyScore).toBe('number');
      // BM25 scores are non-null numbers when filter is active
      expect(node.bm25BodyScore).not.toBeNull();
    }
  });

  it('BM25 score is null when no BM25 filter is active', async () => {
    const result = await query<{ locations: { nodes: { name: string; bm25BodyScore: number | null }[] } }>({
      query: `
        query {
          locations(first: 1) {
            nodes {
              name
              bm25BodyScore
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const node = result.data?.locations?.nodes?.[0];
    expect(node?.bm25BodyScore).toBeNull();
  });

  it('BM25 orderBy sorts by relevance', async () => {
    const result = await query<{ locations: { nodes: { name: string; bm25BodyScore: number }[] } }>({
      query: `
        query {
          locations(
            filter: { bm25Body: { query: "park" } }
            orderBy: BM25_BODY_SCORE_ASC
          ) {
            nodes {
              name
              bm25BodyScore
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(1);
    // ASC = most negative first (most relevant first)
    for (let i = 0; i < nodes.length - 1; i++) {
      expect(nodes[i].bm25BodyScore).toBeLessThanOrEqual(nodes[i + 1].bm25BodyScore);
    }
  });
});

// ============================================================================
// KITCHEN SINK: multiple plugins in one query
// ============================================================================
describe('Kitchen sink (multi-plugin queries)', () => {
  it('combines tsvector search + scalar filter + relation filter', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            fullTextTsv: "park",
            isActive: { equalTo: true },
            category: { name: { equalTo: "Parks" } }
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Active parks with "park" in tsv
    const nodes = result.data?.locations.nodes ?? [];
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    for (const node of nodes) {
      expect(node.name).toBeDefined();
    }
  });

  it('combines BM25 + scalar filter', async () => {
    const result = await query<{ locations: { nodes: { name: string; bm25BodyScore: number }[] } }>({
      query: `
        query {
          locations(filter: {
            bm25Body: { query: "museum" },
            isActive: { equalTo: true }
          }) {
            nodes {
              name
              bm25BodyScore
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    // All returned should be active and have BM25 scores
    for (const node of nodes) {
      expect(node.bm25BodyScore).toBeDefined();
      expect(typeof node.bm25BodyScore).toBe('number');
    }
  });

  it('combines OR with tsvector and scalar filters', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(filter: {
            or: [
              { fullTextTsv: "coffee" },
              { name: { equalTo: "MoMA" } }
            ]
          }) {
            nodes { name }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Coffee -> Central Park Cafe, MoMA -> MoMA
    expect(result.data?.locations.nodes).toHaveLength(2);
    const names = result.data?.locations.nodes.map((n) => n.name).sort();
    expect(names).toEqual(['Central Park Cafe', 'MoMA']);
  });

  it('vector search + filter on results', async () => {
    // Use the search function to find nearest neighbors, then check we can also query filtered
    const searchResult = await query<{ searchLocations: { nodes: { name: string; embedding: number[] }[] } }>({
      query: `
        query {
          searchLocations(queryEmbedding: [0, 1, 0], resultLimit: 3) {
            nodes {
              name
              embedding
            }
          }
        }
      `,
    });

    expect(searchResult.errors).toBeUndefined();
    const nodes = searchResult.data?.searchLocations?.nodes ?? [];
    expect(nodes).toHaveLength(3);
    // Brooklyn Bridge Park [0,1,0] should be closest
    expect(nodes[0].name).toBe('Brooklyn Bridge Park');
  });

  it('mega query: BM25 + tsvector + pgvector + PostGIS + relation filter + scalar in ONE query', async () => {
    // This is the ultimate integration test: all SIX plugin types combined in a single filter
    // A bounding box covering NYC (approx -74.1 to -73.9 longitude, 40.6 to 40.8 latitude)
    const nycBbox = {
      type: 'Polygon',
      coordinates: [[[-74.1, 40.6], [-73.9, 40.6], [-73.9, 40.8], [-74.1, 40.8], [-74.1, 40.6]]],
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    };

    const result = await query<{
      locations: {
        nodes: {
          name: string;
          bm25BodyScore: number;
          tsvRank: number;
          embedding: number[];
          geom: { geojson: { type: string; coordinates: number[] } };
          category: { name: string };
          tags: { nodes: { label: string }[] };
        }[];
      };
    }>({
      query: `
        query MegaQuery($bbox: GeoJSON!) {
          locations(filter: {
            fullTextTsv: "park"
            bm25Body: { query: "park green" }
            category: { name: { equalTo: "Parks" } }
            isActive: { equalTo: true }
            vectorEmbedding: { nearby: { embedding: [0, 1, 0], distance: 2.0 } }
            geom: { intersects: $bbox }
          }) {
            nodes {
              name
              bm25BodyScore
              tsvRank
              embedding
              geom { geojson }
              category { name }
              tags { nodes { label } }
            }
          }
        }
      `,
      variables: { bbox: nycBbox },
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations.nodes ?? [];
    // Should return parks that match all six criteria simultaneously
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    for (const node of nodes) {
      // BM25 score populated (search active)
      expect(typeof node.bm25BodyScore).toBe('number');
      // tsvRank populated (tsvector search active)
      expect(typeof node.tsvRank).toBe('number');
      // pgvector embedding present
      expect(Array.isArray(node.embedding)).toBe(true);
      expect(node.embedding).toHaveLength(3);
      // PostGIS geom present as GeoJSON and within our bounding box
      expect(node.geom.geojson).toBeDefined();
      expect(node.geom.geojson.type).toBe('Point');
      expect(node.geom.geojson.coordinates).toHaveLength(2);
      const [lon, lat] = node.geom.geojson.coordinates;
      expect(lon).toBeGreaterThanOrEqual(-74.1);
      expect(lon).toBeLessThanOrEqual(-73.9);
      expect(lat).toBeGreaterThanOrEqual(40.6);
      expect(lat).toBeLessThanOrEqual(40.8);
      // Relation filter: all should be Parks
      expect(node.category.name).toBe('Parks');
      // Tags exist on each result
      expect(node.tags.nodes.length).toBeGreaterThan(0);
    }
  });

  it('pagination works with filters', async () => {
    const firstPage = await query<{ locations: { nodes: { name: string }[]; pageInfo: { hasNextPage: boolean } } }>({
      query: `
        query {
          locations(
            filter: { isActive: { equalTo: true } }
            first: 3
          ) {
            nodes { name }
            pageInfo { hasNextPage }
          }
        }
      `,
    });

    expect(firstPage.errors).toBeUndefined();
    expect(firstPage.data?.locations.nodes).toHaveLength(3);
    expect(firstPage.data?.locations.pageInfo.hasNextPage).toBe(true);
  });
});
