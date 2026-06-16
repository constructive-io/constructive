#!/usr/bin/env node
// Writes dist/esm/package.json with {"type":"module"} so Node treats the
// ESM build's .js files as modules. Runs from each package's cwd as a
// postbuild step.

const fs = require('node:fs');
const path = require('node:path');

const target = path.join('dist', 'esm', 'package.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, '{"type":"module"}\n');
