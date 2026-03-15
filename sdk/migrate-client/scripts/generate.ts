import {
  generateMulti,
  expandSchemaDirToMultiTarget,
} from '@constructive-io/graphql-codegen';

const SCHEMA_DIR = './schemas';

async function main() {
  console.log('Generating migrate-client ORM from schema files...');
  console.log(`Schema directory: ${SCHEMA_DIR}`);

  const baseConfig = {
    schemaDir: SCHEMA_DIR,
    output: './src',
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

  console.log('\nMigrate-client ORM generation completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
