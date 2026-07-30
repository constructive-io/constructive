import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  compileExtensionInstall,
  compileExtensionInstalls,
  findExtensionInstall,
  readExtensionsManifest,
  validateExtensionsManifest
} from '../../src/extensions';

describe('extensions manifest — validation', () => {
  it('accepts a provides declaration with schema and grants', () => {
    const m = validateExtensionsManifest({
      provides: {
        pg_partman: {
          schema: 'partman',
          relocatable: false,
          grants: [{ privileges: 'USAGE', on: 'schema', to: 'authenticated' }]
        }
      }
    });
    expect(m.provides!.pg_partman.schema).toBe('partman');
    expect(m.provides!.pg_partman.grants![0].to).toBe('authenticated');
  });

  it('accepts a consumes declaration', () => {
    const m = validateExtensionsManifest({ consumes: { pgcrypto: { symbols: ['crypt', 'gen_salt'] } } });
    expect(m.consumes!.pgcrypto.symbols).toEqual(['crypt', 'gen_salt']);
  });

  it('accepts schema: null (unqualified/default)', () => {
    const m = validateExtensionsManifest({ provides: { hstore: { schema: null } } });
    expect(m.provides!.hstore.schema).toBeNull();
  });

  it.each([
    [{ provides: [] }, /"provides" must be an object/],
    [{ provides: { x: { schema: '' } } }, /schema must be a non-empty string or null/],
    [{ provides: { x: { grants: [{ on: 'schema', to: 'r' }] } } }, /privileges must be a non-empty string/],
    [{ provides: { x: { grants: [{ privileges: 'USAGE', on: 'nope', to: 'r' }] } } }, /\.on must be one of/],
    [{ provides: { x: { grants: [{ privileges: 'USAGE', on: 'schema', to: [] }] } } }, /\.to must be a role name/],
    [{ provides: { x: { relocatable: 'yes' } } }, /relocatable must be a boolean/],
    [{ consumes: { x: { symbols: [1] } } }, /symbols must be an array of non-empty strings/]
  ])('rejects %j', (input, pattern) => {
    expect(() => validateExtensionsManifest(input)).toThrow(pattern as RegExp);
  });

  it('reads pgpm.extensions.json / extensions.json from a module dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ext-manifest-'));
    try {
      expect(readExtensionsManifest(dir)).toBeUndefined();
      writeFileSync(
        join(dir, 'extensions.json'),
        JSON.stringify({ provides: { pgcrypto: { schema: 'extensions' } } })
      );
      expect(readExtensionsManifest(dir)!.provides!.pgcrypto.schema).toBe('extensions');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('extensions manifest — compile', () => {
  it('compiles schema install + grants into deterministic deploy SQL (no dynamic EXECUTE)', () => {
    const out = compileExtensionInstall('pg_partman', {
      schema: 'partman',
      grants: [{ privileges: 'USAGE', on: 'schema', to: 'authenticated' }]
    });
    expect(out.deploy).toEqual([
      'CREATE SCHEMA IF NOT EXISTS "partman";',
      'CREATE EXTENSION IF NOT EXISTS "pg_partman" WITH SCHEMA "partman";',
      'GRANT USAGE ON SCHEMA "partman" TO authenticated;'
    ]);
    expect(out.deploy.join('\n')).not.toMatch(/EXECUTE/i);
  });

  it('reverts in reverse order and verifies the install namespace', () => {
    const out = compileExtensionInstall('pgcrypto', {
      schema: 'extensions',
      dropSchema: true,
      grants: [{ privileges: 'USAGE', on: 'schema', to: 'anon' }]
    });
    expect(out.revert).toEqual([
      'REVOKE USAGE ON SCHEMA "extensions" FROM anon;',
      'DROP EXTENSION IF EXISTS "pgcrypto";',
      'DROP SCHEMA IF EXISTS "extensions";'
    ]);
    expect(out.verify[0]).toMatch(/pg_catalog\.pg_extension/);
    expect(out.verify[0]).toMatch(/nspname = 'extensions'/);
  });

  it('routes grant role names through the workspace role map, leaving special roles alone', () => {
    const out = compileExtensionInstall(
      'pgcrypto',
      {
        schema: 'extensions',
        grants: [{ privileges: 'USAGE', on: 'schema', to: ['anonymous', 'administrator', 'PUBLIC'] }]
      },
      { roleMap: { anonymous: 'anon', administrator: 'service_role' } }
    );
    expect(out.deploy[2]).toBe('GRANT USAGE ON SCHEMA "extensions" TO anon, service_role, PUBLIC;');
  });

  it('emits null-schema (default/unqualified) install without a CREATE SCHEMA', () => {
    const out = compileExtensionInstall('hstore', { schema: null });
    expect(out.deploy).toEqual(['CREATE EXTENSION IF NOT EXISTS "hstore";']);
    expect(out.verify[0]).not.toMatch(/nspname/);
  });

  it('refuses a non-relocatable extension routed to a non-fixed schema', () => {
    expect(() =>
      compileExtensionInstall('postgis', { schema: 'gis', relocatable: false }, { fixedSchema: 'tiger' })
    ).toThrow(/non-relocatable/);
  });

  it('refuses grants without an install schema', () => {
    expect(() =>
      compileExtensionInstall('pgcrypto', { schema: null, grants: [{ privileges: 'USAGE', on: 'schema', to: 'r' }] })
    ).toThrow(/require an install schema/);
  });

  it('compiles a whole manifest keyed by extension name', () => {
    const all = compileExtensionInstalls({
      pgcrypto: { schema: 'extensions' },
      pg_partman: { schema: 'partman' }
    });
    expect(Object.keys(all)).toEqual(['pgcrypto', 'pg_partman']);
    expect(all.pgcrypto.deploy[1]).toContain('WITH SCHEMA "extensions"');
  });
});

describe('findExtensionInstall — provider resolution across modules', () => {
  const withModules = (
    provides: Record<string, unknown | undefined>,
    run: (ctx: { modules: Record<string, { path: string }>; local: string[]; ws: string }) => void
  ) => {
    const ws = mkdtempSync(join(tmpdir(), 'ext-resolve-'));
    try {
      const modules: Record<string, { path: string }> = {};
      const local: string[] = [];
      for (const [name, manifest] of Object.entries(provides)) {
        const rel = name;
        const dir = join(ws, rel);
        mkdirSync(dir, { recursive: true });
        if (manifest !== undefined) {
          writeFileSync(join(dir, 'extensions.json'), JSON.stringify(manifest));
        }
        modules[name] = { path: rel };
        local.push(name);
      }
      run({ modules, local, ws });
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  };

  it('returns undefined when no local module declares the extension', () => {
    withModules({ a: { provides: {} }, b: undefined }, ({ modules, local, ws }) => {
      expect(findExtensionInstall('pgcrypto', local, modules, ws)).toBeUndefined();
    });
  });

  it('compiles the single declaring module, applying the role map', () => {
    withModules(
      { a: { provides: { pgcrypto: { schema: 'extensions', grants: [{ privileges: 'USAGE', on: 'schema', to: 'administrator' }] } } } },
      ({ modules, local, ws }) => {
        const out = findExtensionInstall('pgcrypto', local, modules, ws, {
          roleMap: { administrator: 'service_role' }
        });
        expect(out!.deploy[1]).toContain('WITH SCHEMA "extensions"');
        expect(out!.deploy[2]).toContain('TO service_role');
      }
    );
  });

  it('accepts identical declarations across two modules', () => {
    const same = { provides: { pgcrypto: { schema: 'extensions', grants: [{ privileges: 'USAGE', on: 'schema', to: ['authenticated', 'administrator'] }] } } };
    withModules({ a: same, b: same }, ({ modules, local, ws }) => {
      expect(() => findExtensionInstall('pgcrypto', local, modules, ws)).not.toThrow();
    });
  });

  it('throws on conflicting declarations across modules', () => {
    withModules(
      {
        a: { provides: { pgcrypto: { schema: 'extensions' } } },
        b: { provides: { pgcrypto: { schema: 'public' } } }
      },
      ({ modules, local, ws }) => {
        expect(() => findExtensionInstall('pgcrypto', local, modules, ws)).toThrow(/Conflicting/);
      }
    );
  });
});
