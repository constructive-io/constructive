/**
 * Codegen Helper for Integration Tests
 *
 * Runs the full codegen pipeline against a live graphile-test schema:
 *   1. Executes standard GraphQL introspection
 *   2. Infers Table[] via inferTablesFromIntrospection()
 *   3. Generates ORM files via generateOrm()
 *   4. Compiles TypeScript to JavaScript
 *   5. Loads the compiled createClient factory
 *
 * This allows tests with dynamically-provisioned tables (e.g. app_files,
 * data_room_files) to get fully typed ORM models at test time, rather
 * than relying on the pre-built SDK (which only knows about static tables).
 *
 * Usage:
 *   import { runCodegenAndLoad, GraphQLTestAdapter } from '@constructive-io/graphql-test';
 *
 *   // In beforeEach (must be inside an active transaction for graphile-test):
 *   const codegen = await runCodegenAndLoad(query, 'my-suite');
 *   const adapter = new GraphQLTestAdapter(query);
 *   const orm = codegen.createClient({ adapter });
 *   const rows = await orm.myTable.findMany({ select: { id: true } }).execute();
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { GraphQLQueryFn, GraphQLQueryFnObj } from 'graphile-test';
import {
  SCHEMA_INTROSPECTION_QUERY,
  inferTablesFromIntrospection,
  transformSchemaToOperations,
} from '@constructive-io/graphql-query';
import type { Table } from '@constructive-io/graphql-query';

import { generateOrm } from '@constructive-io/graphql-codegen/core/codegen/orm';

export interface CodegenResult {
  /** Factory function to create an ORM client from a GraphQLAdapter */
  createClient: (config: any) => Record<string, any>;
  /** Inferred table metadata from introspection */
  tables: Table[];
  /** Raw codegen output (generated files) */
  ormResult: { files: { path: string; content: string }[] };
}

/**
 * Run the codegen pipeline against a live graphile-test schema and load the result.
 *
 * Each test suite must pass a unique `name` to avoid collisions when Jest
 * runs suites in parallel — each gets its own `__generated__/<name>` dir.
 *
 * Accepts either positional-style `GraphQLQueryFn` or object-style `GraphQLQueryFnObj`.
 * The generated files are compiled to JavaScript and loaded via require().
 *
 * IMPORTANT: This must be called inside an active transaction (e.g. in beforeEach
 * after db.beforeEach()), because graphile-test's query wrapper uses savepoints
 * which require a transaction block.
 *
 * @param queryFn - The graphile-test query function (positional or object-style)
 * @param name - Unique suite name for generated file isolation
 * @param outputDir - Optional custom output directory (defaults to __generated__/<name> next to caller)
 * @returns CodegenResult with createClient factory, tables, and raw ormResult
 */
export async function runCodegenAndLoad(
  queryFn: GraphQLQueryFn | GraphQLQueryFnObj,
  name: string,
  outputDir?: string,
): Promise<CodegenResult> {
  const GENERATED_DIR =
    outputDir ?? path.join(process.cwd(), '__generated__', name);

  // 1. Run introspection against live schema
  //    Support both positional (query, variables) and object-style ({ query }) signatures
  const introspectionResult = await runIntrospection(queryFn);

  if (introspectionResult.errors?.length) {
    throw new Error(
      `Introspection failed: ${introspectionResult.errors.map((e: any) => e.message).join('; ')}`,
    );
  }

  const introspection = introspectionResult.data!;

  // 2. Infer tables from introspection (core of the codegen pipeline)
  const tables = inferTablesFromIntrospection(introspection);

  // 3. Get type registry for input type generation
  const { typeRegistry } = transformSchemaToOperations(introspection);

  // 4. Generate ORM files
  const ormResult = generateOrm({
    tables,
    customOperations: { queries: [], mutations: [], typeRegistry },
    config: {
      codegen: { comments: true, condition: true },
    } as any,
  });

  // 5. Write generated files to disk
  ensureCleanDir(GENERATED_DIR);
  for (const file of ormResult.files) {
    const filePath = path.join(GENERATED_DIR, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }

  // 6. Compile TypeScript to JavaScript, then remove .ts sources so
  //    Jest's TypeScript transformer doesn't try to type-check them.
  compileGeneratedFiles(GENERATED_DIR);

  // 7. Load the compiled createClient
  const indexPath = path.join(GENERATED_DIR, 'index.js');
  clearRequireCache(GENERATED_DIR);
  const orm = require(indexPath);

  return {
    createClient: orm.createClient as (config: any) => Record<string, any>,
    tables,
    ormResult,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Run introspection, handling both positional and object-style query functions.
 *
 * GraphQLQueryFn (positional): (query, variables?, commit?, reqOptions?) => Promise
 * GraphQLQueryFnObj (object):  ({ query, variables, ... }) => Promise
 *
 * We call positional-style since graphile-test's underlying implementation
 * accepts both — the positional wrapper in @constructive-io/graphql-test
 * normalizes to the object form internally.
 */
async function runIntrospection(
  queryFn: GraphQLQueryFn | GraphQLQueryFnObj,
): Promise<{ data?: { __schema: any }; errors?: readonly { message: string }[] }> {
  // Detect signature: object-style functions typically have arity 1
  // while positional have arity >= 1 (query, variables, commit, reqOptions)
  // However, the most reliable way is to check if the first arg would be
  // a string (positional) or object (object-style).
  // Since we can't know at compile time, we support both at runtime.
  const isObjectStyle = queryFn.length <= 1;

  let result: any;
  if (isObjectStyle) {
    result = await (queryFn as GraphQLQueryFnObj)({
      query: SCHEMA_INTROSPECTION_QUERY,
    });
  } else {
    result = await (queryFn as GraphQLQueryFn)(SCHEMA_INTROSPECTION_QUERY);
  }

  return result as {
    data?: { __schema: any };
    errors?: readonly { message: string }[];
  };
}

function ensureCleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function compileGeneratedFiles(dir: string) {
  const tsFiles = collectTsFiles(dir);
  for (const filePath of tsFiles) {
    const source = fs.readFileSync(filePath, 'utf-8');
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: false,
        declaration: false,
        skipLibCheck: true,
      },
      fileName: filePath,
    });
    const jsPath = filePath.replace(/\.ts$/, '.js');
    fs.writeFileSync(jsPath, result.outputText);
    // Remove .ts source so Jest's transformer doesn't type-check it
    fs.unlinkSync(filePath);
  }
}

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function clearRequireCache(dir: string) {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(dir)) {
      delete require.cache[key];
    }
  }
}
