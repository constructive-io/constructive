import path from 'path';
import { generate } from '../../../graphql/codegen/src/core/generate';

const root = path.resolve(__dirname, '..');

async function run() {
  const result = await generate({
    schemaFile: path.resolve(root, '../../graphql/codegen/examples/example.schema.graphql'),
    output: path.resolve(root, 'src/generated'),
    reactQuery: true,
    orm: true
  });

  if (!result.success) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
}

run();
