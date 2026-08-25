const {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const directory = join(__dirname, '..', 'dist', 'esm');
const relativeImport =
  /(\bfrom\s+['"]|\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]+?)(['"]\s*\)?)/g;

const rewriteDirectory = (current) => {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      rewriteDirectory(path);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const source = readFileSync(path, 'utf8');
    const rewritten = source.replace(
      relativeImport,
      (_match, prefix, specifier, suffix) => {
        if (/\.(?:js|json|mjs|cjs)$/.test(specifier)) {
          return `${prefix}${specifier}${suffix}`;
        }
        const resolved = resolve(dirname(path), specifier);
        const completed = existsSync(`${resolved}.js`)
          ? `${specifier}.js`
          : existsSync(join(resolved, 'index.js'))
            ? `${specifier}/index.js`
            : `${specifier}.js`;
        return `${prefix}${completed}${suffix}`;
      }
    );
    writeFileSync(path, rewritten);
  }
};

rewriteDirectory(directory);
writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
