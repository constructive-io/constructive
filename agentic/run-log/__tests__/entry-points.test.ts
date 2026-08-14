import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The main entry is imported by browsers, Electron renderers and Next client
 * components. A `node:` import anywhere in its module graph breaks those
 * bundles, and it breaks them at build time in someone else's repo — so the
 * boundary is asserted here rather than discovered there.
 */
const srcDir = join(__dirname, '..', 'src');

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.ts') ? [path] : [];
  });

/** Only this file may touch the filesystem. */
const NODE_ONLY = ['file-store.ts'];

describe('entry points', () => {
  const browserSafe = sources(srcDir).filter((path) => !NODE_ONLY.some((name) => path.endsWith(name)));

  it.each(browserSafe.map((path) => [path.slice(srcDir.length + 1), path]))(
    'src/%s imports no node builtin',
    (_name, path) => {
      const contents = readFileSync(path, 'utf8');
      expect(contents).not.toMatch(/from ['"]node:/);
      expect(contents).not.toMatch(/require\(['"]node:/);
    }
  );

  it('keeps the filesystem store out of the main entry', () => {
    const index = readFileSync(join(srcDir, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/from ['"]\.\/file-store['"]/);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(Object.keys(require('../src'))).not.toContain('FileRunLogStore');
  });
});
