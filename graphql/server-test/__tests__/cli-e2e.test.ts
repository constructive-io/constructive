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
 * Test data: 5 animals (Buddy/Dog, Max/Dog, Whiskers/Cat, Mittens/Cat, Tweety/Bird)
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
