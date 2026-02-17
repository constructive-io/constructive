import path from 'node:path';
import { generate } from '@constructive-io/graphql-codegen';

async function main() {
  const result = await generate({
    schemaFile: path.resolve(__dirname, 'schema.graphql'),
    output: path.resolve(__dirname, 'output'),
    orm: true,
  });

  if (!result.success) {
    console.error('Generation failed:', result.message);
    result.errors?.forEach((e) => console.error('  -', e));
    process.exit(1);
  }

  console.log(result.message);
  if (result.tables?.length) {
    console.log('Tables:', result.tables.join(', '));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
