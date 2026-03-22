/**
 * Codegen Helper for ORM Tests
 *
 * Runs the full codegen pipeline against a live graphile-test schema:
 *   1. Executes standard GraphQL introspection
 *   2. Infers Table[] via inferTablesFromIntrospection()
 *   3. Generates ORM files via generateOrm()
 *   4. Compiles TypeScript to JavaScript
 *   5. Loads the compiled createClient factory
 *
 * This validates the entire codegen -> runtime chain end-to-end.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { GraphQLQueryFnObj } from 'graphile-test';
import {
  SCHEMA_INTROSPECTION_QUERY,
  inferTablesFromIntrospection,
  transformSchemaToOperations,
} from '@constructive-io/graphql-query';
import type { Table } from '@constructive-io/graphql-query';

// generateOrm is not re-exported from the public barrel — resolve via dist
const codegenRoot = path.dirname(
  require.resolve('@constructive-io/graphql-codegen'),
);
const { generateOrm } = require(
  path.join(codegenRoot, 'core/codegen/orm/index.js'),
) as { generateOrm: (opts: any) => { files: { path: string; content: string }[] } };

/**
 * Run the codegen pipeline against a live graphile-test schema and load the result.
 *
 * Each test suite must pass a unique `name` to avoid collisions when Jest
 * runs suites in parallel — each gets its own `__generated__/<name>` dir.
 *
 * Returns createClient factory + inferred tables metadata.
 */
export async function runCodegenAndLoad(
  query: GraphQLQueryFnObj,
  name: string,
) {
  const GENERATED_DIR = path.join(__dirname, '..', '__generated__', name);
  // 1. Run introspection against live schema
  const introspectionResult = await query<{ __schema: any }>({
    query: SCHEMA_INTROSPECTION_QUERY,
  });
  if (introspectionResult.errors?.length) {
    throw new Error(
      `Introspection failed: ${introspectionResult.errors.map((e) => e.message).join('; ')}`,
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

  // 6. Compile TypeScript to JavaScript
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
