#!/usr/bin/env tsx
/**
 * Download GraphQL schema via introspection and save to local file.
 *
 * Usage:
 *   pnpm -C packages/graphql-sdk exec tsx examples/download-schema.ts
 *   pnpm -C packages/graphql-sdk exec tsx examples/download-schema.ts --endpoint=http://custom.endpoint/graphql
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildClientSchema, printSchema, getIntrospectionQuery } from 'graphql';
import {
  DB_GRAPHQL_ENDPOINT,
  SCHEMA_FILE,
  executeGraphQL,
} from './test.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function downloadSchema(endpoint: string): Promise<string> {
  console.log(`Fetching schema from: ${endpoint}`);

  const introspectionQuery = getIntrospectionQuery();
  const result = await executeGraphQL<{ __schema: unknown }>(
    endpoint,
    introspectionQuery
  );

  if (result.errors?.length) {
    throw new Error(
      `Introspection failed: ${result.errors.map((e) => e.message).join(', ')}`
    );
  }

  if (!result.data?.__schema) {
    throw new Error('Introspection returned no schema');
  }

  // Build client schema from introspection result
  const clientSchema = buildClientSchema(
    result.data as ReturnType<typeof getIntrospectionQuery> extends string
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any
      : never
  );

  // Print to SDL
  return printSchema(clientSchema);
}

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  let endpoint = DB_GRAPHQL_ENDPOINT;

  for (const arg of args) {
    if (arg.startsWith('--endpoint=')) {
      endpoint = arg.slice('--endpoint='.length);
    }
  }

  try {
    const sdl = await downloadSchema(endpoint);
    const outputPath = join(__dirname, SCHEMA_FILE);

    writeFileSync(outputPath, sdl, 'utf-8');
    console.log(`Schema written to: ${outputPath}`);
    console.log(`Lines: ${sdl.split('\n').length}`);
  } catch (error) {
    console.error('Failed to download schema:', error);
    process.exit(1);
  }
}

main();
