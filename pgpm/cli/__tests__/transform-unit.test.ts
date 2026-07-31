import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { checkOverwrite, orderPackages, resolveOutBase } from '../src/commands/transform';

describe('resolveOutBase', () => {
  it('defaults to the source module parent (packages land as siblings)', () => {
    expect(resolveOutBase('/ws/my-mod')).toBe('/ws');
  });

  it('resolves --out when given', () => {
    expect(resolveOutBase('/ws/my-mod', '/tmp/out')).toBe('/tmp/out');
  });
});

describe('checkOverwrite', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-transform-guard-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses to overwrite the source module without --write', () => {
    const mod = join(dir, 'my-mod');
    mkdirSync(mod);
    expect(checkOverwrite(mod, mod, false)).toMatch(/source module/);
    expect(checkOverwrite(mod, mod, true)).toBeNull();
  });

  it('refuses to clobber an existing output directory without --write', () => {
    const mod = join(dir, 'my-mod');
    const out = join(dir, 'my-mod-object');
    mkdirSync(mod);
    mkdirSync(out);
    expect(checkOverwrite(out, mod, false)).toMatch(/already exists/);
    expect(checkOverwrite(out, mod, true)).toBeNull();
  });

  it('allows a fresh output directory', () => {
    const mod = join(dir, 'my-mod');
    mkdirSync(mod);
    expect(checkOverwrite(join(dir, 'fresh'), mod, false)).toBeNull();
  });
});

describe('orderPackages', () => {
  it('orders prerequisites before dependents', () => {
    const ordered = orderPackages([
      { name: 'pkg-security', requires: ['pkg-app'], rows: [] },
      { name: 'pkg-app', requires: [], rows: [] }
    ]);
    expect(ordered.map(p => p.name)).toEqual(['pkg-app', 'pkg-security']);
  });

  it('keeps independent packages in input order', () => {
    const ordered = orderPackages([
      { name: 'a', requires: [], rows: [] },
      { name: 'b', requires: [], rows: [] }
    ]);
    expect(ordered.map(p => p.name)).toEqual(['a', 'b']);
  });
});
