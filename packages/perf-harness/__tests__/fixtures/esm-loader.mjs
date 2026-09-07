import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const esmRoot = new URL('../../dist/esm/', import.meta.url).href;

// Exercise the real emitted module graph using the extension resolution and
// module format a bundler applies to this package's `module` entry.
export const resolve = async (specifier, context, nextResolve) => {
  if (context.parentURL?.startsWith(esmRoot) && specifier.startsWith('.')) {
    const target = new URL(specifier, context.parentURL);
    if (target.href.startsWith(esmRoot) && !extname(target.pathname)) {
      specifier = `${target.href}.js`;
    }
  }
  return nextResolve(specifier, context);
};

export const load = async (url, context, nextLoad) => {
  if (url.startsWith(esmRoot)) {
    return {
      format: 'module',
      source: await readFile(new URL(url), 'utf8'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
};
