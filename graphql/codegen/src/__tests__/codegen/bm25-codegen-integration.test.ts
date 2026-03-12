/**
 * Integration test for BM25 (pg_textsearch) codegen support.
 *
 * Uses the example-bm25.schema.graphql fixture which includes:
 * - Plugin-injected condition fields (bm25Body, bm25Content)
 * - Plugin-injected orderBy values (BM25_BODY_SCORE_ASC/DESC, BM25_CONTENT_SCORE_ASC/DESC)
 * - Bm25SearchInput custom input type (query: String!, threshold?: Float)
 *
 * This test exercises the full codegen pipeline (schema file → introspection →
 * tables + typeRegistry → generated TypeScript) to verify that BM25 search types
 * are correctly included in the generated output.
 */
import path from 'node:path';

import { getConfigOptions } from '../../types/config';
import { generateOrm } from '../../core/codegen/orm';
import { runCodegenPipeline } from '../../core/pipeline';
import { FileSchemaSource } from '../../core/introspect/source/file';

const BM25_SCHEMA_PATH = path.resolve(
  __dirname,
  '../../..',
  'examples/example-bm25.schema.graphql',
);

describe('bm25 codegen integration', () => {
  let pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>;

  beforeAll(async () => {
    const source = new FileSchemaSource({ schemaPath: BM25_SCHEMA_PATH });
    const config = getConfigOptions({ orm: true, output: '/tmp/test-output' });

    pipelineResult = await runCodegenPipeline({
      source,
      config,
    });
  });

  // ========================================================================
  // Pipeline sanity checks
  // ========================================================================

  it('infers Article and Post tables from the BM25 schema', () => {
    const tableNames = pipelineResult.tables.map((t) => t.name);
    expect(tableNames).toContain('Article');
    expect(tableNames).toContain('Post');
  });

  it('produces a typeRegistry with BM25-related types', () => {
    const { typeRegistry } = pipelineResult.customOperations;

    // Condition types should be in the registry
    expect(typeRegistry.has('ArticleCondition')).toBe(true);
    expect(typeRegistry.has('PostCondition')).toBe(true);

    // BM25 search input type
    expect(typeRegistry.has('Bm25SearchInput')).toBe(true);

    // OrderBy enums
    expect(typeRegistry.has('ArticlesOrderBy')).toBe(true);
    expect(typeRegistry.has('PostsOrderBy')).toBe(true);
  });

  it('ArticleCondition in typeRegistry includes bm25Body field', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const conditionType = typeRegistry.get('ArticleCondition');

    expect(conditionType).toBeDefined();
    expect(conditionType!.kind).toBe('INPUT_OBJECT');

    const fieldNames = conditionType!.inputFields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain('bm25Body');
  });

  it('PostCondition in typeRegistry includes bm25Content field', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const conditionType = typeRegistry.get('PostCondition');

    expect(conditionType).toBeDefined();
    expect(conditionType!.kind).toBe('INPUT_OBJECT');

    const fieldNames = conditionType!.inputFields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain('bm25Content');
  });

  it('ArticlesOrderBy in typeRegistry includes BM25 score values', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const orderByType = typeRegistry.get('ArticlesOrderBy');

    expect(orderByType).toBeDefined();
    expect(orderByType!.kind).toBe('ENUM');
    expect(orderByType!.enumValues).toContain('BM25_BODY_SCORE_ASC');
    expect(orderByType!.enumValues).toContain('BM25_BODY_SCORE_DESC');
  });

  it('PostsOrderBy in typeRegistry includes BM25 score values', () => {
    const { typeRegistry } = pipelineResult.customOperations;
    const orderByType = typeRegistry.get('PostsOrderBy');

    expect(orderByType).toBeDefined();
    expect(orderByType!.kind).toBe('ENUM');
    expect(orderByType!.enumValues).toContain('BM25_CONTENT_SCORE_ASC');
    expect(orderByType!.enumValues).toContain('BM25_CONTENT_SCORE_DESC');
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

    // === Condition types with plugin-injected BM25 fields ===

    it('generates ArticleCondition with bm25Body field', () => {
      expect(inputTypesContent).toContain(
        'export interface ArticleCondition {',
      );

      // Standard column fields
      expect(inputTypesContent).toMatch(/id\?.*string.*null/);
      expect(inputTypesContent).toMatch(/title\?.*string.*null/);
      expect(inputTypesContent).toMatch(/body\?.*string.*null/);

      // Plugin-injected BM25 search field
      expect(inputTypesContent).toContain('bm25Body');
    });

    it('generates PostCondition with bm25Content field', () => {
      expect(inputTypesContent).toContain(
        'export interface PostCondition {',
      );

      // Plugin-injected BM25 search field
      expect(inputTypesContent).toContain('bm25Content');
    });

    it('generates Bm25SearchInput type', () => {
      expect(inputTypesContent).toContain(
        'export interface Bm25SearchInput {',
      );
      // query field should be required (NON_NULL String in schema)
      expect(inputTypesContent).toMatch(/query:\s*string/);
      // threshold should be optional
      expect(inputTypesContent).toContain('threshold?');
    });

    // === OrderBy types with plugin-injected BM25 score values ===

    it('generates ArticlesOrderBy with BM25 score values', () => {
      expect(inputTypesContent).toContain('export type ArticlesOrderBy =');
      // Standard values
      expect(inputTypesContent).toContain('"PRIMARY_KEY_ASC"');
      expect(inputTypesContent).toContain('"ID_ASC"');
      expect(inputTypesContent).toContain('"TITLE_ASC"');
      // Plugin-injected BM25 score values
      expect(inputTypesContent).toContain('"BM25_BODY_SCORE_ASC"');
      expect(inputTypesContent).toContain('"BM25_BODY_SCORE_DESC"');
    });

    it('generates PostsOrderBy with BM25 content score values', () => {
      expect(inputTypesContent).toContain('export type PostsOrderBy =');
      // Plugin-injected BM25 score values
      expect(inputTypesContent).toContain('"BM25_CONTENT_SCORE_ASC"');
      expect(inputTypesContent).toContain('"BM25_CONTENT_SCORE_DESC"');
    });

    // === Backwards compatibility ===

    it('still generates standard CRUD input types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface CreateArticleInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface UpdateArticleInput {',
      );
      expect(inputTypesContent).toContain(
        'export interface DeleteArticleInput {',
      );
      expect(inputTypesContent).toContain('export interface ArticlePatch {');
    });

    it('still generates standard filter types correctly', () => {
      expect(inputTypesContent).toContain(
        'export interface ArticleFilter {',
      );
      expect(inputTypesContent).toContain(
        'export interface PostFilter {',
      );
    });
  });
});
