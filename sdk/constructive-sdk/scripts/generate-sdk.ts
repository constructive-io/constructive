import {
  generateMulti,
  expandSchemaDirToMultiTarget,
} from '@constructive-io/graphql-codegen';
import type { GraphQLSDKConfigTarget } from '@constructive-io/graphql-codegen';

const SCHEMA_DIR = '../constructive-sdk/schemas';

const EXCLUDE_TARGETS = ['private'];

async function main() {
  console.log('Generating SDK from schema files...');
  console.log(`Schema directory: ${SCHEMA_DIR}`);

  const baseConfig: GraphQLSDKConfigTarget = {
    schemaDir: SCHEMA_DIR,
    output: './src',
    orm: true,
    reactQuery: false,
    verbose: true,
    docs: {
      agents: false,
      mcp: false,
      skills: true
    }
  };

  const expanded = expandSchemaDirToMultiTarget(baseConfig);
  if (!expanded) {
    console.error('No .graphql files found in schema directory.');
    console.error('Ensure .graphql schema files exist in the schemas/ directory.');
    process.exit(1);
  }

  for (const target of EXCLUDE_TARGETS) {
    if (target in expanded) {
      delete expanded[target];
      console.log(`Excluding target: ${target}`);
    }
  }

  console.log(`Found targets: ${Object.keys(expanded).join(', ')}`);

  const { results, hasError } = await generateMulti({
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
    console.error('\nSDK generation failed for one or more targets');
    process.exit(1);
  }

  console.log('\nSDK generation completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
