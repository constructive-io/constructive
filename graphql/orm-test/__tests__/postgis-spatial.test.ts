/**
 * PostGIS Spatial Operators — ORM Integration Test
 *
 * Regression guard for constructive-io/constructive-planning#724 and living
 * documentation for every PostGIS spatial filter the ORM exposes.
 *
 * Exercises:
 *   — All 27 spatial operators registered by `graphile-postgis` (26 standard
 *     operators in connection-filter-operators.ts + `withinDistance` from
 *     within-distance-operator.ts).
 *   — Every concrete geometry subtype (Point, LineString, Polygon, MultiPoint,
 *     MultiLineString, MultiPolygon, GeometryCollection, PointZ).
 *   — The geography codec (Point and Polygon columns).
 *   — Every GeoJSON input shape as filter RHS against a point column.
 *   — Combinations with AND/OR/NOT logical filters and scalar filters.
 *   — Edge cases: nullable columns, empty polygons, CRS-qualified GeoJSON.
 *
 * All data is seeded via __fixtures__/seed/postgis-spatial-seed.sql — no
 * inline seed strings, matching the mega-query.test.ts convention.
 *
 * Requires postgres-plus image with the `postgis` extension.
 */
import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { ConstructivePreset } from 'graphile-settings';
import { runCodegenAndLoad } from './helpers/codegen-helper';
import { GraphileTestAdapter } from './helpers/graphile-adapter';

jest.setTimeout(120000);

const seedFile = join(
  __dirname,
  '..',
  '__fixtures__',
  'seed',
  'postgis-spatial-seed.sql',
);
const SCHEMA = 'postgis_test';

// ============================================================================
// Fixture-derived constants — every coordinate here matches the seed file.
// ============================================================================

/** City row IDs in the seed (serial, 1-indexed). */
const SF = 1;
const OAKLAND = 2;
const LA = 3;
const NY = 4;
const SEATTLE = 5;
const CHICAGO = 6;

// ---- GeoJSON input shapes ----

/** Exactly SF's coordinates — used for equality-flavoured operators. */
const SF_POINT = { type: 'Point', coordinates: [-122.4194, 37.7749] };
const OAKLAND_POINT = { type: 'Point', coordinates: [-122.2712, 37.8044] };

/** Bay Area rectangle: covers SF + Oakland, excludes all other cities. */
const BAY_AREA_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-122.55, 37.70],
      [-122.20, 37.70],
      [-122.20, 37.85],
      [-122.55, 37.85],
      [-122.55, 37.70],
    ],
  ],
};

/** NYC Metro rectangle: covers NY only. */
const NYC_METRO_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-74.15, 40.60],
      [-73.70, 40.60],
      [-73.70, 40.90],
      [-74.15, 40.90],
      [-74.15, 40.60],
    ],
  ],
};

/** West-coast strip: covers SF + Oakland + LA + Seattle, excludes NY + Chicago. */
const WEST_COAST_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-122.55, 32.00],
      [-117.00, 32.00],
      [-117.00, 49.00],
      [-122.55, 49.00],
      [-122.55, 32.00],
    ],
  ],
};

/** Pacific Ocean rectangle: contains no cities — used by `disjoint`. */
const PACIFIC_OCEAN_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-135, 15],
      [-125, 15],
      [-125, 40],
      [-135, 40],
      [-135, 15],
    ],
  ],
};

/** LineString from SF through Oakland — both points lie exactly on the line. */
const SF_OAKLAND_LINE = {
  type: 'LineString',
  coordinates: [
    [-122.4194, 37.7749],
    [-122.2712, 37.8044],
  ],
};

/** MultiPoint listing SF and LA exactly. */
const SF_LA_MULTIPOINT = {
  type: 'MultiPoint',
  coordinates: [
    [-122.4194, 37.7749],
    [-118.2437, 34.0522],
  ],
};

/** MultiLineString through SF and NY (two disjoint lines). */
const SF_NY_MULTILINESTRING = {
  type: 'MultiLineString',
  coordinates: [
    [
      [-122.55, 37.7],
      [-122.10, 37.8],
    ],
    [
      [-74.20, 40.65],
      [-73.80, 40.80],
    ],
  ],
};

/** MultiPolygon: three disjoint west-coast regions (Bay, LA Basin, Seattle). */
const WEST_COAST_METROS_MULTIPOLYGON = {
  type: 'MultiPolygon',
  coordinates: [
    [[[-122.55, 37.70], [-122.20, 37.70], [-122.20, 37.85], [-122.55, 37.85], [-122.55, 37.70]]],
    [[[-119.00, 33.00], [-117.00, 33.00], [-117.00, 35.00], [-119.00, 35.00], [-119.00, 33.00]]],
    [[[-123.00, 47.00], [-121.00, 47.00], [-121.00, 48.00], [-123.00, 48.00], [-123.00, 47.00]]],
  ],
};

/** GeometryCollection mixing an SF point with an NYC-Metro polygon. */
const SF_NYC_COLLECTION = {
  type: 'GeometryCollection',
  geometries: [
    { type: 'Point', coordinates: [-122.4194, 37.7749] },
    {
      type: 'Polygon',
      coordinates: [
        [
          [-74.15, 40.60],
          [-73.70, 40.60],
          [-73.70, 40.90],
          [-74.15, 40.90],
          [-74.15, 40.60],
        ],
      ],
    },
  ],
};

/** 3D polygon prism around SF covering altitudes 0–500m. */
const SF_VOLUME_POLYGON_Z = {
  type: 'Polygon',
  coordinates: [
    [
      [-122.50, 37.72, 0],
      [-122.35, 37.72, 0],
      [-122.35, 37.82, 500],
      [-122.50, 37.82, 500],
      [-122.50, 37.72, 0],
    ],
  ],
};

/** Points deliberately shifted so directional-bbox operators return SF only. */
const POINT_EAST_OF_SF = { type: 'Point', coordinates: [-100.0, 37.7749] };
const POINT_WEST_OF_SF = { type: 'Point', coordinates: [-140.0, 37.7749] };
const POINT_NORTH_OF_SF = { type: 'Point', coordinates: [-122.4194, 60.0] };
const POINT_SOUTH_OF_SF = { type: 'Point', coordinates: [-122.4194, 10.0] };

/** GeoJSON with an explicit EPSG:4326 CRS hint (legacy but valid). */
const BAY_AREA_POLYGON_WITH_CRS = {
  ...BAY_AREA_POLYGON,
  crs: { type: 'name', properties: { name: 'EPSG:4326' } },
};

/** Empty polygon: a degenerate ring. */
const EMPTY_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ],
};

// ============================================================================

/** Extract the sole connection field from the ORM response. */
function unwrap(data: unknown): { nodes: Array<{ id: number | string }>; totalCount?: number } {
  return Object.values(data as Record<string, unknown>)[0] as any;
}

/** Sort numeric (or numeric-string) ids ascending and return them. */
function ids(nodes: Array<{ id: number | string }>): number[] {
  return nodes.map((n) => Number(n.id)).sort((a, b) => a - b);
}

describe('PostGIS spatial operators (ORM, live PG)', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;
  let orm: Record<string, any>;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: { extends: [ConstructivePreset] },
        useRoot: true,
        db: {
          extensions: ['postgis'],
        },
      },
      [seed.sqlfile([seedFile])],
    );
    teardown = connections.teardown;
    query = connections.query;

    const { createClient } = await runCodegenAndLoad(query, 'postgis-spatial');
    const adapter = new GraphileTestAdapter(query);
    orm = createClient({ adapter });
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  // ==========================================================================
  // SECTION A — Binding smoke test
  //
  // `intersects` is the only topological operator supported on both codecs,
  // so it's our canonical "does the GeoJSON binding work at all?" probe. We
  // fire it across every GeoJSON shape the spec allows as RHS input, against
  // a Point column. If any of these land a `parse error - invalid geometry`,
  // the binding regression is back.
  // ==========================================================================
  describe('A. GeoJSON input shape binding (regression guard for #724)', () => {
    const INPUT_SHAPE_CASES: Array<[string, unknown, number[]]> = [
      ['Point',              SF_POINT,                      [SF]],
      ['LineString',         SF_OAKLAND_LINE,               [SF, OAKLAND]],
      ['Polygon',            BAY_AREA_POLYGON,              [SF, OAKLAND]],
      ['MultiPoint',         SF_LA_MULTIPOINT,              [SF, LA]],
      ['MultiLineString',    SF_NY_MULTILINESTRING,         [SF, NY]],
      ['MultiPolygon',       WEST_COAST_METROS_MULTIPOLYGON, [SF, OAKLAND, LA, SEATTLE]],
      ['GeometryCollection', SF_NYC_COLLECTION,             [SF, NY]],
    ];

    describe('geometry(Point, 4326) column', () => {
      it.each(INPUT_SHAPE_CASES)(
        'intersects accepts %s input',
        async (_shape, value, expectedIds) => {
          const result = await orm.cityGeom
            .findMany({
              select: { id: true, name: true },
              where: { loc: { intersects: value } },
            })
            .execute();
          expect(result.ok).toBe(true);
          expect(ids(unwrap(result.data).nodes)).toEqual(expectedIds);
        },
      );
    });

    describe('geography(Point, 4326) column', () => {
      it.each(INPUT_SHAPE_CASES)(
        'intersects accepts %s input',
        async (_shape, value, expectedIds) => {
          const result = await orm.cityGeog
            .findMany({
              select: { id: true, name: true },
              where: { loc: { intersects: value } },
            })
            .execute();
          expect(result.ok).toBe(true);
          expect(ids(unwrap(result.data).nodes)).toEqual(expectedIds);
        },
      );
    });
  });

  // ==========================================================================
  // SECTION B.1 — Every geometry spatial operator
  //
  // Every operator registered by graphile-postgis for the geometry codec
  // fires without error and returns semantically-correct rows against the
  // seeded `cities_geom` table. Directional-bbox tests use tailored inputs
  // so the expected set is never empty.
  // ==========================================================================
  describe('B.1. All geometry operators on cities_geom.loc', () => {
    // ---- Topological functions (ST_*) ----

    it('intersects: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { intersects: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('contains: Point col + SF point → SF only', async () => {
      // On a Point column, contains is true only for the exact same point.
      const r = await orm.cityGeom.findMany({ where: { loc: { contains: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('containsProperly: Point col + SF point → empty (a point never properly-contains another point)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { containsProperly: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    it('within: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { within: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('covers: SF point → SF only', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { covers: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('coveredBy: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { coveredBy: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('crosses: Bay Area polygon → empty (points never cross polygons per PostGIS semantics)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { crosses: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    it('disjoint: Pacific Ocean polygon → all 6 cities', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { disjoint: PACIFIC_OCEAN_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, NY, SEATTLE, CHICAGO]);
    });

    it('equals: SF point → SF only', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { equals: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('orderingEquals: SF point → SF only', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { orderingEquals: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('overlaps: Bay Area polygon → empty (points do not share interior with polygons)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { overlaps: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    it('touches: Bay Area polygon → empty (interior points never touch)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { touches: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    // ---- Exact equality SQL operator ----

    it('exactlyEquals: SF point → SF only', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { exactlyEquals: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    // ---- 2D bbox operators ----

    it('bboxIntersects2D: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxIntersects2D: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('bboxIntersectsND: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxIntersectsND: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('bboxContains: SF point → SF only (point bbox contains SF point bbox)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxContains: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('bboxEquals: SF point → SF only', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxEquals: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    // ---- Directional bbox operators ----
    // `<<` strictly-left / `>>` strictly-right / `|>>` strictly-above /
    // `<<|` strictly-below. Inputs are crafted so SF's bbox is on the
    // expected side of the RHS bbox.

    it('bboxLeftOf: point east of SF → SF + Oakland + Seattle + LA', async () => {
      // Cities with bbox strictly to the left (west) of a point at -100° lon.
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxLeftOf: POINT_EAST_OF_SF } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, SEATTLE]);
    });

    it('bboxRightOf: point west of SF → Chicago + NY (and all cities east of -140°)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxRightOf: POINT_WEST_OF_SF } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      // Every seeded city is east of -140°, so the whole set qualifies.
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, NY, SEATTLE, CHICAGO]);
    });

    it('bboxAbove: point south of SF → every city (all are north of lat 10°)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxAbove: POINT_SOUTH_OF_SF } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, NY, SEATTLE, CHICAGO]);
    });

    it('bboxBelow: point far north → every city (all are south of lat 60°)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxBelow: POINT_NORTH_OF_SF } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, NY, SEATTLE, CHICAGO]);
    });

    it('bboxOverlapsOrLeftOf: Bay Area polygon → SF + Oakland + LA + Seattle', async () => {
      // Left-or-overlap of the Bay Area bbox — LA/Seattle are east/south of it
      // but both have longitudes west of the polygon's *right* edge (-122.20).
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxOverlapsOrLeftOf: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, SEATTLE]);
    });

    it('bboxOverlapsOrRightOf: Bay Area polygon → NY + Chicago + LA (all east of -122.55)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxOverlapsOrRightOf: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      // Every seeded city is east of the Bay Area's left edge (-122.55):
      // SF (-122.42), Oakland (-122.27), LA (-118.24), NY (-74.01), Seattle
      // (-122.33), Chicago (-87.63).
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA, NY, SEATTLE, CHICAGO]);
    });

    it('bboxOverlapsOrAbove: Bay Area polygon → SF/Oakland/NY/Seattle/Chicago (all lat ≥ 37.70)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxOverlapsOrAbove: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, NY, SEATTLE, CHICAGO]);
    });

    it('bboxOverlapsOrBelow: Bay Area polygon → SF/Oakland/LA (all lat ≤ 37.85)', async () => {
      const r = await orm.cityGeom.findMany({ where: { loc: { bboxOverlapsOrBelow: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, LA]);
    });

    // ---- withinDistance (function w/ args) ----

    it('withinDistance: 20km around Oakland → SF + Oakland', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { loc: { withinDistance: { point: OAKLAND_POINT, distance: 20000 } } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });
  });

  // ==========================================================================
  // SECTION B.2 — Every geography spatial operator
  //
  // The 6 operators graphile-postgis registers for geography types, all
  // against `cities_geog.loc`.
  // ==========================================================================
  describe('B.2. All geography operators on cities_geog.loc', () => {
    it('intersects: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeog.findMany({ where: { loc: { intersects: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('covers: SF point → SF only', async () => {
      const r = await orm.cityGeog.findMany({ where: { loc: { covers: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('coveredBy: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeog.findMany({ where: { loc: { coveredBy: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('exactlyEquals: SF point → SF only', async () => {
      const r = await orm.cityGeog.findMany({ where: { loc: { exactlyEquals: SF_POINT } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('bboxIntersects2D: Bay Area polygon → SF + Oakland', async () => {
      const r = await orm.cityGeog.findMany({ where: { loc: { bboxIntersects2D: BAY_AREA_POLYGON } }, select: { id: true } }).execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('withinDistance: 20km around Oakland → SF + Oakland', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { withinDistance: { point: OAKLAND_POINT, distance: 20000 } } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });
  });

  // ==========================================================================
  // SECTION C — Column type showcase
  //
  // One representative, semantically-natural filter per non-Point column
  // type. Proves the ORM exposes spatial filters on every concrete geometry
  // subtype end-to-end.
  // ==========================================================================
  describe('C. Column type showcase (non-Point subtypes)', () => {
    it('geometry(Polygon) — regions within the continental US', async () => {
      const US_POLYGON = {
        type: 'Polygon',
        coordinates: [
          [
            [-130, 24],
            [-65, 24],
            [-65, 50],
            [-130, 50],
            [-130, 24],
          ],
        ],
      };
      const r = await orm.regionGeom
        .findMany({ where: { shape: { within: US_POLYGON } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // Bay Area, NYC Metro, West Coast Strip all fall within the US polygon.
      // Pacific Ocean polygon straddles -125 lon and extends south to lat 15,
      // which is outside the US rectangle — so it is excluded.
      expect(ids(unwrap(r.data).nodes)).toEqual([1, 2, 3]);
    });

    it('geometry(MultiPolygon) — territories intersecting SF', async () => {
      const r = await orm.territoryGeom
        .findMany({ where: { regions: { intersects: SF_POINT } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // West Coast Metros includes Bay Area (SF) → match; East Coast does not.
      expect(ids(unwrap(r.data).nodes)).toEqual([1]);
    });

    it('geometry(LineString) — routes intersecting the Bay Area polygon', async () => {
      const r = await orm.routeGeom
        .findMany({ where: { path: { intersects: BAY_AREA_POLYGON } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // Both routes start at SF, so both intersect the Bay Area polygon.
      expect(ids(unwrap(r.data).nodes)).toEqual([1, 2]);
    });

    it('geometry(MultiPoint) — swarms intersecting the West Coast polygon', async () => {
      const r = await orm.swarmGeom
        .findMany({ where: { points: { intersects: WEST_COAST_POLYGON } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // West Coast Swarm = SF + LA + Seattle, all inside the strip. East Coast
      // Swarm = NY + DC + Boston, all outside.
      expect(ids(unwrap(r.data).nodes)).toEqual([1]);
    });

    it('geometry(MultiLineString) — networks intersecting the Bay Area polygon', async () => {
      const r = await orm.networkGeom
        .findMany({ where: { paths: { intersects: BAY_AREA_POLYGON } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // Bay Area Transit lies entirely in the polygon; East Coast Rail does not.
      expect(ids(unwrap(r.data).nodes)).toEqual([1]);
    });

    it('geometry(GeometryCollection) — collections intersecting SF', async () => {
      const r = await orm.collectionGeom
        .findMany({ where: { shapes: { intersects: SF_POINT } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([1]);
    });

    it('geometry(PointZ) — towers intersecting a 2D SF polygon (intersects)', async () => {
      const r = await orm.towerGeom
        .findMany({ where: { loc3d: { intersects: BAY_AREA_POLYGON } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // Both towers are in SF — 2D intersection with the Bay Area ignores Z.
      expect(ids(unwrap(r.data).nodes)).toEqual([1, 2]);
    });

    it('geometry(PointZ) — intersects3D against a 3D prism', async () => {
      const r = await orm.towerGeom
        .findMany({ where: { loc3d: { intersects3D: SF_VOLUME_POLYGON_Z } }, select: { id: true, name: true } })
        .execute();
      expect(r.ok).toBe(true);
      // Both towers have Z in [0, 500]. This also pins that intersects3D
      // accepts a PolygonZ input without parse errors.
      expect(ids(unwrap(r.data).nodes)).toEqual([1, 2]);
    });
  });

  // ==========================================================================
  // SECTION D — Combinations with logical + scalar filters
  // ==========================================================================
  describe('D. Combinations with logical and scalar filters', () => {
    it('AND: two spatial filters (in West Coast ∩ in Bay Area) → SF + Oakland', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: {
            loc: { intersects: WEST_COAST_POLYGON },
            and: [{ loc: { within: BAY_AREA_POLYGON } }],
          },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('OR: two spatial regions (Bay Area ∪ NYC Metro) → SF + Oakland + NY', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: {
            or: [
              { loc: { within: BAY_AREA_POLYGON } },
              { loc: { within: NYC_METRO_POLYGON } },
            ],
          },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND, NY]);
    });

    it('NOT: negated spatial filter → all cities outside Bay Area', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { not: { loc: { within: BAY_AREA_POLYGON } } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([LA, NY, SEATTLE, CHICAGO]);
    });

    it('spatial + scalar: West Coast + name starts with "S" → SF + Seattle', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: {
            loc: { intersects: WEST_COAST_POLYGON },
            name: { startsWith: 'S' },
          },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, SEATTLE]);
    });

    it('spatial + orderBy: West Coast cities ordered by NAME_ASC', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { loc: { intersects: WEST_COAST_POLYGON } },
          orderBy: ['NAME_ASC'],
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      const names = unwrap(r.data).nodes.map((n: any) => n.name);
      expect(names).toEqual(['Los Angeles', 'Oakland', 'San Francisco', 'Seattle']);
    });
  });

  // ==========================================================================
  // SECTION E — Edge cases
  // ==========================================================================
  describe('E. Edge cases', () => {
    it('isNull: true on secondary_loc → rows 3..6', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { secondaryLoc: { isNull: true } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([LA, NY, SEATTLE, CHICAGO]);
    });

    it('isNull: false on secondary_loc → rows 1..2', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { secondaryLoc: { isNull: false } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('intersects: empty polygon → empty result (no parse error)', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { loc: { intersects: EMPTY_POLYGON } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    it('intersects: GeoJSON with CRS hint → SF + Oakland', async () => {
      const r = await orm.cityGeom
        .findMany({
          where: { loc: { intersects: BAY_AREA_POLYGON_WITH_CRS } },
          select: { id: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });
  });

  // ==========================================================================
  // SECTION F — Direct regression mirrors for issue #724
  //
  // 1:1 shape-match for the `it(...)` blocks in agentic-db's
  // packages/integration-tests/__tests__/orm.test.ts. When the upstream fix
  // lands, these flip from red → green in constructive CI; the agentic-db
  // regression-guard (which asserts `ok === false`) then fails, alerting
  // agentic-db maintainers to invert it.
  // ==========================================================================
  describe('F. #724 regression mirrors (geography codec, Bay Area polygon)', () => {
    it('bboxIntersects2D: SF + Oakland', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { bboxIntersects2D: BAY_AREA_POLYGON } },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('coveredBy: SF + Oakland', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { coveredBy: BAY_AREA_POLYGON } },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });

    it('covers: SF only (SF point covers itself)', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { covers: SF_POINT } },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('exactlyEquals: SF only', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { exactlyEquals: SF_POINT } },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF]);
    });

    it('intersects: SF + Oakland', async () => {
      const r = await orm.cityGeog
        .findMany({
          where: { loc: { intersects: BAY_AREA_POLYGON } },
          select: { id: true, name: true },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF, OAKLAND]);
    });
  });
});
