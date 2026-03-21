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
  // SCHEMA INTROSPECTION (raw GraphQL — testing schema shape, not ORM)
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

    it('broad term matches multiple rows', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true },
          where: { tsvTsv: 'park' },
        })
        .execute();

      expect(result.ok).toBe(true);
      const names = unwrapData(result.data).nodes.map((n: any) => n.name).sort();
      expect(names).toContain('Central Park Cafe');
      expect(names).toContain('Brooklyn Bridge Park');
    });

    it('tsvRank populated when filter active', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, tsvRank: true },
          where: { tsvTsv: 'park' },
        })
        .execute();

      expect(result.ok).toBe(true);
      for (const node of unwrapData(result.data).nodes) {
        expect(typeof node.tsvRank).toBe('number');
        expect(node.tsvRank).toBeGreaterThan(0);
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

    it('BM25 search populates scores for matching rows', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'museum art' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      // BM25 returns ALL rows; matching rows have negative scores, non-matches get 0
      const matches = nodes.filter((n: any) => n.bodyBm25Score < 0);
      expect(matches.length).toBeGreaterThan(0);
      const names = matches.map((n: any) => n.name);
      expect(names).toContain('MoMA');
    });

    it('bodyBm25Score populated when filter active', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'park' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      // BM25 returns all rows; matching rows get negative scores
      const matches = nodes.filter((n: any) => n.bodyBm25Score !== 0);
      expect(matches.length).toBeGreaterThan(0);
      for (const node of matches) {
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(node.bodyBm25Score).toBeLessThan(0);
      }
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

    it('BM25 score distinguishes matching from non-matching rows', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, bodyBm25Score: true },
          where: { bm25Body: { query: 'park' } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      const matches = nodes.filter((n: any) => n.bodyBm25Score < 0);
      const nonMatches = nodes.filter((n: any) => n.bodyBm25Score === 0);
      // "park" appears in several location bodies
      expect(matches.length).toBeGreaterThan(1);
      expect(nonMatches.length).toBeGreaterThan(0);
      // Matching rows have names that contain 'Park' or reference parks
      const matchNames = matches.map((n: any) => n.name);
      expect(matchNames).toContain('Prospect Park');
    });
  });

  // ==========================================================================
  // PG_TRGM FUZZY MATCHING via ORM
  // ==========================================================================
  describe('pg_trgm fuzzy matching', () => {
    it('trgmName filters by trigram similarity', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'park', threshold: 0.1 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0);
      }
    });

    it('handles typos gracefully', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'Broklyn', threshold: 0.05 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      expect(unwrapData(result.data).nodes.length).toBeGreaterThan(0);
    });

    it('trgm similarity scores are all above threshold', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, nameTrgmSimilarity: true },
          where: { trgmName: { value: 'park', threshold: 0.05 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes.length).toBeGreaterThan(1);
      for (const node of nodes) {
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0.05);
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
      // searchLocations is a custom Postgres function, not a table — use raw GraphQL
      const result = await gql<{ searchLocations: { nodes: { name: string }[] } }>(`
        query { searchLocations(queryEmbedding: [1, 0, 0]) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchLocations?.nodes;
      expect(nodes).toBeDefined();
      expect(nodes!.length).toBeGreaterThan(0);
      expect(nodes![0].name).toBe('Central Park Cafe');
    });

    it('vectorEmbedding filter narrows results by distance', async () => {
      const result = await orm.location
        .findMany({
          select: { name: true, embedding: true },
          where: { vectorEmbedding: { vector: [1, 0, 0], distance: 0.5 } },
        })
        .execute();

      expect(result.ok).toBe(true);
      const nodes = unwrapData(result.data).nodes;
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      // Central Park Cafe has embedding [1,0,0] — exact match, distance 0
      expect(nodes.map((n: any) => n.name)).toContain('Central Park Cafe');
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

    it('combines BM25 + scalar filter', async () => {
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
      const nodes = unwrapData(result.data).nodes;
      // BM25 returns all rows; matching rows get negative scores
      const matches = nodes.filter((n: any) => n.bodyBm25Score < 0);
      expect(matches.length).toBeGreaterThan(0);
      for (const node of matches) {
        expect(typeof node.bodyBm25Score).toBe('number');
      }
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

    it('vector search returns ordered neighbors', async () => {
      // searchLocations is a custom Postgres function — use raw GraphQL
      const result = await gql<{ searchLocations: { nodes: { name: string }[] } }>(`
        query { searchLocations(queryEmbedding: [0, 1, 0], resultLimit: 3) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.searchLocations?.nodes ?? [];
      expect(nodes).toHaveLength(3);
      expect(nodes[0].name).toBe('Brooklyn Bridge Park');
    });
  });

  // ==========================================================================
  // THE MEGA QUERY — all 7 plugin types + multi-signal ORDER BY via ORM
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
            bm25Body: { query: 'park green' },
            // 3. pg_trgm fuzzy matching
            trgmName: { value: 'park', threshold: 0.1 },
            // 4. Relation filter (FK -> categories)
            category: { name: { equalTo: 'Parks' } },
            // 5. Scalar filter
            isActive: { equalTo: true },
            // 6. pgvector similarity (VectorNearbyInput: flat shape, field is 'vector')
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
      expect(nodes.length).toBeGreaterThanOrEqual(2);

      for (const node of nodes) {
        // BM25 score (negative = match, 0 = no match)
        expect(typeof node.bodyBm25Score).toBe('number');

        // tsvector rank (0..~1, higher = better match)
        expect(typeof node.tsvRank).toBe('number');

        // pg_trgm similarity (0..1, > 0 since threshold filter passed)
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0);

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
