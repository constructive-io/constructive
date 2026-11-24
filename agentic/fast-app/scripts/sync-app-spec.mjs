// Copies the AppSpec contract from a sandbox-templates checkout into the
// package, so the app-spec layer types and validates specs with the
// template's own types and schema instead of a copy kept by hand.
//
//   pnpm --filter @agentic-kit/fast-app sync:app-spec [path/to/sandbox-templates]
//
// Without a path it reads CONSTRUCTIVE_TEMPLATE_DIR, then the usual checkout.
// The files are copied byte for byte (the root eslint config leaves them
// alone); the drift test in __tests__/app-spec/validate.test.ts compares them
// with the checkout CONSTRUCTIVE_TEMPLATE_DIR names.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['app-spec.types.ts', 'app-spec.schema.json'];

const root =
  process.argv[2] ??
  process.env.CONSTRUCTIVE_TEMPLATE_DIR ??
  join(homedir(), 'workspace/constructive/sandbox-templates');
const source = join(root, 'shared/gen');
const target = join(dirname(fileURLToPath(import.meta.url)), '../src/app-spec/contract');
for (const file of FILES) {
  if (!existsSync(join(source, file))) throw new Error(`No ${file} in ${source}`);
}
mkdirSync(target, { recursive: true });

const commit = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], {
  encoding: 'utf8'
}).trim();
for (const file of FILES) copyFileSync(join(source, file), join(target, file));
writeFileSync(
  join(target, 'SOURCE.md'),
  `Synced from sandbox-templates \`shared/gen\` at \`${commit}\` by \`scripts/sync-app-spec.mjs\`. Do not edit by hand.\n`
);
console.log(`synced ${FILES.join(', ')} from ${commit}`);
