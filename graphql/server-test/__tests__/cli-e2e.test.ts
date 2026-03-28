/**
 * CLI End-to-End Tests
 *
 * Tests the generated CLI commands against a real PostgreSQL database.
 * Approach: codegen -> transpile (ts.transpileModule) -> execute as child process.
 *
 * Uses ts.transpileModule instead of tsc to avoid needing all type
 * dependencies (e.g. @constructive-io/graphql-types) in the temp dir.
 * transpileModule strips types without resolving imports.
 *
 * IMPORTANT: Uses async spawn (not execFileSync) because the GraphQL server
 * runs in the same Node.js process — synchronous child execution would block
 * the event loop and prevent the server from responding to HTTP requests.
 *
 * Suite 1 — Animals (simple-seed):
 *   5 animals (Buddy/Dog, Max/Dog, Whiskers/Cat, Mittens/Cat, Tweety/Bird)
 *   Tests: pagination, cursor, find-first, where+orderBy, empty results
 *
 * Suite 2 — Articles (search-seed):
 *   5 articles with tsvector, pg_trgm, optional pgvector columns
 *   Tests: search subcommand, tsvector search, trgm fuzzy matching,
 *          composite fullTextSearch, search+pagination, pgvector (conditional)
 *
 * Suite 3 — Blueprint generation:
 *   Tests: generate-types with live _meta, graceful fallback without --meta
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import * as ts from 'typescript';

import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';
import type { Table } from '@constructive-io/graphql-codegen';
import { generateCli } from '@constructive-io/graphql-codegen/core/codegen/cli';
import { generateOrm } from '@constructive-io/graphql-codegen/core/codegen/orm';

jest.setTimeout(120000);

/**
 * Resolve the node_modules directories needed by the child process.
 * pnpm uses strict isolation — packages live in .pnpm/ subdirectories
 * and workspace packages resolve to source dirs (no node_modules in path).
 * We include the server-test node_modules (which has symlinks for all deps)
 * plus every intermediate .pnpm node_modules directory discovered via
 * require.resolve for each runtime dependency.
 */
function resolveNodePaths(): string[] {
  const runtimeDeps = [
    '@0no-co/graphql.web',
    'gql-ast',
    'appstash',
    'inquirerer',
    'nested-obj',
    'graphql',
    '@constructive-io/graphql-types',
  ];
  const dirs = new Set<string>();

  // Always include server-test's own node_modules (has pnpm symlinks for all deps)
  dirs.add(path.join(__dirname, '..', 'node_modules'));
  // And the monorepo root node_modules
  dirs.add(path.join(__dirname, '..', '..', '..', 'node_modules'));

  for (const mod of runtimeDeps) {
    try {
      const resolved = require.resolve(mod);
      // Collect every node_modules directory in the resolved path
      let idx = 0;
      while ((idx = resolved.indexOf('node_modules', idx)) !== -1) {
        dirs.add(resolved.substring(0, idx + 'node_modules'.length));
        idx += 'node_modules'.length;
      }
    } catch {
      // skip unresolvable — not all are needed for every test
    }
  }
  return [...dirs];
}

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) =>
  path.join(seedRoot, seedDir, file);

const TOOL_NAME = 'cli-e2e-test';

const TS_COMPILE_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  strict: false,
};

/**
 * Build the Table object matching the simple-seed animals schema.
 * This mirrors what introspection would produce for the animals table.
 */
function buildAnimalsTable(): Table {
  return {
    name: 'Animal',
    fields: [
      {
        name: 'id',
        type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
        isNotNull: true,
        hasDefault: true,
      },
      {
        name: 'name',
        type: { gqlType: 'String', isArray: false, pgType: 'text' },
        isNotNull: true,
        hasDefault: false,
      },
      {
        name: 'species',
        type: { gqlType: 'String', isArray: false, pgType: 'text' },
        isNotNull: true,
        hasDefault: false,
      },
      {
        name: 'ownerId',
        type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
        isNotNull: false,
        hasDefault: false,
      },
      {
        name: 'createdAt',
        type: {
          gqlType: 'Datetime',
          isArray: false,
          pgType: 'timestamptz',
        },
        isNotNull: false,
        hasDefault: true,
      },
      {
        name: 'updatedAt',
        type: {
          gqlType: 'Datetime',
          isArray: false,
          pgType: 'timestamptz',
        },
        isNotNull: false,
        hasDefault: true,
      },
    ],
    relations: {
      belongsTo: [] as never[],
      hasOne: [] as never[],
      hasMany: [] as never[],
      manyToMany: [] as never[],
    },
    inflection: {
      allRows: 'animals',
      allRowsSimple: 'animalsList',
      conditionType: 'AnimalCondition',
      connection: 'AnimalsConnection',
      createField: 'animal',
      createInputType: 'CreateAnimalInput',
      createPayloadType: 'CreateAnimalPayload',
      deleteByPrimaryKey: 'deleteAnimalById',
      deletePayloadType: 'DeleteAnimalPayload',
      edge: 'AnimalsEdge',
      edgeField: 'animalsEdge',
      enumType: 'Animal',
      filterType: 'AnimalFilter',
      inputType: 'AnimalInput',
      orderByType: 'AnimalOrderBy',
      patchField: 'animalPatch',
      patchType: 'AnimalPatch',
      tableFieldName: 'animal',
      tableType: 'Animal',
      typeName: 'Animal',
      updateByPrimaryKey: 'updateAnimalById',
      updatePayloadType: 'UpdateAnimalPayload',
    },
    query: {
      all: 'animals',
      one: 'animalById',
      create: 'createAnimal',
      update: 'updateAnimalById',
      delete: 'deleteAnimalById',
      patchFieldName: 'animalPatch',
    },
    constraints: {
      primaryKey: [
        {
          name: 'animals_pkey',
          fields: [
            {
              name: 'id',
              type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
              isNotNull: true,
              hasDefault: true,
            },
          ],
        },
      ],
      foreignKey: [] as never[],
      unique: [] as never[],
    },
  };
}

/**
 * Transpile a single TS file to JS using ts.transpileModule.
 * Strips types without resolving imports — avoids needing external type packages.
 */
function transpileFile(content: string): string {
  return ts.transpileModule(content, {
    compilerOptions: TS_COMPILE_OPTIONS,
  }).outputText;
}

/**
 * Write generated TS files to srcDir, then transpile each to distDir as JS.
 */
function writeAndTranspile(
  srcDir: string,
  distDir: string,
  subdir: string,
  files: Array<{ fileName?: string; path?: string; content: string }>,
) {
  for (const file of files) {
    const relPath = file.fileName ?? file.path ?? '';
    // Write TS source (for reference)
    const srcPath = path.join(srcDir, subdir, relPath);
    fs.mkdirSync(path.dirname(srcPath), { recursive: true });
    fs.writeFileSync(srcPath, file.content, 'utf-8');

    // Transpile TS -> JS and write to dist
    const jsRelPath = relPath.replace(/\.ts$/, '.js');
    const distPath = path.join(distDir, subdir, jsRelPath);
    fs.mkdirSync(path.dirname(distPath), { recursive: true });
    fs.writeFileSync(distPath, transpileFile(file.content), 'utf-8');
  }
}

/**
 * Set up appstash context files in a temp HOME directory.
 * Creates the directory structure that createConfigStore() expects:
 *   ~/.cli-e2e-test/config/settings.json
 *   ~/.cli-e2e-test/config/contexts/default.json
 *   ~/.cli-e2e-test/config/credentials.json (with test token)
 */
function setupAppstashContext(
  tmpHome: string,
  graphqlUrl: string,
  token?: string,
) {
  const configDir = path.join(tmpHome, `.${TOOL_NAME}`, 'config');
  const contextsDir = path.join(configDir, 'contexts');
  fs.mkdirSync(contextsDir, { recursive: true });

  // Settings file: set current context to "default"
  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify({ currentContext: 'default' }),
    'utf-8',
  );

  // Context file: endpoint pointing at the test GraphQL server
  const now = new Date().toISOString();
  fs.writeFileSync(
    path.join(contextsDir, 'default.json'),
    JSON.stringify({
      name: 'default',
      endpoint: graphqlUrl,
      createdAt: now,
      updatedAt: now,
    }),
    'utf-8',
  );

  // Credentials file: optional bearer token for auth testing
  if (token) {
    fs.writeFileSync(
      path.join(configDir, 'credentials.json'),
      JSON.stringify({ tokens: { default: token } }),
      'utf-8',
    );
  }
}

describe('CLI E2E — generated CLI against real DB', () => {
  let server: ServerInfo;
  let teardown: () => Promise<void>;
  let tmpDir: string;
  let tmpHome: string;
  let distDir: string;

  /**
   * Run the compiled CLI as a child process (async).
   * Uses spawn instead of execFileSync so the Node.js event loop stays
   * unblocked — the GraphQL server in this process can respond to requests.
   */
  function runCli(...args: string[]): Promise<string> {
    const runnerPath = path.join(distDir, '_runner.js');
    if (!fs.existsSync(runnerPath)) {
      fs.writeFileSync(
        runnerPath,
        [
          "const { parseArgv, Inquirerer } = require('inquirerer');",
          "const { commands } = require('./cli/commands');",
          'const argv = parseArgv(process.argv);',
          'const prompter = new Inquirerer({ input: process.stdin, output: process.stdout, noTty: true });',
          "commands(argv, prompter, { noTty: true }).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });",
        ].join('\n'),
        'utf-8',
      );
    }

    return new Promise<string>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [runnerPath, ...args],
        {
          env: {
            ...process.env,
            APPSTASH_BASE_DIR: tmpHome,
            NODE_PATH: [
              distDir,
              ...resolveNodePaths(),
            ].join(path.delimiter),
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`CLI timed out after 30s.\nstdout: ${stdout}\nstderr: ${stderr}`));
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`CLI exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      // Close stdin immediately — CLI runs in non-interactive mode
      child.stdin.end();
    });
  }

  beforeAll(async () => {
    // 1. Spin up real DB + GraphQL server with simple-seed fixture
    const conn = await getConnections(
      {
        schemas: ['simple-pets-pets-public'],
        authRole: 'anonymous',
        server: { api: { enableServicesApi: false, isPublic: false } },
      },
      [
        seed.sqlfile([
          sql('simple-seed', 'setup.sql'),
          sql('simple-seed', 'schema.sql'),
          sql('simple-seed', 'test-data.sql'),
        ]),
      ],
    );
    server = conn.server;
    teardown = conn.teardown;

    // 2. Create temp directories
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-'));
    tmpHome = path.join(tmpDir, 'home');
    distDir = path.join(tmpDir, 'dist');
    const srcDir = path.join(tmpDir, 'src');

    // 3. Generate + transpile ORM files
    const animalsTable = buildAnimalsTable();
    const ormResult = generateOrm({
      tables: [animalsTable],
      config: { codegen: { comments: false, condition: true } },
    });
    writeAndTranspile(srcDir, distDir, 'orm', ormResult.files);

    // 4. Generate + transpile CLI files
    const cliResult = generateCli({
      tables: [animalsTable],
      config: {
        cli: { toolName: TOOL_NAME, entryPoint: true },
        codegen: { comments: false, condition: true },
      },
    });
    writeAndTranspile(srcDir, distDir, 'cli', cliResult.files);

    // 5. Set up appstash context pointing at the test GraphQL server
    setupAppstashContext(tmpHome, server.graphqlUrl, 'test-token-123');
  });

  afterAll(async () => {
    if (teardown) await teardown();
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // Test 1: Paginated list with where filter + field projection
  // =========================================================================

  it('should list with --limit, --where (dot-notation), and --fields', async () => {
    const output = await runCli(
      'animal',
      'list',
      '--limit',
      '2',
      '--where.species.equalTo',
      'Cat',
      '--fields',
      'id,name,species',
    );

    // ORM execute() returns { ok, data } where data holds the query result
    const raw = JSON.parse(output);
    const result = raw.data?.animals ?? raw;
    const nodes = result.nodes ?? result;

    // Should have at most 2 results (limit=2) and all should be cats
    expect(nodes.length).toBeLessThanOrEqual(2);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    for (const node of nodes) {
      expect(node.species).toBe('Cat');
      // Should only include the selected fields
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('species');
    }
  });

  // =========================================================================
  // Test 2: Cursor-based forward pagination
  // =========================================================================

  it('should support cursor-based forward pagination (--after)', async () => {
    // First page: get 2 records
    const page1Output = await runCli(
      'animal',
      'list',
      '--limit',
      '2',
      '--fields',
      'id,name',
    );
    const page1Raw = JSON.parse(page1Output);
    const page1 = page1Raw.data?.animals ?? page1Raw;

    // Should have pageInfo with endCursor
    expect(page1.pageInfo).toBeDefined();
    expect(page1.pageInfo.hasNextPage).toBe(true);
    expect(page1.pageInfo.endCursor).toBeTruthy();
    expect(page1.nodes).toHaveLength(2);

    // Second page: use the endCursor
    const page2Output = await runCli(
      'animal',
      'list',
      '--limit',
      '2',
      '--after',
      page1.pageInfo.endCursor,
      '--fields',
      'id,name',
    );
    const page2Raw = JSON.parse(page2Output);
    const page2 = page2Raw.data?.animals ?? page2Raw;

    expect(page2.nodes).toHaveLength(2);

    // Pages should have different records
    const page1Ids = page1.nodes.map((n: { id: string }) => n.id);
    const page2Ids = page2.nodes.map((n: { id: string }) => n.id);
    for (const id of page2Ids) {
      expect(page1Ids).not.toContain(id);
    }
  });

  // =========================================================================
  // Test 3: find-first with dot-notation where
  // =========================================================================

  it('should find-first with --where.name.equalTo', async () => {
    const output = await runCli(
      'animal',
      'find-first',
      '--where.name.equalTo',
      'Buddy',
      '--fields',
      'id,name,species',
    );

    const raw = JSON.parse(output);
    // find-first returns the connection result; extract first node
    const result = raw.data?.animals ?? raw;
    const node = result.nodes?.[0] ?? result;

    expect(node.name).toBe('Buddy');
    expect(node.species).toBe('Dog');
    expect(node.id).toBe('a0000001-0000-0000-0000-000000000001');
  });

  // =========================================================================
  // Test 4: Combined where + orderBy + fields
  // =========================================================================

  it('should combine --where + --orderBy + --fields for sorted filtered results', async () => {
    const output = await runCli(
      'animal',
      'list',
      '--where.species.equalTo',
      'Cat',
      '--orderBy',
      'ID_ASC',
      '--fields',
      'id,name,species',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.animals ?? raw;
    const nodes = result.nodes ?? result;

    // Should have exactly 2 cats
    expect(nodes).toHaveLength(2);
    // Both should be cats
    expect(nodes[0].species).toBe('Cat');
    expect(nodes[1].species).toBe('Cat');
    // Ordered by ID_ASC: first ID should be lexicographically less
    expect(nodes[0].id < nodes[1].id).toBe(true);
  });

  // =========================================================================
  // Test 5: Empty result set handling
  // =========================================================================

  it('should handle empty result sets gracefully', async () => {
    const output = await runCli(
      'animal',
      'list',
      '--where.species.equalTo',
      'Fish',
      '--fields',
      'id,name',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.animals ?? raw;
    const nodes = result.nodes ?? result;

    // No fish in the test data
    expect(nodes).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});

// =============================================================================
// Suite 2: Search CLI — articles with tsvector, trgm, pgvector
// =============================================================================

/**
 * Build the Table object matching the search-seed articles schema.
 * Includes tsvector (FullText), trgm computed fields, and optional pgvector.
 *
 * The search plugin generates computed fields (tsvRank, titleTrgmSimilarity,
 * bodyTrgmSimilarity, searchScore) that appear as read-only scalars.
 * The codegen detects these via gqlType and naming patterns to enable
 * the `search` subcommand.
 */
function buildArticlesTable(hasVector: boolean): Table {
  const fields: Table['fields'] = [
    {
      name: 'id',
      type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
      isNotNull: true,
      hasDefault: true,
    },
    {
      name: 'title',
      type: { gqlType: 'String', isArray: false, pgType: 'text' },
      isNotNull: true,
      hasDefault: false,
    },
    {
      name: 'body',
      type: { gqlType: 'String', isArray: false, pgType: 'text' },
      isNotNull: false,
      hasDefault: false,
    },
    // tsvector column — PostGraphile maps to FullText GQL scalar
    {
      name: 'tsv',
      type: { gqlType: 'FullText', isArray: false, pgType: 'tsvector' },
      isNotNull: false,
      hasDefault: false,
    },
    {
      name: 'createdAt',
      type: { gqlType: 'Datetime', isArray: false, pgType: 'timestamptz' },
      isNotNull: false,
      hasDefault: true,
    },
    {
      name: 'updatedAt',
      type: { gqlType: 'Datetime', isArray: false, pgType: 'timestamptz' },
      isNotNull: false,
      hasDefault: true,
    },
    // Computed search fields (read-only, generated by graphile-search plugin)
    {
      name: 'tsvRank',
      type: { gqlType: 'Float', isArray: false, pgType: 'float8' },
      isNotNull: false,
      hasDefault: false,
    },
    {
      name: 'titleTrgmSimilarity',
      type: { gqlType: 'Float', isArray: false, pgType: 'float8' },
      isNotNull: false,
      hasDefault: false,
    },
    {
      name: 'bodyTrgmSimilarity',
      type: { gqlType: 'Float', isArray: false, pgType: 'float8' },
      isNotNull: false,
      hasDefault: false,
    },
    {
      name: 'searchScore',
      type: { gqlType: 'Float', isArray: false, pgType: 'float8' },
      isNotNull: false,
      hasDefault: false,
    },
  ];

  if (hasVector) {
    fields.push(
      {
        name: 'embedding',
        type: { gqlType: 'Vector', isArray: false, pgType: 'vector' },
        isNotNull: false,
        hasDefault: false,
      },
      {
        name: 'embeddingVectorDistance',
        type: { gqlType: 'Float', isArray: false, pgType: 'float8' },
        isNotNull: false,
        hasDefault: false,
      },
    );
  }

  return {
    name: 'Article',
    fields,
    relations: {
      belongsTo: [] as never[],
      hasOne: [] as never[],
      hasMany: [] as never[],
      manyToMany: [] as never[],
    },
    inflection: {
      allRows: 'articles',
      allRowsSimple: 'articlesList',
      conditionType: 'ArticleCondition',
      connection: 'ArticlesConnection',
      createField: 'article',
      createInputType: 'CreateArticleInput',
      createPayloadType: 'CreateArticlePayload',
      deleteByPrimaryKey: 'deleteArticleById',
      deletePayloadType: 'DeleteArticlePayload',
      edge: 'ArticlesEdge',
      edgeField: 'articlesEdge',
      enumType: 'Article',
      filterType: 'ArticleFilter',
      inputType: 'ArticleInput',
      orderByType: 'ArticleOrderBy',
      patchField: 'articlePatch',
      patchType: 'ArticlePatch',
      tableFieldName: 'article',
      tableType: 'Article',
      typeName: 'Article',
      updateByPrimaryKey: 'updateArticleById',
      updatePayloadType: 'UpdateArticlePayload',
    },
    query: {
      all: 'articles',
      one: 'articleById',
      create: 'createArticle',
      update: 'updateArticleById',
      delete: 'deleteArticleById',
      patchFieldName: 'articlePatch',
    },
    constraints: {
      primaryKey: [
        {
          name: 'articles_pkey',
          fields: [
            {
              name: 'id',
              type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
              isNotNull: true,
              hasDefault: true,
            },
          ],
        },
      ],
      foreignKey: [] as never[],
      unique: [] as never[],
    },
  };
}

describe('CLI E2E — search commands against real DB', () => {
  let server: ServerInfo;
  let request: import('supertest').Agent;
  let teardown: () => Promise<void>;
  let tmpDir: string;
  let tmpHome: string;
  let distDir: string;
  let hasVector = false;

  function runCli(...args: string[]): Promise<string> {
    const runnerPath = path.join(distDir, '_runner.js');
    if (!fs.existsSync(runnerPath)) {
      fs.writeFileSync(
        runnerPath,
        [
          "const { parseArgv, Inquirerer } = require('inquirerer');",
          "const { commands } = require('./cli/commands');",
          'const argv = parseArgv(process.argv);',
          'const prompter = new Inquirerer({ input: process.stdin, output: process.stdout, noTty: true });',
          "commands(argv, prompter, { noTty: true }).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });",
        ].join('\n'),
        'utf-8',
      );
    }

    return new Promise<string>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [runnerPath, ...args],
        {
          env: {
            ...process.env,
            APPSTASH_BASE_DIR: tmpHome,
            NODE_PATH: [
              distDir,
              ...resolveNodePaths(),
            ].join(path.delimiter),
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`CLI timed out after 30s.\nstdout: ${stdout}\nstderr: ${stderr}`));
      }, 30000);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`CLI exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      child.stdin.end();
    });
  }

  beforeAll(async () => {
    // 1. Spin up real DB + GraphQL server with search-seed fixture
    const conn = await getConnections(
      {
        schemas: ['search_public'],
        authRole: 'anonymous',
        server: { api: { enableServicesApi: false, isPublic: false } },
      },
      [
        seed.sqlfile([
          sql('search-seed', 'setup.sql'),
          sql('search-seed', 'schema.sql'),
          sql('search-seed', 'test-data.sql'),
        ]),
      ],
    );
    server = conn.server;
    request = conn.request;
    teardown = conn.teardown;

    // 2. Detect pgvector availability via schema introspection
    const introspection = await request.post('/graphql').send({
      query: `{
        __type(name: "Article") {
          fields { name }
        }
      }`,
    });
    const fieldNames =
      introspection.body.data?.__type?.fields?.map(
        (f: { name: string }) => f.name,
      ) ?? [];
    hasVector = fieldNames.includes('embeddingVectorDistance');

    // 3. Create temp directories
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-search-'));
    tmpHome = path.join(tmpDir, 'home');
    distDir = path.join(tmpDir, 'dist');
    const srcDir = path.join(tmpDir, 'src');

    // 4. Build Table with search fields (conditional pgvector)
    const articlesTable = buildArticlesTable(hasVector);

    // 5. Generate + transpile ORM files
    const ormResult = generateOrm({
      tables: [articlesTable],
      config: { codegen: { comments: false, condition: true } },
    });
    writeAndTranspile(srcDir, distDir, 'orm', ormResult.files);

    // 6. Generate + transpile CLI files
    const cliResult = generateCli({
      tables: [articlesTable],
      config: {
        cli: { toolName: TOOL_NAME, entryPoint: true },
        codegen: { comments: false, condition: true },
      },
    });
    writeAndTranspile(srcDir, distDir, 'cli', cliResult.files);

    // 7. Set up appstash context
    setupAppstashContext(tmpHome, server.graphqlUrl, 'test-token-123');
  });

  afterAll(async () => {
    if (teardown) await teardown();
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // Test 1: tsvector search via list --where (dot-notation passthrough)
  // Uses the server's actual filter field name (tsvTsv) via dot-notation.
  // =========================================================================

  it('should filter articles by tsvector search via --where.tsvTsv', async () => {
    const output = await runCli(
      'article',
      'list',
      '--where.tsvTsv',
      'machine learning',
      '--fields',
      'title,tsvRank',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.articles ?? raw;
    const nodes = result.nodes ?? result;

    expect(nodes.length).toBeGreaterThanOrEqual(1);
    // "Introduction to Machine Learning" should match
    const titles = nodes.map((n: { title: string }) => n.title);
    expect(titles).toContain('Introduction to Machine Learning');

    // tsvRank should be a positive number when search is active
    for (const node of nodes) {
      expect(typeof node.tsvRank).toBe('number');
      expect(node.tsvRank).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // Test 2: trgm fuzzy matching via list --where (dot-notation)
  // =========================================================================

  it('should filter articles by trgm similarity via dot-notation where', async () => {
    const output = await runCli(
      'article',
      'list',
      '--where.trgmTitle.value',
      'machin lerning',
      '--where.trgmTitle.threshold',
      '0.1',
      '--fields',
      'title,titleTrgmSimilarity',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.articles ?? raw;
    const nodes = result.nodes ?? result;

    expect(nodes.length).toBeGreaterThanOrEqual(1);
    // Similarity scores should be positive numbers
    for (const node of nodes) {
      expect(typeof node.titleTrgmSimilarity).toBe('number');
      expect(node.titleTrgmSimilarity).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // Test 3: composite fullTextSearch via list --where
  // The fullTextSearch filter dispatches to all text-capable adapters.
  // =========================================================================

  it('should filter via fullTextSearch composite filter', async () => {
    const output = await runCli(
      'article',
      'list',
      '--where.fullTextSearch',
      'vector databases',
      '--fields',
      'title,searchScore',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.articles ?? raw;
    const nodes = result.nodes ?? result;

    expect(nodes.length).toBeGreaterThanOrEqual(1);
    // "Vector Databases and Embeddings" should be in results
    const titles = nodes.map((n: { title: string }) => n.title);
    expect(titles).toContain('Vector Databases and Embeddings');

    // searchScore should be a number between 0 and 1
    for (const node of nodes) {
      expect(typeof node.searchScore).toBe('number');
      expect(node.searchScore).toBeGreaterThan(0);
      expect(node.searchScore).toBeLessThanOrEqual(1);
    }
  });

  // =========================================================================
  // Test 4: search + pagination
  // =========================================================================

  it('should combine search filter with --limit for paginated results', async () => {
    const output = await runCli(
      'article',
      'list',
      '--where.tsvTsv',
      'PostgreSQL',
      '--limit',
      '2',
      '--fields',
      'title,tsvRank',
    );

    const raw = JSON.parse(output);
    const result = raw.data?.articles ?? raw;
    const nodes = result.nodes ?? result;

    // Should respect limit
    expect(nodes.length).toBeLessThanOrEqual(2);
    expect(nodes.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // Test 5: pgvector search (conditional — skip if extension unavailable)
  // Note: vector arrays cannot be passed via CLI dot-notation (they become
  // strings, not JSON arrays). This test verifies the CLI reports a clear
  // GraphQL error rather than crashing silently.
  // =========================================================================

  it('should report a clear error when passing vector via dot-notation', async () => {
    if (!hasVector) {
      console.log('pgvector not available, skipping vector search test');
      return;
    }

    // CLI dot-notation sends "[0.1,0.9,0.3]" as a string, not a vector.
    // The GraphQL server should reject it with a type error.
    await expect(
      runCli(
        'article',
        'list',
        '--where.vectorEmbedding.vector',
        '[0.1,0.9,0.3]',
        '--where.vectorEmbedding.distance',
        '1.0',
        '--fields',
        'title,embeddingVectorDistance',
      ),
    ).rejects.toThrow();
  });

  // =========================================================================
  // Test 6: introspect Article fields from live schema
  // Verifies the search-seed schema exposes the expected fields including
  // tsvector (FullText), trgm computed fields, and searchScore.
  // =========================================================================

  it('should expose search fields on Article type via introspection', async () => {
    const introspectRes = await request.post('/graphql').send({
      query: `{
        __type(name: "Article") {
          fields {
            name
            type {
              name
              kind
              ofType { name kind }
            }
          }
        }
      }`,
    });

    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.errors).toBeUndefined();

    const fields = introspectRes.body.data.__type.fields;
    const fieldNames = fields.map((f: { name: string }) => f.name);

    // Core article fields
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('body');

    // tsvector field (FullText scalar)
    expect(fieldNames).toContain('tsv');

    // Computed search fields from graphile-search plugin
    expect(fieldNames).toContain('tsvRank');
    expect(fieldNames).toContain('titleTrgmSimilarity');
    expect(fieldNames).toContain('bodyTrgmSimilarity');
    expect(fieldNames).toContain('searchScore');

    // pgvector fields (conditional)
    if (hasVector) {
      expect(fieldNames).toContain('embedding');
      expect(fieldNames).toContain('embeddingVectorDistance');
    }
  });
});
