/**
 * Integration test for vector (pgvector) codegen support.
 *
 * Uses the example-vector.schema.graphql fixture which includes:
 * - Vector scalar type
 * - Plugin-injected condition fields (embeddingNearby, contentEmbeddingNearby)
 * - Plugin-injected orderBy values (EMBEDDING_DISTANCE_ASC/DESC)
 * - VectorNearbyInput and VectorMetric types
 *
 * This test exercises the full codegen pipeline (schema file → introspection →
 * tables + typeRegistry → generated TypeScript) to verify that vector types
 * are correctly included in the generated output.
 */
import path from 'node:path';

import { getConfigOptions } from '../../types/config';
import { generateOrm } from '../../core/codegen/orm';
import { runCodegenPipeline } from '../../core/pipeline';
import { FileSchemaSource } from '../../core/introspect/source/file';

const VECTOR_SCHEMA_PATH = path.resolve(
  __dirname,
  '../../..',
  'examples/example-vector.schema.graphql',
);

describe('vector codegen integration', () => {
  let pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>;

  beforeAll(async () => {
    const source = new FileSchemaSource({ schemaPath: VECTOR_SCHEMA_PATH });
    const config = getConfigOptions({ orm: true, output: '/tmp/test-output' });

    pipelineResult = await runCodegenPipeline({
      source,
      config,
    });
  });

  // ========================================================================
  // Pipeline sanity checks
  // ========================================================================

  it('infers Contact and Document tables from the vector schema', () => {
    const tableNames = pipelineResult.tables.map((t) => t.name);
    expect(tableNames).toContain('Contact');
    expect(tableNames).toContain('Document');
  });

  it('produces a typeRegistry with vector-related types', () => {
    const { typeRegistry } = pipelineResult.customOperations;

    // Condition types should be in the registry
    expect(typeRegistry.has('ContactCondition')).toBe(true);
    expect(typeRegistry.has('DocumentCondition')).toBe(true);

    // Vector search types
    expect(typeRegistry.has('VectorNearbyInput')).toBe(true);
    expect(typeRegistry.has('VectorMetric')).toBe(true);

    // OrderBy enums
    expect(typeRegistry.has('ContactsOrderBy')).toBe(true);
    expect(typeRegistry.has('DocumentsOrderBy')).toBe(true);
  });

  it('ContactCondition in typeRegistry includes embeddingNearby field', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const conditionType = typeRegistry.get('ContactCondition');

    expect(conditionType).toBeDefined();
    expect(conditionType!.kind).toBe('INPUT_OBJECT');

    const fieldNames = conditionType!.inputFields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain('embeddingNearby');
  });

  it('ContactsOrderBy in typeRegistry includes distance values', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const orderByType = typeRegistry.get('ContactsOrderBy');

    expect(orderByType).toBeDefined();
    expect(orderByType!.kind).toBe('ENUM');
    expect(orderByType!.enumValues).toContain('EMBEDDING_DISTANCE_ASC');
    expect(orderByType!.enumValues).toContain('EMBEDDING_DISTANCE_DESC');
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

    // === Vector scalar mapping ===

    it('maps Vector scalar to number[] in entity types', () => {
      // Contact entity should have embedding as number[]
      expect(inputTypesContent).toContain('embedding?: number[] | null;');
    });

    // === Condition types with plugin-injected fields ===

    it('generates ContactCondition with embeddingNearby field', () => {
      expect(inputTypesContent).toContain(
        'export interface ContactCondition {',
      );

      // Standard column fields
      expect(inputTypesContent).toMatch(/id\?.*string.*null/);
      expect(inputTypesContent).toMatch(/name\?.*string.*null/);
      expect(inputTypesContent).toMatch(/email\?.*string.*null/);

      // Plugin-injected field
      expect(inputTypesContent).toContain('embeddingNearby');
    });

    it('generates DocumentCondition with contentEmbeddingNearby field', () => {
      expect(inputTypesContent).toContain(
        'export interface DocumentCondition {',
      );

      // Plugin-injected field
      expect(inputTypesContent).toContain('contentEmbeddingNearby');
    });

    it('generates VectorNearbyInput type', () => {
      expect(inputTypesContent).toContain(
        'export interface VectorNearbyInput {',
      );
      // vector field should be required (NON_NULL in schema)
      expect(inputTypesContent).toMatch(/vector:\s*number\[\]/);
      // metric and threshold should be optional
      expect(inputTypesContent).toContain('metric?');
      expect(inputTypesContent).toContain('threshold?');
    });

    it('generates VectorMetric enum type', () => {
      expect(inputTypesContent).toContain('VectorMetric');
      expect(inputTypesContent).toContain('"L2"');
      expect(inputTypesContent).toContain('"INNER_PRODUCT"');
      expect(inputTypesContent).toContain('"COSINE"');
    });

    // === OrderBy types with plugin-injected values ===

    it('generates ContactsOrderBy with distance values', () => {
      expect(inputTypesContent).toContain('export type ContactsOrderBy =');
      // Standard values
      expect(inputTypesContent).toContain('"PRIMARY_KEY_ASC"');
      expect(inputTypesContent).toContain('"ID_ASC"');
      expect(inputTypesContent).toContain('"NAME_ASC"');
      // Plugin-injected distance values
      expect(inputTypesContent).toContain('"EMBEDDING_DISTANCE_ASC"');
      expect(inputTypesContent).toContain('"EMBEDDING_DISTANCE_DESC"');
    });

    it('generates DocumentsOrderBy with content embedding distance values', () => {
      expect(inputTypesContent).toContain('export type DocumentsOrderBy =');
      // Plugin-injected distance values
      expect(inputTypesContent).toContain(
        '"CONTENT_EMBEDDING_DISTANCE_ASC"',
      );
      expect(inputTypesContent).toContain(
        '"CONTENT_EMBEDDING_DISTANCE_DESC"',
      );
    });

    // === Backwards compatibility ===

    it('still generates standard CRUD input types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface CreateContactInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface UpdateContactInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface DeleteContactInput {',
      );
      expect(inputTypesContent).toContain('export interface ContactPatch {');
    });

    it('still generates standard filter types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface ContactFilter {',
      );
      expect(inputTypesContent).toContain(
        'export interface DocumentFilter {',
      );
    });
  });
});
