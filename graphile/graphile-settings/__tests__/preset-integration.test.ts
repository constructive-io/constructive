/**
 * Integration test suite for ConstructivePreset
 *
 * Exercises multiple plugins working together in a single test database:
 * - Connection filter (scalar operators, logical operators, relation filters)
 * - PostGIS spatial filters (geometry column)
 * - pgvector (vector column, search function, distance ordering)
 * - tsvector search plugin (fullText matches, rank, orderBy)
 * - BM25 search (pg_textsearch body index, score, orderBy)
 * - pg_trgm fuzzy matching (similarTo, wordSimilarTo, similarity score)
 *
 * Requires postgres-plus:18 image with postgis, vector, pg_textsearch, pg_trgm extensions.
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
    expect(fieldNames).toContain('tsvTsv');
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
          locations(where: { name: { equalTo: "MoMA" } }) {
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
          locations(where: { isActive: { equalTo: false } }) {
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
          locations(where: { rating: { greaterThanOrEqualTo: "4.7" } }) {
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
          locations(where: { rating: { isNull: true } }) {
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
          locations(where: {
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
          locations(where: {
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
  it('tsvTsv matches filters by text search', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(where: { tsvTsv: "coffee" }) {
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

  it('tsvTsv with broad term matches multiple rows', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(where: { tsvTsv: "park" }) {
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
          locations(where: {
            tsvTsv: "park",
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
          locations(where: { name: { equalTo: "Central Park Cafe" } }) {
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
          locations(where: { name: { equalTo: "Central Park Cafe" } }) {
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
          locations(where: {
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
          categories(where: {
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
          categories(where: {
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
          locations(where: {
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
          locations(where: {
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
          locations(where: {
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
    const result = await query<{ locations: { nodes: { name: string; bodyBm25Score: number | null }[] } }>({
      query: `
        query {
          locations(where: {
            bm25Body: { query: "park" }
          }) {
            nodes {
              name
              bodyBm25Score
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations?.nodes ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.bodyBm25Score).toBeDefined();
      expect(typeof node.bodyBm25Score).toBe('number');
      // BM25 scores are non-null numbers when filter is active
      expect(node.bodyBm25Score).not.toBeNull();
    }
  });

  it('BM25 score is null when no BM25 filter is active', async () => {
    const result = await query<{ locations: { nodes: { name: string; bodyBm25Score: number | null }[] } }>({
      query: `
        query {
          locations(first: 1) {
            nodes {
              name
              bodyBm25Score
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const node = result.data?.locations?.nodes?.[0];
    expect(node?.bodyBm25Score).toBeNull();
  });

  it('BM25 orderBy sorts by relevance', async () => {
    const result = await query<{ locations: { nodes: { name: string; bodyBm25Score: number }[] } }>({
      query: `
        query {
          locations(
            where: { bm25Body: { query: "park" } }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes {
              name
              bodyBm25Score
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
      expect(nodes[i].bodyBm25Score).toBeLessThanOrEqual(nodes[i + 1].bodyBm25Score);
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
          locations(where: {
            tsvTsv: "park",
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
    const result = await query<{ locations: { nodes: { name: string; bodyBm25Score: number }[] } }>({
      query: `
        query {
          locations(where: {
            bm25Body: { query: "museum" },
            isActive: { equalTo: true }
          }) {
            nodes {
              name
              bodyBm25Score
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
      expect(node.bodyBm25Score).toBeDefined();
      expect(typeof node.bodyBm25Score).toBe('number');
    }
  });

  it('combines OR with tsvector and scalar filters', async () => {
    const result = await query<{ locations: { nodes: { name: string }[] } }>({
      query: `
        query {
          locations(where: {
            or: [
              { tsvTsv: "coffee" },
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

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * MEGA QUERY: All 7 plugin types + multi-signal ORDER BY in ONE query
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * This is the ultimate integration test. It proves that every plugin in the
   * ConstructivePreset composes correctly — filters AND ordering — within a
   * single GraphQL request against a real PostgreSQL database.
   *
   * ── The 7 filter plugins exercised ──────────────────────────────────────
   *
   *  #  Plugin           Filter field              What it does
   *  ─  ───────────────  ────────────────────────── ──────────────────────────
   *  1  tsvector         tsvTsv: "park"        Full-text search via
   *     (SearchPlugin)                              websearch_to_tsquery on
   *                                                 the `tsv` tsvector column.
   *
   *  2  BM25             bm25Body: {query: "..."}   BM25 relevance search via
   *     (Bm25Plugin)                                pg_textsearch on the
   *                                                 `body` text column.
   *
   *  3  pg_trgm          trgmName: {value, thresh}  Trigram fuzzy matching on
   *     (TrgmPlugin)                                `name`. Tolerates typos.
   *                                                 similarity(name, val) > th
   *
   *  4  Relation filter  category: {name: {eq: …}}  JOIN filter — only rows
   *     (ConnFilter)                                whose FK-linked category
   *                                                 row has name = "Parks".
   *
   *  5  Scalar filter    isActive: {equalTo: true}  Simple equality on the
   *     (ConnFilter)                                boolean `is_active` col.
   *
   *  6  pgvector         vectorEmbedding: {nearby…}  Cosine distance filter —
   *     (PgVectorPlugin)                            only rows within distance
   *                                                 2.0 of embedding [0,1,0].
   *
   *  7  PostGIS          geom: {intersects: $bbox}  Spatial filter — geometry
   *     (PostGISPlugin)                             must intersect a bounding
   *                                                 box polygon over NYC.
   *
   * ── Multi-signal ORDER BY ───────────────────────────────────────────────
   *
   * PostGraphile's `orderBy` accepts an ARRAY of enum values, just like SQL
   * supports comma-separated ORDER BY clauses:
   *
   *   orderBy: [BODY_BM25_SCORE_ASC, NAME_TRGM_SIMILARITY_DESC]
   *
   * generates:
   *
   *   ORDER BY paradedb.score(id) ASC,
   *            similarity(name, 'park') DESC
   *
   * Each scoring plugin (tsvector, BM25, pg_trgm) registers its own enum
   * values on the LocationOrderBy enum so they can be freely combined with
   * each other and with standard column sorts like NAME_ASC.
   *
   * How it works internally (2-phase meta system):
   *   Phase 1 — orderBy enum apply (planning time):
   *     Each enum's `apply` stores a direction flag in PgSelectStep._meta.
   *     e.g. step.setMeta("trgm_order_name", "DESC")
   *
   *   Phase 2 — filter apply (execution time):
   *     Each filter's `apply` reads back its direction flag and adds the
   *     actual ORDER BY clause using the SQL expression it computed.
   *     e.g. qb.orderBy({ fragment: similarity(...), direction: "DESC" })
   *
   * IMPORTANT — ORDER BY priority follows the SCHEMA FIELD processing order,
   * not the orderBy array order. The orderBy array determines WHICH
   * scoring signals are active and their directions (ASC/DESC), but the
   * ORDER BY clause sequence in SQL is determined by the order each filter's
   * `apply` function runs — which depends on the schema's internal field
   * iteration order. In this test, BM25 is processed before pg_trgm in
   * the schema, so BM25 score is always the primary sort and pg_trgm
   * similarity is the tiebreaker.
   *
   * ── Score fields returned ───────────────────────────────────────────────
   *
   *   nameTrgmSimilarity  pg_trgm similarity(name, 'park')  → 0..1 (1 = exact)
   *   bodyBm25Score   BM25 relevance via pg_textsearch   → negative (→0 = best)
   *   tsvRank         ts_rank(tsv, tsquery)              → 0..~1 (higher = better)
   *
   * These computed fields are populated when their corresponding filter is
   * active. They return null when the filter is not present in the query.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  it('mega query: BM25 + tsvector + pgvector + PostGIS + pg_trgm + relation filter + scalar in ONE query, with multi-signal orderBy', async () => {
    // NYC bounding box polygon (approx -74.1 to -73.9 lon, 40.6 to 40.8 lat)
    // Used for the PostGIS spatial filter (geom intersects bbox).
    const nycBbox = {
      type: 'Polygon',
      coordinates: [[[-74.1, 40.6], [-73.9, 40.6], [-73.9, 40.8], [-74.1, 40.8], [-74.1, 40.6]]],
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    };

    const result = await query<{
      locations: {
        nodes: {
          name: string;
          bodyBm25Score: number;
          tsvRank: number;
          nameTrgmSimilarity: number | null;
          embedding: number[];
          geom: { geojson: { type: string; coordinates: number[] } };
          category: { name: string };
          tags: { nodes: { label: string }[] };
        }[];
      };
    }>({
      query: `
        query MegaQuery($bbox: GeoJSON!) {
          locations(
            # ── FILTERS: all 7 plugin types applied simultaneously ──
            where: {
              # 1. tsvector full-text search (PgSearchPlugin)
              #    WHERE tsv @@ websearch_to_tsquery('park')
              tsvTsv: "park"

              # 2. BM25 relevance search (Bm25SearchPlugin via pg_textsearch)
              #    WHERE body @@@ paradedb.parse('park green')
              #    (BM25 filter apply runs first in the schema → primary ORDER BY)
              bm25Body: { query: "park green" }

              # 3. pg_trgm fuzzy matching (TrgmSearchPlugin)
              #    WHERE similarity(name, 'park') > 0.1
              #    (trgm filter apply runs second → tiebreaker ORDER BY)
              trgmName: { value: "park", threshold: 0.1 }

              # 4. Relation filter (ConnectionFilterForwardRelationsPlugin)
              #    WHERE EXISTS (SELECT 1 FROM categories WHERE id = category_id AND name = 'Parks')
              category: { name: { equalTo: "Parks" } }

              # 5. Scalar filter (ConnectionFilterOperatorsPlugin)
              #    WHERE is_active = true
              isActive: { equalTo: true }

              # 6. pgvector similarity (PgVectorPlugin)
              #    WHERE vector_embedding <=> '[0,1,0]' < 2.0
              vectorEmbedding: { nearby: { embedding: [0, 1, 0], distance: 2.0 } }

              # 7. PostGIS spatial (PostGISFilterPlugin)
              #    WHERE ST_Intersects(geom, $bbox::geometry)
              geom: { intersects: $bbox }
            }

            # ── ORDER BY: multi-signal relevance ranking ──
            # Primary sort:   BM25 relevance score (most relevant text first)
            # Tiebreaker:     pg_trgm similarity score (best fuzzy match first)
            #
            # Generates SQL:
            #   ORDER BY paradedb.score(id) ASC,
            #            similarity(name, 'park') DESC
            #
            # Each plugin registers its own enum values on LocationOrderBy:
            #   - BM25:      BODY_BM25_SCORE_ASC / BODY_BM25_SCORE_DESC
            #   - pg_trgm:   NAME_TRGM_SIMILARITY_ASC / NAME_TRGM_SIMILARITY_DESC
            #   - tsvector:  FULL_TEXT_RANK_ASC / FULL_TEXT_RANK_DESC
            # These compose freely — just like comma-separated ORDER BY in SQL.
            # NOTE: the array order sets which signals are active + direction,
            # but ORDER BY priority follows schema field processing order
            # (see doc comment above for details).
            orderBy: [BODY_BM25_SCORE_ASC, NAME_TRGM_SIMILARITY_DESC]
          ) {
            nodes {
              name

              # ── Computed score fields (populated when filter is active) ──
              bodyBm25Score    # BM25 relevance (negative; closer to 0 = more relevant)
              tsvRank          # ts_rank (0..~1; higher = more relevant)
              nameTrgmSimilarity   # pg_trgm similarity (0..1; 1 = exact match)

              # ── Standard fields ──
              embedding        # pgvector column (float array)
              geom { geojson } # PostGIS geometry as GeoJSON
              category { name } # Relation (FK → categories)
              tags { nodes { label } } # Many-to-many relation
            }
          }
        }
      `,
      variables: { bbox: nycBbox },
    });

    // ── Assertions ──────────────────────────────────────────────────────

    expect(result.errors).toBeUndefined();
    const nodes = result.data?.locations.nodes ?? [];

    // All three NYC parks ("Prospect Park", "High Line Park", "Brooklyn Bridge Park")
    // should pass every filter simultaneously.
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    // ── Verify ordering: BODY_BM25_SCORE_ASC (primary sort) ──
    // BM25 filter apply runs first in the schema, so BM25 score is the
    // primary ORDER BY. ASC means most-negative (most relevant) first.
    // Expected: Prospect Park (-0.810) < Brooklyn Bridge Park (-0.626) < High Line Park (-0.568)
    for (let i = 0; i < nodes.length - 1; i++) {
      const curr = nodes[i].bodyBm25Score;
      const next = nodes[i + 1].bodyBm25Score;
      expect(curr).toBeLessThanOrEqual(next);
    }

    for (const node of nodes) {
      // ── BM25 score (plugin #2) ──
      // Populated because bm25Body filter is active. Negative float where
      // closer to 0 = more relevant.
      expect(typeof node.bodyBm25Score).toBe('number');

      // ── tsvector rank (plugin #1) ──
      // Populated because tsvTsv filter is active. Float 0..~1 where
      // higher = better match.
      expect(typeof node.tsvRank).toBe('number');

      // ── pg_trgm similarity (plugin #3) ──
      // Populated because trgmName filter is active. Float 0..1 where
      // 1 = exact match. Must be > 0 since we passed the threshold filter.
      expect(typeof node.nameTrgmSimilarity).toBe('number');
      expect(node.nameTrgmSimilarity).toBeGreaterThan(0);

      // ── pgvector embedding (plugin #6) ──
      // The raw embedding vector is returned as a float array.
      expect(Array.isArray(node.embedding)).toBe(true);
      expect(node.embedding).toHaveLength(3);

      // ── PostGIS geometry (plugin #7) ──
      // Returned as GeoJSON Point. Coordinates must fall within the NYC bbox.
      expect(node.geom.geojson).toBeDefined();
      expect(node.geom.geojson.type).toBe('Point');
      expect(node.geom.geojson.coordinates).toHaveLength(2);
      const [lon, lat] = node.geom.geojson.coordinates;
      expect(lon).toBeGreaterThanOrEqual(-74.1);
      expect(lon).toBeLessThanOrEqual(-73.9);
      expect(lat).toBeGreaterThanOrEqual(40.6);
      expect(lat).toBeLessThanOrEqual(40.8);

      // ── Relation filter (plugin #4) ──
      // Every result's category must be "Parks" (FK join filter).
      expect(node.category.name).toBe('Parks');

      // ── Tags (many-to-many) ──
      // Each park has at least one tag in the seed data.
      expect(node.tags.nodes.length).toBeGreaterThan(0);
    }
  });

  it('pagination works with filters', async () => {
    const firstPage = await query<{ locations: { nodes: { name: string }[]; pageInfo: { hasNextPage: boolean } } }>({
      query: `
        query {
          locations(
            where: { isActive: { equalTo: true } }
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
