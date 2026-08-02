import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { PRESETS } from '../src/config/presets';
import { resolveRules } from '../src/config/resolve';
import type { SafegresConfig } from '../src/config/types';
import {
  BUILTIN_ADAPTERS,
  graphileAdapter,
  hasuraAdapter,
  postgrestAdapter
} from '../src/exposure/adapters';

jest.setTimeout(120000);

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
  const sql = fs.readFileSync(path.join(__dirname, 'fixtures', 'stacks.sql'), 'utf8');
  await pg.any(sql);
});

afterAll(async () => {
  if (teardown) await teardown();
});

/** Every rule setting a preset carries, flattened across its `extends` chain. */
function settings(config: SafegresConfig): SafegresConfig['rules'] {
  return config.rules ?? {};
}

describe('built-in presets', () => {
  it('every preset resolves to a valid rule set', () => {
    for (const [name, config] of Object.entries(PRESETS)) {
      expect(() => resolveRules(config)).not.toThrow();
      expect(name.startsWith('safegres:')).toBe(true);
    }
  });

  it('names every built-in adapter it references', () => {
    for (const [name, config] of Object.entries(PRESETS)) {
      for (const adapter of config.exposure?.adapters ?? []) {
        if (typeof adapter !== 'string') continue;
        expect(`${name}:${adapter in BUILTIN_ADAPTERS}`).toBe(`${name}:true`);
      }
    }
  });

  it('configures rules rather than switching them off', () => {
    // `minimal` is the deliberate exception: it exists to be a smoke check.
    for (const [name, config] of Object.entries(PRESETS)) {
      if (name === 'safegres:minimal') continue;
      for (const [rule, setting] of Object.entries(settings(config))) {
        const severity = Array.isArray(setting) ? setting[0] : setting;
        expect(`${name}/${rule}=${severity as string}`).not.toContain('=off');
      }
    }
  });

  it('scopes platform-managed schemas by demotion, not exclusion', () => {
    const supabase = PRESETS['safegres:supabase'];
    const managed = supabase.overrides![0];
    expect(managed.tables).toContain('auth.*');
    expect(managed.rules['*']).toBe('info');
  });

  it('treats Supabase authenticated as untrusted — anyone can sign up', () => {
    const [, options] = PRESETS['safegres:supabase'].rules!.R1 as [string, { roles: string[] }];
    expect(options.roles).toEqual(['anon', 'authenticated']);
  });

  it('composes a stack preset with a posture preset', () => {
    // multi-tenant carries no exposure of its own: it is a posture, layered
    // on whichever stack resolves the surface.
    expect(PRESETS['safegres:multi-tenant'].exposure).toBeUndefined();
    expect(PRESETS['safegres:oltp'].exposure).toBeUndefined();
    expect(PRESETS['safegres:multi-tenant'].scoring!.floorOnCritical).toBe('D');
  });
});

describe('stack adapters', () => {
  it('reads the PostgREST surface out of pg_db_role_setting', async () => {
    expect(await postgrestAdapter.detect(pg.client as never)).toBe(true);
    const planes = await postgrestAdapter.resolve(pg.client as never);

    const primary = planes.find((p) => p.primary);
    expect(primary).toMatchObject({ kind: 'api', schemas: ['fx_pgrst_api'], roles: ['fx_anon'] });
    // The authenticator is graded separately: it can SET ROLE, so its own
    // grants are a different question from what the API serves.
    expect(planes.map((p) => p.name)).toContain('direct:fx_authenticator');
  });

  it('resolves Hasura exposure from tracked tables only', async () => {
    expect(await hasuraAdapter.detect(pg.client as never)).toBe(true);
    const planes = await hasuraAdapter.resolve(pg.client as never);
    expect(planes).toEqual([
      { name: 'api', kind: 'api', primary: true, schemas: ['fx_hasura_api'] }
    ]);
  });

  it('resolves the graphile-starter layout, app_private as its own plane', async () => {
    expect(await graphileAdapter.detect(pg.client as never)).toBe(true);
    const planes = await graphileAdapter.resolve(pg.client as never);

    expect(planes[0]).toMatchObject({
      primary: true,
      schemas: ['app_public', 'app_hidden']
    });
    expect(planes[1]).toMatchObject({ name: 'internal', kind: 'schema', schemas: ['app_private'] });
  });

  it('does not detect a stack that is not installed', async () => {
    // The constructive adapter shares this database and must stay quiet.
    const { constructiveAdapter } = await import('../src/exposure/adapters');
    expect(await constructiveAdapter.detect(pg.client as never)).toBe(false);
  });
});
