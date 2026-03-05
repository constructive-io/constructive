import * as fs from 'fs';
import * as path from 'path';

import {
  generateMulti,
  expandSchemaDirToMultiTarget,
} from '@constructive-io/graphql-codegen';
import type { GraphQLSDKConfigTarget } from '@constructive-io/graphql-codegen';

const SCHEMA_DIR = '../constructive-sdk/schemas';

const EXCLUDE_TARGETS = ['private'];

async function main() {
  console.log('Generating CLI SDK from schema files...');
  console.log(`Schema directory: ${SCHEMA_DIR}`);

  const baseConfig: GraphQLSDKConfigTarget = {
    schemaDir: SCHEMA_DIR,
    output: './src',
    orm: true,
    cli: {
      toolName: 'csdk',
      entryPoint: true,
    },
    reactQuery: false,
    verbose: true,
    docs: {
      agents: false,
      mcp: false,
      skills: true,
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
    console.error('\nCLI SDK generation failed for one or more targets');
    process.exit(1);
  }

  // Add @ts-nocheck to generated CLI .ts files.
  // The generated code uses skipPrompt (from inquirerer PR #68) which is not
  // yet in the published inquirerer types. This can be removed once inquirerer
  // is published with skipPrompt support.
  const srcDir = path.resolve('./src');
  addTsNoCheckToCliFiles(srcDir);

  console.log('\nCLI SDK generation completed successfully!');
}

function addTsNoCheckToCliFiles(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      addTsNoCheckToCliFiles(fullPath);
    } else if (entry.name.endsWith('.ts') && fullPath.includes('/cli/')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.startsWith('// @ts-nocheck')) {
        fs.writeFileSync(fullPath, `// @ts-nocheck\n${content}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
