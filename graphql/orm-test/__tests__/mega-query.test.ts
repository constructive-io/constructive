/**
 * Mega Query Integration Test
 *
 * Exercises the ConstructivePreset plugin stack against a real PostgreSQL database:
 *   - Connection filter (scalar, logical, relation filters)
 *   - PostGIS spatial filters (geometry column, GeoJSON bbox)
 *   - pgvector (vector column, search function, distance ordering)
 *   - tsvector search (fullText matches, tsvRank score)
 *   - BM25 search (pg_textsearch body index, bodyBm25Score)
 *   - pg_trgm fuzzy matching (trgmName, nameTrgmSimilarity score)
 *   - M:N via junction table (location_amenities)
 *
 * The crown jewel: a single "mega query" that combines all 7 plugin types
 * with multi-signal ORDER BY in ONE GraphQL request.
 *
 * Requires postgres-plus:18 image with postgis, vector, pg_textsearch, pg_trgm.
 */
import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj, GraphQLResponse } from 'graphile-test';
import { ConstructivePreset } from 'graphile-settings';

jest.setTimeout(60000);

const seedFile = join(__dirname, '..', '__fixtures__', 'seed', 'mega-seed.sql');
const SCHEMA = 'mega_test';

describe('Mega query integration', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;

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
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  async function gql<T = unknown>(
    queryStr: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return query<T>({ query: queryStr, variables });
  }

  // ==========================================================================
  // SCHEMA INTROSPECTION
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
  // SCALAR + LOGICAL FILTERS
  // ==========================================================================
  describe('scalar and logical filters', () => {
    it('filters by string equalTo', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { name: { equalTo: "MoMA" } }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(1);
      expect(result.data?.locations.nodes[0].name).toBe('MoMA');
    });

    it('filters by boolean field', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { isActive: { equalTo: false } }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(1);
      expect(result.data?.locations.nodes[0].name).toBe('Times Square Diner');
    });

    it('filters by numeric greaterThanOrEqualTo', async () => {
      const result = await gql<{ locations: { nodes: { name: string; rating: number }[] } }>(`
        query { locations(where: { rating: { greaterThanOrEqualTo: "4.7" } }) { nodes { name rating } } }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations.nodes ?? [];
      expect(nodes).toHaveLength(3);
      for (const node of nodes) {
        expect(parseFloat(String(node.rating))).toBeGreaterThanOrEqual(4.7);
      }
    });

    it('OR combines conditions', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query {
          locations(where: { or: [{ name: { equalTo: "MoMA" } }, { name: { equalTo: "Met Museum" } }] }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(2);
      const names = result.data?.locations.nodes.map((n) => n.name).sort();
      expect(names).toEqual(['Met Museum', 'MoMA']);
    });

    it('NOT negates a condition', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { not: { isActive: { equalTo: false } } }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(6);
    });

    it('no filter returns all rows', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(7);
    });
  });

  // ==========================================================================
  // TSVECTOR SEARCH
  // ==========================================================================
  describe('tsvector search', () => {
    it('tsvTsv filters by text search', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { tsvTsv: "coffee" }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(1);
      expect(result.data?.locations.nodes[0].name).toBe('Central Park Cafe');
    });

    it('broad term matches multiple rows', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { tsvTsv: "park" }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      const names = result.data?.locations.nodes.map((n) => n.name).sort() ?? [];
      expect(names).toContain('Central Park Cafe');
      expect(names).toContain('Brooklyn Bridge Park');
    });

    it('tsvRank populated when filter active', async () => {
      const result = await gql<{ locations: { nodes: { name: string; tsvRank: number | null }[] } }>(`
        query { locations(where: { tsvTsv: "park" }) { nodes { name tsvRank } } }
      `);

      expect(result.errors).toBeUndefined();
      for (const node of result.data?.locations.nodes ?? []) {
        expect(typeof node.tsvRank).toBe('number');
        expect(node.tsvRank).toBeGreaterThan(0);
      }
    });

    it('tsvRank is null when no tsvector filter active', async () => {
      const result = await gql<{ locations: { nodes: { tsvRank: number | null }[] } }>(`
        query { locations(first: 1) { nodes { tsvRank } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes[0].tsvRank).toBeNull();
    });
  });

  // ==========================================================================
  // BM25 SEARCH (pg_textsearch)
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

    it('BM25 search filters by body text', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query {
          locations(where: { bm25Body: { query: "museum art" } }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      const names = nodes.map((n) => n.name);
      expect(names).toContain('MoMA');
    });

    it('bodyBm25Score populated when filter active', async () => {
      const result = await gql<{ locations: { nodes: { name: string; bodyBm25Score: number | null }[] } }>(`
        query {
          locations(where: { bm25Body: { query: "park" } }) {
            nodes { name bodyBm25Score }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(node.bodyBm25Score).toBeDefined();
        expect(typeof node.bodyBm25Score).toBe('number');
        expect(node.bodyBm25Score).not.toBeNull();
      }
    });

    it('bodyBm25Score is null when no BM25 filter active', async () => {
      const result = await gql<{ locations: { nodes: { bodyBm25Score: number | null }[] } }>(`
        query { locations(first: 1) { nodes { bodyBm25Score } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes[0].bodyBm25Score).toBeNull();
    });

    it('BM25 orderBy sorts by relevance', async () => {
      const result = await gql<{ locations: { nodes: { name: string; bodyBm25Score: number }[] } }>(`
        query {
          locations(
            where: { bm25Body: { query: "park" } }
            orderBy: BODY_BM25_SCORE_ASC
          ) {
            nodes { name bodyBm25Score }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(1);
      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].bodyBm25Score).toBeLessThanOrEqual(nodes[i + 1].bodyBm25Score);
      }
    });
  });

  // ==========================================================================
  // PG_TRGM FUZZY MATCHING
  // ==========================================================================
  describe('pg_trgm fuzzy matching', () => {
    it('trgmName filters by trigram similarity', async () => {
      const result = await gql<{ locations: { nodes: { name: string; nameTrgmSimilarity: number }[] } }>(`
        query {
          locations(where: { trgmName: { value: "park", threshold: 0.1 } }) {
            nodes { name nameTrgmSimilarity }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(typeof node.nameTrgmSimilarity).toBe('number');
        expect(node.nameTrgmSimilarity).toBeGreaterThan(0);
      }
    });

    it('handles typos gracefully', async () => {
      const result = await gql<{ locations: { nodes: { name: string; nameTrgmSimilarity: number }[] } }>(`
        query {
          locations(where: { trgmName: { value: "Broklyn", threshold: 0.05 } }) {
            nodes { name nameTrgmSimilarity }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes.length).toBeGreaterThan(0);
    });

    it('orderBy trgm similarity descending', async () => {
      const result = await gql<{ locations: { nodes: { name: string; nameTrgmSimilarity: number }[] } }>(`
        query {
          locations(
            where: { trgmName: { value: "park", threshold: 0.05 } }
            orderBy: NAME_TRGM_SIMILARITY_DESC
          ) {
            nodes { name nameTrgmSimilarity }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(1);
      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].nameTrgmSimilarity).toBeGreaterThanOrEqual(nodes[i + 1].nameTrgmSimilarity);
      }
    });
  });

  // ==========================================================================
  // PGVECTOR
  // ==========================================================================
  describe('pgvector', () => {
    it('exposes embedding as array of floats', async () => {
      const result = await gql<{ locations: { nodes: { name: string; embedding: number[] }[] } }>(`
        query { locations(where: { name: { equalTo: "Central Park Cafe" } }) { nodes { name embedding } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes[0]?.embedding).toEqual([1, 0, 0]);
    });

    it('search function returns results ordered by similarity', async () => {
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
      const result = await gql<{ locations: { nodes: { name: string; embedding: number[] }[] } }>(`
        query {
          locations(where: { vectorEmbedding: { nearby: { embedding: [1, 0, 0], distance: 0.5 } } }) {
            nodes { name embedding }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations.nodes ?? [];
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      expect(nodes[0].name).toBe('Central Park Cafe');
    });
  });

  // ==========================================================================
  // POSTGIS SPATIAL
  // ==========================================================================
  describe('PostGIS spatial', () => {
    it('geom column is exposed as GeoJSON', async () => {
      const result = await gql<{
        locations: { nodes: { name: string; geom: { geojson: unknown } }[] };
      }>(`
        query {
          locations(where: { name: { equalTo: "Central Park Cafe" } }) {
            nodes { name geom { geojson } }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const loc = result.data?.locations.nodes[0];
      expect(loc).toBeDefined();
      expect(loc?.geom).toBeDefined();
    });
  });

  // ==========================================================================
  // RELATION FILTERS
  // ==========================================================================
  describe('relation filters', () => {
    it('forward: filter locations by category name', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { category: { name: { equalTo: "Parks" } } }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(3);
      const names = result.data?.locations.nodes.map((n) => n.name).sort();
      expect(names).toEqual(['Brooklyn Bridge Park', 'High Line Park', 'Prospect Park']);
    });

    it('backward: categories with at least one active location', async () => {
      const result = await gql<{ categories: { nodes: { name: string }[] } }>(`
        query {
          categories(where: { locations: { some: { isActive: { equalTo: true } } } }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.categories.nodes).toHaveLength(3);
    });

    it('backward none: categories with NO inactive locations', async () => {
      const result = await gql<{ categories: { nodes: { name: string }[] } }>(`
        query {
          categories(where: { locations: { none: { isActive: { equalTo: false } } } }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.categories.nodes).toHaveLength(2);
      const names = result.data?.categories.nodes.map((n) => n.name).sort();
      expect(names).toEqual(['Museums', 'Parks']);
    });

    it('tagsExist: locations that have tags', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query { locations(where: { tagsExist: true }) { nodes { name } } }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(7);
    });
  });

  // ==========================================================================
  // M:N VIA JUNCTION (location_amenities)
  // ==========================================================================
  describe('M:N amenities', () => {
    it('locations expose M:N amenities connection', async () => {
      const result = await gql<{
        locations: {
          nodes: { name: string; amenities: { nodes: { name: string }[] } }[];
        };
      }>(`
        query {
          locations(where: { name: { equalTo: "MoMA" } }) {
            nodes { name amenities { nodes { name } } }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const moma = result.data?.locations.nodes[0];
      expect(moma).toBeDefined();
      const amenityNames = moma!.amenities.nodes.map((a) => a.name).sort();
      expect(amenityNames).toEqual(['Gift Shop', 'Restrooms', 'WiFi']);
    });

    it('M:N add then remove via serial PK', async () => {
      // Create junction row
      const create = await gql<{
        createLocationAmenity: {
          locationAmenity: { id: number; locationId: number; amenityId: number };
        };
      }>(
        `mutation($input: CreateLocationAmenityInput!) {
          createLocationAmenity(input: $input) {
            locationAmenity { id locationId amenityId }
          }
        }`,
        { input: { locationAmenity: { locationId: 4, amenityId: 1 } } },
      );

      expect(create.errors).toBeUndefined();
      const created = create.data!.createLocationAmenity.locationAmenity;
      expect(created.locationId).toBe(4);
      expect(created.amenityId).toBe(1);

      // Verify added
      const verify = await gql<{
        locations: { nodes: { amenities: { nodes: { name: string }[] } }[] };
      }>(`
        query {
          locations(where: { name: { equalTo: "Times Square Diner" } }) {
            nodes { amenities { nodes { name } } }
          }
        }
      `);
      expect(verify.data?.locations.nodes[0].amenities.nodes.map((a) => a.name)).toContain('WiFi');

      // Delete by serial PK
      const del = await gql<{
        deleteLocationAmenity: {
          locationAmenity: { locationId: number; amenityId: number } | null;
        };
      }>(
        `mutation($input: DeleteLocationAmenityInput!) {
          deleteLocationAmenity(input: $input) {
            locationAmenity { locationId amenityId }
          }
        }`,
        { input: { id: created.id } },
      );

      expect(del.errors).toBeUndefined();

      // Verify removed
      const after = await gql<{
        locations: { nodes: { amenities: { nodes: { name: string }[] } }[] };
      }>(`
        query {
          locations(where: { name: { equalTo: "Times Square Diner" } }) {
            nodes { amenities { nodes { name } } }
          }
        }
      `);
      expect(after.data?.locations.nodes[0].amenities.nodes.map((a) => a.name)).not.toContain('WiFi');
    });
  });

  // ==========================================================================
  // KITCHEN SINK: multi-plugin combos
  // ==========================================================================
  describe('kitchen sink (multi-plugin queries)', () => {
    it('combines tsvector + scalar + relation filter', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query {
          locations(where: {
            tsvTsv: "park",
            isActive: { equalTo: true },
            category: { name: { equalTo: "Parks" } }
          }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('combines BM25 + scalar filter', async () => {
      const result = await gql<{
        locations: { nodes: { name: string; bodyBm25Score: number }[] };
      }>(`
        query {
          locations(where: {
            bm25Body: { query: "museum" },
            isActive: { equalTo: true }
          }) {
            nodes { name bodyBm25Score }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations?.nodes ?? [];
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(typeof node.bodyBm25Score).toBe('number');
      }
    });

    it('combines OR with tsvector and scalar', async () => {
      const result = await gql<{ locations: { nodes: { name: string }[] } }>(`
        query {
          locations(where: { or: [{ tsvTsv: "coffee" }, { name: { equalTo: "MoMA" } }] }) {
            nodes { name }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(2);
      const names = result.data?.locations.nodes.map((n) => n.name).sort();
      expect(names).toEqual(['Central Park Cafe', 'MoMA']);
    });

    it('vector search returns ordered neighbors', async () => {
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
  // THE MEGA QUERY — all 7 plugin types + multi-signal ORDER BY in ONE query
  // ==========================================================================
  describe('mega query', () => {
    /**
     * One GraphQL request proving every plugin in ConstructivePreset composes:
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

      const result = await gql<{
        locations: {
          nodes: {
            name: string;
            bodyBm25Score: number;
            tsvRank: number;
            nameTrgmSimilarity: number;
            embedding: number[];
            geom: { geojson: { type: string; coordinates: number[] } };
            category: { name: string };
            tags: { nodes: { label: string }[] };
            amenities: { nodes: { name: string }[] };
          }[];
        };
      }>(
        `query MegaQuery($bbox: GeoJSON!) {
          locations(
            where: {
              # 1. tsvector full-text search
              tsvTsv: "park"
              # 2. BM25 relevance search (pg_textsearch)
              bm25Body: { query: "park green" }
              # 3. pg_trgm fuzzy matching
              trgmName: { value: "park", threshold: 0.1 }
              # 4. Relation filter (FK -> categories)
              category: { name: { equalTo: "Parks" } }
              # 5. Scalar filter
              isActive: { equalTo: true }
              # 6. pgvector similarity
              vectorEmbedding: { nearby: { embedding: [0, 1, 0], distance: 2.0 } }
              # 7. PostGIS spatial
              geom: { intersects: $bbox }
            }
            orderBy: [BODY_BM25_SCORE_ASC, NAME_TRGM_SIMILARITY_DESC]
          ) {
            nodes {
              name
              bodyBm25Score
              tsvRank
              nameTrgmSimilarity
              embedding
              geom { geojson }
              category { name }
              tags { nodes { label } }
              amenities { nodes { name } }
            }
          }
        }`,
        { bbox: nycBbox },
      );

      expect(result.errors).toBeUndefined();
      const nodes = result.data?.locations.nodes ?? [];

      // Active NYC parks should pass all 7 filters simultaneously
      expect(nodes.length).toBeGreaterThanOrEqual(2);

      // Verify BM25 ordering: ASC means most-negative (most relevant) first
      for (let i = 0; i < nodes.length - 1; i++) {
        expect(nodes[i].bodyBm25Score).toBeLessThanOrEqual(nodes[i + 1].bodyBm25Score);
      }

      for (const node of nodes) {
        // BM25 score (negative float, closer to 0 = more relevant)
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
      const result = await gql<{
        locations: { nodes: { name: string }[]; pageInfo: { hasNextPage: boolean } };
      }>(`
        query {
          locations(where: { isActive: { equalTo: true } }, first: 3) {
            nodes { name }
            pageInfo { hasNextPage }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.locations.nodes).toHaveLength(3);
      expect(result.data?.locations.pageInfo.hasNextPage).toBe(true);
    });
  });
});
