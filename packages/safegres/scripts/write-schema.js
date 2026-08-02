#!/usr/bin/env node
/**
 * Regenerate `schema/safegres.schema.json` from the described config shape.
 * The committed file is what an editor fetches, so it is checked in; the test
 * suite fails if it drifts from the shape.
 *
 * Usage: pnpm build:dev && node scripts/write-schema.js
 */
const fs = require('fs');
const path = require('path');

const { toJsonSchema } = require('../dist/config/schema');

const out = path.join(__dirname, '..', 'schema', 'safegres.schema.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(toJsonSchema(), null, 2)}\n`);
process.stdout.write(`wrote ${out}\n`);
