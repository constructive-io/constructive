// Copies the curated blueprints from a constructive-db checkout into the
// package, so `provision_template` can apply them by slug. The backend ships
// the engine but no template rows for these, so the JSON travels with the code.
//
//   pnpm --filter @agentic-kit/fast-app sync:blueprints [path/to/constructive-db]
//
// Entity-type `agents` are stripped on the way in: the backend cannot
// construct them yet. Everything else, access settings included, is copied as
// it is upstream.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The blueprints `src/blueprints/curated.ts` registers. Others upstream, such
// as the `crm_projects` add-on that constructs onto an existing CRM, can't be
// an AppSpec backend, so they stay out. Add a slug here and in curated.ts
// together.
const SHIPPED = ['agent', 'agentic_crm', 'data_room', 'fundraise'];

const root = process.argv[2] ?? join(homedir(), 'workspace/constructive/constructive-db');
const source = join(root, 'packages/blueprints/blueprints');
const target = join(dirname(fileURLToPath(import.meta.url)), '../src/blueprints');
if (!existsSync(source)) throw new Error(`No curated blueprints at ${source}`);
mkdirSync(target, { recursive: true });

const commit = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], {
  encoding: 'utf8'
}).trim();
const index = [];
for (const slug of SHIPPED) {
  const file = join(source, slug, 'blueprint.json');
  if (!existsSync(file)) throw new Error(`No ${slug} blueprint at ${file}`);
  const def = JSON.parse(readFileSync(file, 'utf8'));
  for (const entity of def.entity_types ?? []) {
    delete entity.agents;
  }
  def.tables ??= [];
  writeFileSync(join(target, `${slug}.json`), `${JSON.stringify(def, null, 2)}\n`);
  index.push(slug);
}
writeFileSync(
  join(target, 'SOURCE.md'),
  `Synced from constructive-db \`packages/blueprints\` at \`${commit}\` by \`scripts/sync-blueprints.mjs\`; entity-type \`agents\` stripped (see the script). Do not edit by hand.\n`
);
console.log(`synced ${index.join(', ')} from ${commit}`);
