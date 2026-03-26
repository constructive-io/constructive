/**
 * Generates the migrate-client ORM code from the migrate.graphql schema.
 *
 * This script lives in constructive-sdk (which already depends on
 * @constructive-io/graphql-codegen) and outputs into ../migrate-client/src/
 * so that migrate-client itself has zero codegen dependency — avoiding
 * circular deps when pgpm/core imports @pgpmjs/migrate-client.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generateMulti,
  expandSchemaDirToMultiTarget,
} from '@constructive-io/graphql-codegen';

const SCHEMA_DIR = '../migrate-client/schemas';
const OUTPUT_DIR = '../migrate-client/src';

async function main() {
  console.log('Generating migrate-client ORM from schema files...');
  console.log(`Schema directory: ${SCHEMA_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const baseConfig = {
    schemaDir: SCHEMA_DIR,
    output: OUTPUT_DIR,
    orm: true,
    reactQuery: false,
    verbose: true,
    docs: {
      agents: false,
      mcp: false,
      skills: false,
    }
  };

  const expanded = expandSchemaDirToMultiTarget(baseConfig);
  if (!expanded) {
    console.error('No .graphql files found in schema directory.');
    process.exit(1);
  }

  console.log(`Found targets: ${Object.keys(expanded).join(', ')}`);

  const { results } = await generateMulti({
    configs: expanded,
  });

  let realError = false;

  for (const { name, result } of results) {
    if (result.success) {
      console.log(`[${name}] ${result.message}`);
      if (result.tables?.length) {
        console.log(`  Tables: ${result.tables.join(', ')}`);
      }
    } else if (result.message?.includes('No tables found')) {
      console.log(`[${name}] SKIP: no tables (empty schema)`);
    } else {
      console.error(`[${name}] ERROR: ${result.message}`);
      realError = true;
    }
  }

  if (realError) {
    console.error('\nGeneration failed');
    process.exit(1);
  }

  // generateMulti only writes a root barrel when there are multiple targets.
  // migrate-client has a single target ("migrate"), so we must write
  // src/index.ts ourselves to keep the package entry-point intact.
  const successfulNames = results.filter((r) => r.result.success).map((r) => r.name);
  if (successfulNames.length > 0) {
    const indexPath = path.resolve(OUTPUT_DIR, 'index.ts');
    const barrel = successfulNames
      .map((name) => `export * from './${name}';`)
      .join('\n');
    fs.writeFileSync(indexPath, barrel + '\n', 'utf-8');
    console.log(`Wrote root barrel: ${indexPath}`);
  }

  console.log('\nMigrate-client ORM generation completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
