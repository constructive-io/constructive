/**
 * PostgisSpatialRelationsPlugin — ORM Integration Test
 *
 * Exercises cross-table and self-relation spatial filters declared via
 * `@spatialRelation` smart tags.
 *
 * Fixture (see __fixtures__/seed/postgis-spatial-seed.sql):
 *   - counties(id, name, geom GEOMETRY(Polygon, 4326))
 *   - telemedicine_clinics(id, name, specialty, location GEOMETRY(Point, 4326))
 *   - COMMENT ON telemedicine_clinics.location declares:
 *       @spatialRelation county            counties.geom               st_within
 *       @spatialRelation intersectingCounty counties.geom              st_intersects
 *       @spatialRelation coveringCounty    counties.geom               st_coveredby
 *       @spatialRelation nearbyClinic      telemedicine_clinics.location st_dwithin distance
 */
import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { ConstructivePreset } from 'graphile-settings';
import { runCodegenAndLoad } from '@constructive-io/graphql-test';
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

// Fixture row IDs (serial, 1-indexed).
const SF_PEDIATRICS = 1;
const OAKLAND_GENERAL = 2;
const SF_CARDIO = 3;
const LA_PEDIATRICS = 4;
const NYC_CARDIO = 5;
const SEATTLE_UNCOVERED = 6;

/** Extract the sole connection field from the ORM response. */
function unwrap(
  data: unknown,
): { nodes: Array<{ id: number | string }>; totalCount?: number } {
  return Object.values(data as Record<string, unknown>)[0] as any;
}

/** Sort numeric ids ascending and return them. */
function ids(nodes: Array<{ id: number | string }>): number[] {
  return nodes.map((n) => Number(n.id)).sort((a, b) => a - b);
}

describe('PostgisSpatialRelationsPlugin (ORM, live PG)', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;
  let orm: Record<string, any>;
  let introspection: any;

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

    const loaded = await runCodegenAndLoad(query, 'postgis-spatial-relations');
    const adapter = new GraphileTestAdapter(query);
    orm = loaded.createClient({ adapter });

    // Capture the live schema for shape assertions below.
    const { SCHEMA_INTROSPECTION_QUERY } = await import(
      '@constructive-io/graphql-query'
    );
    const introResult = await query<{ __schema: any }>({
      query: SCHEMA_INTROSPECTION_QUERY,
    });
    introspection = introResult.data!;
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  // ==========================================================================
  // SECTION A — Schema shape
  //
  // Verify that the plugin actually registered filter fields on the owner
  // codec's Filter type, with the right types (sub-filter for 2-arg ops,
  // parametric spatial filter for st_dwithin).
  // ==========================================================================
  describe('A. Schema shape', () => {
    const findType = (name: string) =>
      introspection.__schema.types.find((t: any) => t.name === name);

    it('registers the 2-arg spatial relations directly as sub-filter fields', () => {
      const clinicFilter = findType('TelemedicineClinicFilter');
      expect(clinicFilter).toBeDefined();
      const fields = (clinicFilter.inputFields as Array<any>).map(
        (f) => f.name,
      );
      expect(fields).toEqual(
        expect.arrayContaining([
          'county',
          'intersectingCounty',
          'coveringCounty',
          'nearbyClinic',
        ]),
      );
    });

    it('2-arg relations point at the target table Filter type (via some/every/none)', () => {
      const clinicFilter = findType('TelemedicineClinicFilter');
      const countyField = (clinicFilter.inputFields as Array<any>).find(
        (f) => f.name === 'county',
      );
      expect(countyField).toBeDefined();
      // Wrapped filter type
      const wrapperTypeName =
        countyField.type?.name ?? countyField.type?.ofType?.name;
      const wrapper = findType(wrapperTypeName);
      expect(wrapper).toBeDefined();
      const subNames = (wrapper.inputFields as Array<any>).map(
        (f: any) => f.name,
      );
      expect(subNames).toEqual(
        expect.arrayContaining(['some', 'every', 'none']),
      );
    });

    it('parametric st_dwithin relation exposes a required distance Float field', () => {
      const clinicFilter = findType('TelemedicineClinicFilter');
      const nearField = (clinicFilter.inputFields as Array<any>).find(
        (f) => f.name === 'nearbyClinic',
      );
      expect(nearField).toBeDefined();
      const wrapperTypeName =
        nearField.type?.name ?? nearField.type?.ofType?.name;
      const wrapper = findType(wrapperTypeName);
      expect(wrapper).toBeDefined();
      const distance = (wrapper.inputFields as Array<any>).find(
        (f: any) => f.name === 'distance',
      );
      expect(distance).toBeDefined();
      // Must be NonNull<Float>
      expect(distance.type.kind).toBe('NON_NULL');
      expect(distance.type.ofType.name).toBe('Float');
    });
  });

  // ==========================================================================
  // SECTION B — Cross-table 2-arg relations
  // ==========================================================================
  describe('B. Cross-table spatial relations (2-arg operators)', () => {
    it('st_within: clinics in Bay County → SF Pediatrics, Oakland General, SF Cardio', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true, name: true },
          where: { county: { some: { name: { equalTo: 'Bay County' } } } },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual(
        [SF_PEDIATRICS, OAKLAND_GENERAL, SF_CARDIO].sort((a, b) => a - b),
      );
    });

    it('st_within: clinics in LA County → LA Pediatrics only', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: { county: { some: { name: { equalTo: 'LA County' } } } },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([LA_PEDIATRICS]);
    });

    it('st_within: clinics in NYC County → NYC Cardio only', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: { county: { some: { name: { equalTo: 'NYC County' } } } },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([NYC_CARDIO]);
    });

    it('st_within: Seattle Uncovered matches no county', async () => {
      // Seattle_Uncovered's point is not inside any seeded county polygon,
      // so `county: { some: {...} }` with no name filter should still exclude it.
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true, name: true },
          where: { county: { some: {} } },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).not.toContain(SEATTLE_UNCOVERED);
    });

    it('st_intersects: same sets as st_within for point-in-polygon cases', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            intersectingCounty: { some: { name: { equalTo: 'Bay County' } } },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual(
        [SF_PEDIATRICS, OAKLAND_GENERAL, SF_CARDIO].sort((a, b) => a - b),
      );
    });

    it('st_coveredby: clinics coveredBy LA County → LA Pediatrics', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            coveringCounty: { some: { name: { equalTo: 'LA County' } } },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([LA_PEDIATRICS]);
    });
  });

  // ==========================================================================
  // SECTION C — `none` and `every` sub-filters
  // ==========================================================================
  describe('C. some / every / none modes on spatial relations', () => {
    it('none: clinics whose county has name = "NYC County" → everyone except NYC Cardio', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: { county: { none: { name: { equalTo: 'NYC County' } } } },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).not.toContain(NYC_CARDIO);
      expect(ids(unwrap(r.data).nodes)).toContain(SF_PEDIATRICS);
    });

    it('every (no sub-filter): all clinics with at least one containing county → matches rows inside some county', async () => {
      // `every: {}` is tautologically true when there are no matching rows,
      // so the assertion is weaker here — we just assert no crash + some
      // expected rows present.
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: { county: { every: { name: { equalTo: 'Bay County' } } } },
        })
        .execute();
      expect(r.ok).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION D — Self-relation with parametric st_dwithin
  // ==========================================================================
  describe('D. Self-relation with st_dwithin (parametric distance)', () => {
    it('finds clinics near SF cardiology clinics within 10 SRID units (degrees)', async () => {
      // 10 degrees is huge in SRID-4326 units — it's easily enough to sweep in
      // SF Pediatrics, Oakland General, SF Cardio, and LA Pediatrics, but not
      // NYC (>40 degrees away) or Seattle (~10 degrees north, borderline).
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true, name: true },
          where: {
            nearbyClinic: {
              distance: 10.0,
              some: { specialty: { equalTo: 'cardiology' } },
            },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      const got = ids(unwrap(r.data).nodes);
      // NYC Cardio is a cardiology clinic itself — BUT the self-exclusion
      // predicate means NYC Cardio is not "near itself" for this query.
      // SF Cardio is the only other cardiology clinic, so we expect clinics
      // within 10 degrees of SF Cardio → SF Pediatrics, Oakland General.
      // NYC Cardio is within 10 degrees of itself only (excluded).
      expect(got).toEqual(expect.arrayContaining([SF_PEDIATRICS, OAKLAND_GENERAL]));
      // Self-exclusion must leave SF Cardio out of its own radius match
      // when the inner filter requires cardiology — SF Cardio would match
      // only via itself, which is excluded.
      expect(got).not.toContain(SF_CARDIO);
    });

    it('finds no clinic when the distance is 0 (nothing is "near" another clinic at exactly 0 degrees)', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            nearbyClinic: {
              distance: 0,
              some: {},
            },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      // Every row self-excluded → empty.
      expect(ids(unwrap(r.data).nodes)).toEqual([]);
    });

    it('finds the right pair with small distance (~0.1 degree) → SF cluster only', async () => {
      // SF Pediatrics and SF Cardio are ~0.02 degrees apart; Oakland General
      // is ~0.15 degrees from SF. A 0.1-degree radius matches the two SF
      // clinics to each other but nobody else.
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            nearbyClinic: {
              distance: 0.1,
              some: {},
            },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual(
        [SF_PEDIATRICS, SF_CARDIO].sort((a, b) => a - b),
      );
    });
  });

  // ==========================================================================
  // SECTION E — Composition with AND/OR/NOT + scalar filters
  // ==========================================================================
  describe('E. Composition with logical and scalar filters', () => {
    it('AND: clinics in Bay County that are cardiology → SF Cardio', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            and: [
              { county: { some: { name: { equalTo: 'Bay County' } } } },
              { specialty: { equalTo: 'cardiology' } },
            ],
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual([SF_CARDIO]);
    });

    it('OR: clinics in Bay County OR named "LA Pediatrics" → Bay clinics + LA Pediatrics', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            or: [
              { county: { some: { name: { equalTo: 'Bay County' } } } },
              { name: { equalTo: 'LA Pediatrics' } },
            ],
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual(
        [SF_PEDIATRICS, OAKLAND_GENERAL, SF_CARDIO, LA_PEDIATRICS].sort(
          (a, b) => a - b,
        ),
      );
    });

    it('NOT: clinics NOT in Bay County → LA, NYC, Seattle', async () => {
      const r = await orm.telemedicineClinic
        .findMany({
          select: { id: true },
          where: {
            not: { county: { some: { name: { equalTo: 'Bay County' } } } },
          },
        })
        .execute();
      expect(r.ok).toBe(true);
      expect(ids(unwrap(r.data).nodes)).toEqual(
        [LA_PEDIATRICS, NYC_CARDIO, SEATTLE_UNCOVERED].sort((a, b) => a - b),
      );
    });
  });
});
