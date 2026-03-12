/**
 * Integration test for PostGIS codegen support.
 *
 * Uses the example-postgis.schema.graphql fixture which includes:
 * - GeoJSON scalar type (for geometry/geography columns)
 * - GeoJSONFilter in filter types (equality/distinct operators)
 * - Geometry columns mapped to unknown in entity types
 *
 * This test exercises the full codegen pipeline (schema file → introspection →
 * tables + typeRegistry → generated TypeScript) to verify that PostGIS geometry
 * types are correctly included in the generated output.
 */
import path from 'node:path';

import { getConfigOptions } from '../../types/config';
import { generateOrm } from '../../core/codegen/orm';
import { runCodegenPipeline } from '../../core/pipeline';
import { FileSchemaSource } from '../../core/introspect/source/file';

const POSTGIS_SCHEMA_PATH = path.resolve(
  __dirname,
  '../../..',
  'examples/example-postgis.schema.graphql',
);

describe('postgis codegen integration', () => {
  let pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>;

  beforeAll(async () => {
    const source = new FileSchemaSource({ schemaPath: POSTGIS_SCHEMA_PATH });
    const config = getConfigOptions({ orm: true, output: '/tmp/test-output' });

    pipelineResult = await runCodegenPipeline({
      source,
      config,
    });
  });

  // ========================================================================
  // Pipeline sanity checks
  // ========================================================================

  it('infers Place and Route tables from the PostGIS schema', () => {
    const tableNames = pipelineResult.tables.map((t) => t.name);
    expect(tableNames).toContain('Place');
    expect(tableNames).toContain('Route');
  });

  it('Place table has a GeoJSON location field', () => {
    const placeTable = pipelineResult.tables.find((t) => t.name === 'Place');
    expect(placeTable).toBeDefined();
    const locationField = placeTable!.fields.find(
      (f) => f.name === 'location',
    );
    expect(locationField).toBeDefined();
    // Field type may be a string or an object with gqlType
    const fieldType = typeof locationField!.type === 'string'
      ? locationField!.type
      : (locationField!.type as any).gqlType;
    expect(fieldType).toBe('GeoJSON');
  });

  it('Route table has a GeoJSON path field', () => {
    const routeTable = pipelineResult.tables.find((t) => t.name === 'Route');
    expect(routeTable).toBeDefined();
    const pathField = routeTable!.fields.find((f) => f.name === 'path');
    expect(pathField).toBeDefined();
    const fieldType = typeof pathField!.type === 'string'
      ? pathField!.type
      : (pathField!.type as any).gqlType;
    expect(fieldType).toBe('GeoJSON');
  });

  // ========================================================================
  // Full ORM generation
  // ========================================================================

  describe('generated ORM output', () => {
    let inputTypesContent: string;

    beforeAll(() => {
      const { tables, customOperations } = pipelineResult;
      const config = getConfigOptions({ orm: true, output: '/tmp/test-output' });

      const result = generateOrm({
        tables,
        customOperations,
        config,
      });

      const inputTypesFile = result.files.find((f) =>
        f.path.includes('input-types'),
      );
      expect(inputTypesFile).toBeDefined();
      inputTypesContent = inputTypesFile!.content;
    });

    // === GeoJSON scalar mapping ===

    it('maps GeoJSON scalar to unknown in entity types', () => {
      expect(inputTypesContent).toContain('export interface Place {');
      // GeoJSON → unknown
      expect(inputTypesContent).toContain('location?: unknown | null;');
    });

    it('maps GeoJSON scalar to unknown in Route entity', () => {
      expect(inputTypesContent).toContain('export interface Route {');
      expect(inputTypesContent).toContain('path?: unknown | null;');
    });

    // === GeoJSONFilter in filter types ===

    it('generates GeoJSONFilter interface', () => {
      expect(inputTypesContent).toContain('export interface GeoJSONFilter {');
      expect(inputTypesContent).toContain('isNull?: boolean;');
      expect(inputTypesContent).toContain('equalTo?: unknown;');
      expect(inputTypesContent).toContain('notEqualTo?: unknown;');
      expect(inputTypesContent).toContain('distinctFrom?: unknown;');
      expect(inputTypesContent).toContain('notDistinctFrom?: unknown;');
    });

    it('uses GeoJSONFilter for geometry columns in PlaceFilter', () => {
      expect(inputTypesContent).toContain('export interface PlaceFilter {');
      // The location field should reference GeoJSONFilter
      expect(inputTypesContent).toMatch(/location\?.*GeoJSONFilter/);
    });

    it('uses GeoJSONFilter for geometry columns in RouteFilter', () => {
      expect(inputTypesContent).toContain('export interface RouteFilter {');
      // The path field should reference GeoJSONFilter
      expect(inputTypesContent).toMatch(/path\?.*GeoJSONFilter/);
    });

    // === GeoJSON in condition types ===

    it('generates PlaceCondition with GeoJSON location field', () => {
      expect(inputTypesContent).toContain(
        'export interface PlaceCondition {',
      );
      expect(inputTypesContent).toMatch(/location\?.*unknown.*null/);
    });

    // === GeoJSON in create/patch input types ===

    it('includes GeoJSON fields in create input types', () => {
      expect(inputTypesContent).toContain('export interface CreatePlaceInput {');
      expect(inputTypesContent).toContain('export interface CreateRouteInput {');
      // GeoJSON location field should appear as unknown in create inputs
      expect(inputTypesContent).toMatch(/location\?.*unknown/);
    });

    it('includes GeoJSON fields in patch types', () => {
      expect(inputTypesContent).toContain('export interface PlacePatch {');
      expect(inputTypesContent).toContain('export interface RoutePatch {');
    });

    // === Backwards compatibility ===

    it('still generates standard CRUD input types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface CreatePlaceInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface UpdatePlaceInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface DeletePlaceInput {',
      );
    });

    it('still generates standard filter types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface PlaceFilter {',
      );
      expect(inputTypesContent).toContain(
        'export interface RouteFilter {',
      );
      // Standard scalar filters should still exist
      expect(inputTypesContent).toContain('export interface StringFilter {');
      expect(inputTypesContent).toContain('export interface UUIDFilter {');
    });
  });
});
