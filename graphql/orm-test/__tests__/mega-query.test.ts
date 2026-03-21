/**
 * Mega Query Integration Test (ORM)
 *
 * Exercises the ConstructivePreset plugin stack via the generated ORM against
 * a real PostgreSQL database:
 *   - Connection filter (scalar, logical, relation filters)
 *   - PostGIS spatial filters (geometry column, GeoJSON bbox)
 *   - pgvector (vector column, search function, distance ordering)
 *   - tsvector search (fullText matches, tsvRank score)
 *   - BM25 search (pg_textsearch body index, bodyBm25Score)
 *   - pg_trgm fuzzy matching (trgmName, nameTrgmSimilarity score)
 *   - M:N via junction table (location_amenities)
 *
 * The crown jewel: a single "mega query" that combines all 7 plugin types
 * with multi-signal ORDER BY in ONE GraphQL request, all through the ORM.
 *
 * Requires postgres-plus:18 image with postgis, vector, pg_textsearch, pg_trgm.
 */
import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj, GraphQLResponse } from 'graphile-test';
import { ConstructivePreset } from 'graphile-settings';
import { runCodegenAndLoad } from './helpers/codegen-helper';
import { GraphileTestAdapter } from './helpers/graphile-adapter';

jest.setTimeout(120000);

const seedFile = join(__dirname, '..', '__fixtures__', 'seed', 'mega-seed.sql');
const SCHEMA = 'mega_test';

describe('Mega query integration (ORM)', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;
  let orm: Record<string, any>;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: { extends: [ConstructivePreset] },
        useRoot: true,
      },
      [seed.sqlfile([seedFile])],
    );

    teardown = connections.teardown;
    query = connections.query;

    // Run the full codegen pipeline against the live schema
    const { createClient } = await runCodegenAndLoad(query, 'mega');

    // Create the ORM client with the GraphileTestAdapter
    const adapter = new GraphileTestAdapter(query);
    orm = createClient({ adapter });
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  /** Extract the first connection/mutation result regardless of field name */
  function unwrapData(data: any): any {
    return Object.values(data)[0];
  }

  /** Raw GraphQL for schema introspection (not an ORM operation) */
  async function gql<T = unknown>(
    queryStr: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return query<T>({ query: queryStr, variables });
  }

  // ==========================================================================
  // SCHEMA INTROSPECTION (raw GraphQL \u2014 testing schema shape, not ORM)
  // ==========================================================================
  describe('schema introspection', () => {
    it('LocationFilter has scalar, relation, tsvector, BM25, trgm, vector, and PostGIS fields', async () => {
      const result = await gql<{ __type: { inputFields: { name: string }[] } | null }>(`
        query { __type(name: "LocationFilter") { inputFields { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const fields = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];

      // Scalar / logical
      expect(fields).toContain('name');
      expect(fields).toContain('isActive');
      expect(fields).toContain('rating');
      expect(fields).toContain('and');
      expect(fields).toContain('or');
      expect(fields).toContain('not');

      // Relation
      expect(fields).toContain('category');
      expect(fields).toContain('tags');
      expect(fields).toContain('tagsExist');

      // Search plugins
      expect(fields).toContain('tsvTsv');
      expect(fields).toContain('bm25Body');
      expect(fields).toContain('trgmName');
      expect(fields).toContain('vectorEmbedding');

      // PostGIS
      expect(fields).toContain('geom');
    });

    it('Location type has score fields, embedding, geom, and M:N amenities', async () => {
      const result = await gql<{ __type: { fields: { name: string }[] } | null }>(`
        query { __type(name: "Location") { fields { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const fields = result.data?.__type?.fields?.map((f) => f.name) ?? [];
      expect(fields).toContain('embedding');
      expect(fields).toContain('geom');
      expect(fields).toContain('tsvRank');
      expect(fields).toContain('bodyBm25Score');
      expect(fields).toContain('nameTrgmSimilarity');
      expect(fields).toContain('searchScore');
      expect(fields).toContain('amenities');
    });
  });

  // ==========================================================================
  // SCALAR + LOGICAL FILTERS via ORM
  // ==========================================================================
  describe('scalar and logical filters', () => {
    it('filters by string equalTo', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { name: { equalTo: 'MoMA' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('MoMA');
    });

    it('filters by boolean field', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { isActive: { equalTo: false } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Times Square Diner');
    });

    it('filters by numeric greaterThanOrEqualTo', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, rating: true },
          where: { rating: { greaterThanOrEqualTo: '4.7' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(3);
      for (const node of nodes) {
        expect(parseFloat(String(node.rating))).toBeGreaterThanOrEqual(4.7);
      }
    });

    it('OR combines conditions', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { or: [{ name: { equalTo: 'MoMA' } }, { name: { equalTo: 'Met Museum' } }] },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(2);
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual(['Met Museum', 'MoMA']);
    });

    it('NOT negates a condition', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { not: { isActive: { equalTo: false } } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(6);
    });

    it('no filter returns all rows', async () => {
      const result = await orm.location
        .findMany({ select: { name: true } })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(7);
    });
  });

  // ==========================================================================
  // TSVECTOR SEARCH via ORM
  // ==========================================================================
  describe('tsvector search', () => {
    it('tsvTsv filters by text search', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { tsvTsv: 'coffee' },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Central Park Cafe');
    });

    it('broad term matches multiple rows with ranks', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, tsvRank: true },
          where: { tsvTsv: 'park' },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(4);
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual([
        'Brooklyn Bridge Park',
        'Central Park Cafe',
        'High Line Park',
        'Prospect Park',
      ]);
    });

    it('tsvRank reflects term density \u2014 Prospect Park ranks highest for "park"', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, tsvRank: true },
          where: { tsvTsv: 'park' },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as { name: string; tsvRank: number }[];

      // Prospect Park's tsv has "park" 3x \u2014 highest rank (~0.083)
      const prospect = nodes.find((n) => n.name === 'Prospect Park')!;
      const centralCafe = nodes.find((n) => n.name === 'Central Park Cafe')!;
      const brooklyn = nodes.find((n) => n.name === 'Brooklyn Bridge Park')!;

      expect(prospect.tsvRank).toBeGreaterThan(centralCafe.tsvRank);
      expect(centralCafe.tsvRank).toBeGreaterThanOrEqual(brooklyn.tsvRank);

      // All ranks are in the expected range
      for (const node of nodes) {
        expect(node.tsvRank).toBeGreaterThan(0.05);
        expect(node.tsvRank).toBeLessThan(0.1);
      }
    });

    it('tsvRank is null when no tsvector filter active', async () => {
      const result = await orm.location
        .findMany({
          select: { tsvRank: true },
          first: 1,
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes[0].tsvRank).toBeNull();
    });
  });

  // ==========================================================================
  // BM25 SEARCH (pg_textsearch) via ORM
  // ==========================================================================
  describe('BM25 search (pg_textsearch)', () => {
    it('bm25Body filter field exists', async () => {
      const result = await gql<{ __type: { inputFields: { name: string }[] } | null }>(`
        query { __type(name: "LocationFilter") { inputFields { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const fieldNames = result.data?.__type?.inputFields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('bm25Body');
    });

    it('BM25 ranks by relevance \u2014 Prospect Park dominates for "park"', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'park' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as { name: string; bodyBm25Score: number }[];

      // Separate matches (negative score) from non-matches (zero)
      const matches = nodes.filter((n) => n.bodyBm25Score < 0);
      const nonMatches = nodes.filter((n) => n.bodyBm25Score === 0);

      expect(matches).toHaveLength(4); // 4 locations mention "park"
      expect(nonMatches).toHaveLength(3); // MoMA, Times Square Diner, Met Museum

      // Prospect Park (3x "park") has the strongest (most negative) BM25 score
      const prospect = matches.find((n) => n.name === 'Prospect Park')!;
      const centralCafe = matches.find((n) => n.name === 'Central Park Cafe')!;
      const brooklyn = matches.find((n) => n.name === 'Brooklyn Bridge Park')!;
      const highLine = matches.find((n) => n.name === 'High Line Park')!;

      expect(prospect.bodyBm25Score).toBeLessThan(centralCafe.bodyBm25Score);
      expect(centralCafe.bodyBm25Score).toBeLessThan(brooklyn.bodyBm25Score);
      expect(brooklyn.bodyBm25Score).toBeLessThan(highLine.bodyBm25Score);

      // All match scores are meaningfully negative
      for (const m of matches) {
        expect(m.bodyBm25Score).toBeLessThan(-0.5);
      }
    });

    it('multi-term BM25 \u2014 MoMA and Met Museum both score for "museum art"', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'museum art' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as { name: string; bodyBm25Score: number }[];

      const moma = nodes.find((n) => n.name === 'MoMA')!;
      const met = nodes.find((n) => n.name === 'Met Museum')!;
      const highLine = nodes.find((n) => n.name === 'High Line Park')!;
      const diner = nodes.find((n) => n.name === 'Times Square Diner')!;

      // Both museums score strongly (body has "museum" + "art" multiple times)
      expect(moma.bodyBm25Score).toBeLessThan(-2);
      expect(met.bodyBm25Score).toBeLessThan(-2);

      // High Line mentions "art" once \u2014 weaker but nonzero
      expect(highLine.bodyBm25Score).toBeLessThan(0);
      expect(highLine.bodyBm25Score).toBeGreaterThan(met.bodyBm25Score);

      // Diner has no museum/art terms \u2014 zero
      expect(diner.bodyBm25Score).toBe(0);
    });

    it('single-result BM25 \u2014 "cafe coffee" matches only Central Park Cafe', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'cafe coffee' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as { name: string; bodyBm25Score: number }[];

      const matches = nodes.filter((n) => n.bodyBm25Score < 0);
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('Central Park Cafe');
      expect(matches[0].bodyBm25Score).toBeLessThan(-3); // strong multi-term match
    });

    it('bodyBm25Score is null when no BM25 filter active', async () => {
      const result = await orm.location
        .findMany({
          select: { bodyBm25Score: true },
          first: 1,
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes[0].bodyBm25Score).toBeNull();
    });
  });

  // ==========================================================================
  // PG_TRGM FUZZY MATCHING via ORM
  // ==========================================================================
  describe('pg_trgm fuzzy matching', () => {
    it('trgm ranks by similarity \u2014 Prospect Park tops for "park"', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'park', threshold: 0.1 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as {
        name: string;
        nameTrgmSimilarity: number;
      }[];

      // trgm threshold filtering: only names with similarity > 0.1 returned
      expect(nodes).toHaveLength(4);

      // Verify ordering by similarity
      const prospect = nodes.find((n) => n.name === 'Prospect Park')!;
      const highLine = nodes.find((n) => n.name === 'High Line Park')!;
      const centralCafe = nodes.find((n) => n.name === 'Central Park Cafe')!;
      const brooklyn = nodes.find((n) => n.name === 'Brooklyn Bridge Park')!;

      // Prospect Park (shortest name containing "Park") \u2014 highest similarity
      expect(prospect.nameTrgmSimilarity).toBeGreaterThan(0.35);
      expect(prospect.nameTrgmSimilarity).toBeGreaterThan(highLine.nameTrgmSimilarity);
      expect(highLine.nameTrgmSimilarity).toBeGreaterThan(centralCafe.nameTrgmSimilarity);
      expect(centralCafe.nameTrgmSimilarity).toBeGreaterThan(brooklyn.nameTrgmSimilarity);
    });

    it('exact substring match scores high \u2014 "museum" finds Met Museum at ~0.7', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'museum', threshold: 0.1 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as {
        name: string;
        nameTrgmSimilarity: number;
      }[];

      // Only "Met Museum" exceeds the threshold \u2014 "museum" is 60% of its name
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Met Museum');
      expect(nodes[0].nameTrgmSimilarity).toBeCloseTo(0.7, 1);
    });

    it('handles typos gracefully \u2014 "Broklyn" finds Brooklyn Bridge Park', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'Broklyn', threshold: 0.05 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      const names = nodes.map((n: any) => n.name);
      expect(names).toContain('Brooklyn Bridge Park');
    });

    it('higher threshold filters strictly \u2014 0.3 excludes weaker matches', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'park', threshold: 0.3 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as {
        name: string;
        nameTrgmSimilarity: number;
      }[];

      // threshold=0.3 drops Central Park Cafe (~0.29) and Brooklyn Bridge Park (~0.26)
      expect(nodes).toHaveLength(2);
      const names = nodes.map((n) => n.name).sort();
      expect(names).toEqual(['High Line Park', 'Prospect Park']);

      for (const node of nodes) {
        expect(node.nameTrgmSimilarity).toBeGreaterThanOrEqual(0.3);
      }
    });
  });

  // ==========================================================================
  // PGVECTOR via ORM
  // ==========================================================================
  describe('pgvector', () => {
    it('exposes embedding as array of floats', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, embedding: true },
          where: { name: { equalTo: 'Central Park Cafe' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes[0]?.embedding).toEqual([1, 0, 0]);
    });

    it('search function returns results ordered by similarity', async () => {
      // searchLocations is a custom Postgres function, not a table \u2014 use raw GraphQL
      const result = await gql<{ searchLocations: { nodes: { name: string }[] } }>(`
        query { searchLocations(queryEmbedding: [1, 0, 0]) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchLocations?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);
      // Central Park Cafe has [1,0,0] \u2014 exact match, closest neighbor
      expect(nodes![0].name).toBe('Central Park Cafe');
    });

    it('vectorEmbedding filter clusters by semantic distance', async () => {
      // Query "restaurant" direction [1,0,0] \u2014 should find restaurant-cluster locations
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { vectorEmbedding: { vector: [1, 0, 0], distance: 0.5 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;

      // [1,0,0] with dist<=0.5 \u2014 Central Park Cafe [1,0,0] (dist=0) + Times Square Diner [0.8,0.6,0] (dist~0.2)
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      expect(nodes[0].name).toBe('Central Park Cafe');
    });

    it('park-cluster vectors: [0,1,0] finds parks by cosine distance', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { vectorEmbedding: { vector: [0, 1, 0], distance: 0.5 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;

      // [0,1,0] \u2014 Brooklyn Bridge Park (0), Prospect Park (~0.01), High Line (~0.14)
      expect(nodes.length).toBeGreaterThanOrEqual(3);
      const names = nodes.map((n: any) => n.name);
      expect(names).toContain('Brooklyn Bridge Park');
      expect(names).toContain('Prospect Park');
    });

    it('museum-cluster vectors: [0,0,1] finds both museums', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { vectorEmbedding: { vector: [0, 0, 1], distance: 0.5 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;

      const names = nodes.map((n: any) => n.name);
      expect(names).toContain('MoMA');
      expect(names).toContain('Met Museum');
    });
  });

  // ==========================================================================
  // POSTGIS SPATIAL via ORM
  // ==========================================================================
  describe('PostGIS spatial', () => {
    it('geom column is exposed as GeoJSON', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, geom: { select: { geojson: true } } },
          where: { name: { equalTo: 'Central Park Cafe' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const loc = unwrapData(result.data).nodes[0];
      expect(loc).toBeDefined();
      expect(loc?.geom).toBeDefined();
    });
  });

  // ==========================================================================
  // RELATION FILTERS via ORM
  // ==========================================================================
  describe('relation filters', () => {
    it('forward: filter locations by category name', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { category: { name: { equalTo: 'Parks' } } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(3);
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual(['Brooklyn Bridge Park', 'High Line Park', 'Prospect Park']);
    });

    it('backward: categories with at least one active location', async () => {
      const result = await orm.category
        .findMany({
          select: { name: true },
          where: { locations: { some: { isActive: { equalTo: true } } } },
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes).toHaveLength(3);
    });

    it('backward none: categories with NO inactive locations', async () => {
      const result = await orm.category
        .findMany({
          select: { name: true },
          where: { locations: { none: { isActive: { equalTo: false } } } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(2);
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual(['Museums', 'Parks']);
    });

    it('tagsExist: locations that have tags', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { tagsExist: true },
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes).toHaveLength(7);
    });
  });

  // ==========================================================================
  // M:N VIA JUNCTION (location_amenities) via ORM
  // ==========================================================================
  describe('M:N amenities', () => {
    it('locations expose M:N amenities connection', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, amenities: { select: { name: true } } },
          where: { name: { equalTo: 'MoMA' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const moma = unwrapData(result.data).nodes[0];
      expect(moma).toBeDefined();
      const amenityNames = moma.amenities.nodes.map((a: any) => a.name).sort();
      expect(amenityNames).toEqual(['Gift Shop', 'Restrooms', 'WiFi']);
    });

    it('M:N add then remove via serial PK', async () => {
      // Create junction row via ORM
      const createResult = await orm.locationAmenity
        .create({
          data: { locationId: 4, amenityId: 1 },
          select: { id: true, locationId: true, amenityId: true },
        })
        .execute();

      expect(createResult.ok).toBe(true);
      const created = unwrapData(createResult.data).locationAmenity;
      expect(created.locationId).toBe(4);
      expect(created.amenityId).toBe(1);

      // Verify added via ORM
      const verifyResult = await orm.location
        .findMany({
          select: { amenities: { select: { name: true } } },
          where: { name: { equalTo: 'Times Square Diner' } },
        })
        .execute();
      expect(
        unwrapData(verifyResult.data).nodes[0].amenities.nodes.map((a: any) => a.name),
      ).toContain('WiFi');

      // Delete by serial PK via ORM
      const deleteResult = await orm.locationAmenity
        .delete({
          where: { id: created.id },
          select: { locationId: true, amenityId: true },
        })
        .execute();

      expect(deleteResult.ok).toBe(true);

      // Verify removed via ORM
      const afterResult = await orm.location
        .findMany({
          select: { amenities: { select: { name: true } } },
          where: { name: { equalTo: 'Times Square Diner' } },
        })
        .execute();
      expect(
        unwrapData(afterResult.data).nodes[0].amenities.nodes.map((a: any) => a.name),
      ).not.toContain('WiFi');
    });
  });

  // ==========================================================================
  // KITCHEN SINK: multi-plugin combos via ORM
  // ==========================================================================
  describe('kitchen sink (multi-plugin queries)', () => {
    it('combines tsvector + scalar + relation filter', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: {
            tsvTsv: 'park',
            isActive: { equalTo: true },
            category: { name: { equalTo: 'Parks' } },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('combines BM25 + scalar filter with concrete scores', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: {
            bm25Body: { query: 'museum' },
            isActive: { equalTo: true },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as { name: string; bodyBm25Score: number }[];

      // isActive=true excludes Times Square Diner; BM25 returns all remaining
      const matches = nodes.filter((n) => n.bodyBm25Score < 0);
      expect(matches.length).toBeGreaterThanOrEqual(2);

      // Both museums should be in the match set
      const matchNames = matches.map((n) => n.name);
      expect(matchNames).toContain('MoMA');
      expect(matchNames).toContain('Met Museum');
    });

    it('combines OR with tsvector and scalar', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { or: [{ tsvTsv: 'coffee' }, { name: { equalTo: 'MoMA' } }] },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes).toHaveLength(2);
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual(['Central Park Cafe', 'MoMA']);
    });

    it('vector search returns ordered neighbors from park cluster', async () => {
      // searchLocations is a custom Postgres function \u2014 use raw GraphQL
      const result = await gql<{ searchLocations: { nodes: { name: string }[] } }>(`
        query { searchLocations(queryEmbedding: [0, 1, 0], resultLimit: 3) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchLocations?.nodes ?? [];
      expect(nodes).toHaveLength(3);
      // [0,1,0] \u2014 Brooklyn Bridge Park [0,1,0] is exact match
      expect(nodes[0].name).toBe('Brooklyn Bridge Park');
    });

    it('searchScore composite signal from tsvector + BM25 + trgm', async () => {
      const result = await orm.location
        .findMany({
          select: {
            name: true,
            searchScore: true,
            tsvRank: true,
            bodyBm25Score: true,
            nameTrgmSimilarity: true,
          },
          where: {
            tsvTsv: 'park',
            bm25Body: { query: 'park' },
            trgmName: { value: 'park', threshold: 0.1 },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes as {
        name: string;
        searchScore: number;
        tsvRank: number;
        bodyBm25Score: number;
        nameTrgmSimilarity: number;
      }[];

      // Only 4 locations pass the trgm threshold for "park"
      expect(nodes).toHaveLength(4);

      for (const node of nodes) {
        // searchScore is a composite of the individual signals
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThan(0);
        expect(node.searchScore).toBeLessThan(1);

        // All three individual signals are populated
        expect(node.tsvRank).toBeGreaterThan(0);
        expect(node.bodyBm25Score).toBeLessThan(0);
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0.1);
      }
    });
  });

  // ==========================================================================
  // THE MEGA QUERY \u2014 all 7 plugin types + multi-signal ORDER BY via ORM
  // ==========================================================================
  describe('mega query', () => {
    /**
     * One ORM findMany proving every plugin in ConstructivePreset composes:
     *
     *   1. tsvector (tsvTsv)           - full-text search on tsv column
     *   2. BM25 (bm25Body)             - pg_textsearch relevance on body column
     *   3. pg_trgm (trgmName)          - fuzzy trigram match on name column
     *   4. Relation filter (category)  - FK join: category.name = "Parks"
     *   5. Scalar filter (isActive)    - boolean equality
     *   6. pgvector (vectorEmbedding)  - cosine distance on embedding column
     *   7. PostGIS (geom.intersects)   - spatial intersection with NYC bbox
     *
     * Multi-signal ORDER BY: BM25 score ASC + trgm similarity DESC
     */
    it('all 7 plugins + multi-signal orderBy in ONE query', async () => {
      const nycBbox = {
        type: 'Polygon',
        coordinates: [
          [
            [-74.1, 40.6],
            [-73.9, 40.6],
            [-73.9, 40.8],
            [-74.1, 40.8],
            [-74.1, 40.6],
          ],
        ],
        crs: { type: 'name', properties: { name: 'EPSG:4326' } },
      };

      const result = await orm.location
        .findMany({
          select: {
            name: true,
            bodyBm25Score: true,
            tsvRank: true,
            nameTrgmSimilarity: true,
            searchScore: true,
            embedding: true,
            geom: { select: { geojson: true } },
            category: { select: { name: true } },
            tags: { select: { label: true } },
            amenities: { select: { name: true } },
          },
          where: {
            // 1. tsvector full-text search
            tsvTsv: 'park',
            // 2. BM25 relevance search (pg_textsearch)
            bm25Body: { query: 'park' },
            // 3. pg_trgm fuzzy matching
            trgmName: { value: 'park', threshold: 0.1 },
            // 4. Relation filter (FK -> categories)
            category: { name: { equalTo: 'Parks' } },
            // 5. Scalar filter
            isActive: { equalTo: true },
            // 6. pgvector similarity
            vectorEmbedding: { vector: [0, 1, 0], distance: 2.0 },
            // 7. PostGIS spatial
            geom: { intersects: nycBbox },
          },
          orderBy: ['BODY_BM25_SCORE_ASC', 'NAME_TRGM_SIMILARITY_DESC'],
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;

      // Active NYC parks matching all 7 filters simultaneously
      expect(nodes).toHaveLength(3);

      // Verify the 3 expected parks
      const names = nodes.map((n: any) => n.name).sort();
      expect(names).toEqual(['Brooklyn Bridge Park', 'High Line Park', 'Prospect Park']);

      for (const node of nodes) {
        // BM25 score \u2014 all park-mentioning bodies score negative
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(node.bodyBm25Score).toBeLessThan(0);

        // tsvector rank \u2014 all match "park" in their tsv
        expect(typeof node.tsvRank).toBe('number');
        expect(node.tsvRank).toBeGreaterThan(0.05);

        // pg_trgm similarity \u2014 all names contain "Park"
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0.2);

        // searchScore \u2014 composite signal combining all active search signals
        expect(typeof node.searchScore).toBe('number');
        expect(node.searchScore).toBeGreaterThan(0);
        expect(node.searchScore).toBeLessThan(1);

        // pgvector embedding (float array)
        expect(Array.isArray(node.embedding)).toBe(true);
        expect(node.embedding).toHaveLength(3);

        // PostGIS geom within NYC bbox
        expect(node.geom.geojson).toBeDefined();
        expect(node.geom.geojson.type).toBe('Point');
        const [lon, lat] = node.geom.geojson.coordinates;
        expect(lon).toBeGreaterThanOrEqual(-74.1);
        expect(lon).toBeLessThanOrEqual(-73.9);
        expect(lat).toBeGreaterThanOrEqual(40.6);
        expect(lat).toBeLessThanOrEqual(40.8);

        // Relation filter: every result's category = Parks
        expect(node.category.name).toBe('Parks');

        // Tags present (backward relation)
        expect(node.tags.nodes.length).toBeGreaterThan(0);
      }

      // Prospect Park should have the strongest BM25 signal (most negative)
      const prospect = nodes.find((n: any) => n.name === 'Prospect Park');
      const brooklyn = nodes.find((n: any) => n.name === 'Brooklyn Bridge Park');
      expect(prospect.bodyBm25Score).toBeLessThan(brooklyn.bodyBm25Score);

      // Prospect Park should have the highest trgm similarity
      expect(prospect.nameTrgmSimilarity).toBeGreaterThan(brooklyn.nameTrgmSimilarity);
    });

    it('pagination works with filters', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { isActive: { equalTo: true } },
          first: 3,
        })
        .execute();

      expect(result.ok).toBe(true);
      const connection = unwrapData(result.data);
      expect(connection.nodes).toHaveLength(3);
      expect(connection.totalCount).toBeGreaterThan(3);
    });
  });
});
