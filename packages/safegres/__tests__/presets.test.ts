import * as fs from 'fs';
import * as path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

import { audit } from '../src/commands/audit';
import { PRESETS } from '../src/config/presets';
import { resolveRules } from '../src/config/resolve';
import type { SafegresConfig } from '../src/config/types';
import {
  BUILTIN_ADAPTERS,
  graphileAdapter,
  hasuraAdapter,
  postgrestAdapter,
  supabaseAdapter
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

  it('resolves the visitor role by membership, not by name', async () => {
    // The fixture names it `fxapp_visitor`, which no preset could hardcode:
    // it is found because `fxapp_authenticator` can SET ROLE to it.
    const planes = await graphileAdapter.resolve(pg.client as never);
    expect(planes[0].roles).toEqual(['fxapp_visitor']);
  });

  it('does not treat a plain PostgREST database as Supabase', async () => {
    // The fixture has PostgREST but no auth.users and no anon/authenticated/
    // service_role trio, so the static fallback must stay out of reach.
    expect(await supabaseAdapter.detect(pg.client as never)).toBe(false);
  });

  it('never guesses a surface for an unconfigured PostgREST', async () => {
    // No pgrst.db_schemas anywhere -> no planes, which the audit reports as
    // unknown exposure rather than a surface presented as fact.
    const empty = {
      query: async () => ({ rows: [] as unknown[] })
    };
    expect(await postgrestAdapter.resolve(empty as never)).toEqual([]);
    expect(await postgrestAdapter.detect(empty as never)).toBe(false);
  });

  it('feeds adapter-resolved roles to the rules via rolesFrom', async () => {
    // The point of the whole mechanism: fx_anon is named nowhere in the
    // config, and R1 still fires on its write grant. `exposure.roles` comes
    // from the adapter; `rolesFrom` is what lets a rule consume it.
    await pg.any('GRANT INSERT ON fx_pgrst_api.notes TO fx_anon');
    try {
      const report = await audit(pg.client as never, {
        schemas: ['fx_pgrst_api'],
        exposure: { adapters: ['postgrest'] },
        config: { rules: { R1: ['critical', { rolesFrom: 'exposure' }] } }
      });
      const r1 = report.findings.filter((f) => f.code === 'R1');
      expect(r1.map((f) => f.role)).toContain('fx_anon');
    } finally {
      await pg.any('REVOKE INSERT ON fx_pgrst_api.notes FROM fx_anon');
    }
  });

  it('leaves rules inert when a preset names no roles and none resolve', async () => {
    // Without `rolesFrom` and without explicit roles, R1 stays a no-op —
    // adapter-resolved roles must never leak into rules that did not ask.
    const report = await audit(pg.client as never, {
      schemas: ['fx_pgrst_api'],
      exposure: { adapters: ['postgrest'] },
      config: { rules: { R1: 'critical' } }
    });
    expect(report.findings.filter((f) => f.code === 'R1')).toEqual([]);
  });

  it('does not detect a stack that is not installed', async () => {
    // The constructive adapter shares this database and must stay quiet.
    const { constructiveAdapter } = await import('../src/exposure/adapters');
    expect(await constructiveAdapter.detect(pg.client as never)).toBe(false);
  });
});
