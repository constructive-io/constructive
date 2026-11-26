// Renders the reference of the built CLI (dist) as its man page, and a page for each other bin that sources it.
// Usage: node scripts/man.mjs [out-dir], with dist/man as the default.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import remarkMan from 'remark-man';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { renderReference } = require('@agentic-kit/command');
const { createConstructiveCli } = require(join(root, 'dist', 'cli.js'));

const out = resolve(process.argv[2] ?? join(root, 'dist', 'man'));
const manifest = createConstructiveCli().manifest();
const page = await unified()
  .use(remarkParse)
  .use(remarkMan, { version: `${manifest.name} ${manifest.version}`, manual: 'Constructive CLI' })
  .process(renderReference(manifest));

// remark-man writes a paragraph macro after each heading, which man(7) skips and mandoc warns about, and dates the
// page "Month YYYY", which mandoc cannot parse; man-pages(7) dates a page YYYY-MM-DD.
const roff = String(page)
  .replace(/^(\.S[HS] .*)\n\.P\n/gm, '$1\n')
  .replace(/^(\.TH "[^"]*" "[^"]*") "[^"]*"/, `$1 "${new Date().toISOString().slice(0, 10)}"`);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${manifest.name}.1`), roff);
const { bin } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const name of Object.keys(bin).filter((name) => name !== manifest.name)) {
  writeFileSync(join(out, `${name}.1`), `.so man1/${manifest.name}.1\n`);
}
