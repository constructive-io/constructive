// Turbopack barrel normalization (TURBOPACK-BARREL-001).
//
// Codegen emits directory barrel re-exports like `export * from './hooks'` where
// `./hooks` is a directory with an index.ts. Next.js 16's Turbopack cannot
// resolve directory specifiers — it needs an explicit `./hooks/index`. This pass
// rewrites `./X` -> `./X/index` only when X resolves to a sibling DIRECTORY,
// leaving file specifiers (and ones already ending in /index) untouched.
//
// Pure-ish: operates on a real directory tree (so it's exercised with a temp
// fixture in tests) and is idempotent — safe to re-run.

import fs from 'node:fs';
import path from 'node:path';

const SPEC_RE = /((?:export|import)[^\n]*?from\s*["'])(\.\.?\/[^"']+?)(["'])/g;
const FILE_EXT_RE = /\.(tsx?|jsx?|json|css)$/;

/** Rewrite directory barrel specifiers under `root` in place. Returns the count
 * of files changed. No-op (returns 0) when `root` does not exist. */
export function normalizeSdkBarrels(root: string): number {
  if (!fs.existsSync(root)) return 0;
  let changed = 0;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const orig = fs.readFileSync(p, 'utf8');
      const next = orig.replace(SPEC_RE, (match, pre: string, spec: string, post: string) => {
        if (FILE_EXT_RE.test(spec)) return match; // already a file
        const abs = path.resolve(path.dirname(p), spec);
        if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
          return pre + spec.replace(/\/$/, '') + '/index' + post;
        }
        return match;
      });
      if (next !== orig) {
        fs.writeFileSync(p, next);
        changed++;
      }
    }
  };

  walk(root);
  return changed;
}
