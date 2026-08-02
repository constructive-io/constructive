/**
 * Exposure adapters: how safegres learns what a stack exposes.
 *
 * An adapter is a value, not a module name. Built-ins are named exports of
 * this module, a custom one is an object you construct in your own repo, and
 * both are passed the same way — nothing is resolved by package name, and
 * there is no plugin loader to reason about:
 *
 * ```ts
 * import { constructiveAdapter, definePlanes } from 'safegres/adapters';
 *
 * export default defineConfig({
 *   exposure: { adapters: [constructiveAdapter, myAdapter], schemas: ['app_public'] }
 * });
 * ```
 *
 * `detect()` answers "is this stack present in this database?" and `resolve()`
 * returns the planes it exposes — one per API where the stack has more than
 * one, because "the admin API grades A and the public API grades C" is
 * strictly more useful than their union.
 */

import type { PlaneKind } from '../config/types';
import type { QueryExecutor } from '../pg/introspect';

/** A plane as an adapter reports it, before roles are resolved against the catalog. */
export interface PlaneInput {
  name: string;
  kind?: PlaneKind;
  primary?: boolean;
  schemas?: string[];
  roles?: string[];
}

export interface ExposureAdapter {
  /** Stable identifier, reported as the exposure `source`. */
  name: string;
  /** True when this stack is present in the connected database. */
  detect(exec: QueryExecutor): Promise<boolean>;
  /** The planes this stack exposes. An empty array means "present, exposes nothing". */
  resolve(exec: QueryExecutor): Promise<PlaneInput[]>;
}

/**
 * Constructive routing-plane introspection: an API exposes a set of schemas
 * via `routing_public.apis` → `routing_public.api_schemas` →
 * `metaschema_public.schema` (and the platform plane via `platform_apis` →
 * `platform_api_schemas`). API-edge roles come from `apis.role_name` /
 * `apis.anon_role`.
 *
 * Emits one `api` plane per API, plus a primary plane unioning them: the union
 * is what the headline score has always been computed against, and the
 * per-API planes are what let a reader see which API carries the debt.
 */
export const constructiveAdapter: ExposureAdapter = {
  name: 'constructive',

  async detect(exec: QueryExecutor): Promise<boolean> {
    const { rows } = await exec.query<{ ok: boolean }>(
      `SELECT
         to_regclass('routing_public.apis') IS NOT NULL
         AND to_regclass('routing_public.api_schemas') IS NOT NULL
         AND to_regclass('metaschema_public.schema') IS NOT NULL AS ok`
    );
    return rows[0]?.ok === true;
  },

  async resolve(exec: QueryExecutor): Promise<PlaneInput[]> {
    const { rows: hasPlatform } = await exec.query<{ ok: boolean }>(
      `SELECT
         to_regclass('routing_public.platform_apis') IS NOT NULL
         AND to_regclass('routing_public.platform_api_schemas') IS NOT NULL AS ok`
    );

    const sources = [
      `SELECT a.name::text AS api, s.schema_name, a.role_name, a.anon_role
         FROM routing_public.apis a
         JOIN routing_public.api_schemas aps ON aps.api_id = a.id
         JOIN metaschema_public.schema s ON s.id = aps.schema_id`
    ];
    if (hasPlatform[0]?.ok) {
      sources.push(
        `SELECT a.name::text AS api, s.schema_name, a.role_name, a.anon_role
           FROM routing_public.platform_apis a
           JOIN routing_public.platform_api_schemas aps ON aps.api_id = a.id
           JOIN metaschema_public.schema s ON s.id = aps.schema_id`
      );
    }

    const { rows } = await exec.query<{
      api: string | null;
      schema_name: string;
      role_name: string | null;
      anon_role: string | null;
    }>(sources.join(' UNION ALL '));

    const byApi = new Map<string, { schemas: Set<string>; roles: Set<string> }>();
    const all = { schemas: new Set<string>(), roles: new Set<string>() };
    for (const r of rows) {
      if (!r.schema_name) continue;
      const key = r.api ?? 'api';
      const entry = byApi.get(key) ?? { schemas: new Set<string>(), roles: new Set<string>() };
      entry.schemas.add(r.schema_name);
      all.schemas.add(r.schema_name);
      for (const role of [r.role_name, r.anon_role]) {
        if (role) {
          entry.roles.add(role);
          all.roles.add(role);
        }
      }
      byApi.set(key, entry);
    }
    if (all.schemas.size === 0) return [];

    const planes: PlaneInput[] = [
      {
        name: 'api',
        kind: 'api',
        primary: true,
        schemas: sorted(all.schemas),
        roles: sorted(all.roles)
      }
    ];
    // One plane per API, but only where there is more than one to tell apart:
    // on a single-API database they would restate the primary plane.
    if (byApi.size > 1) {
      for (const [api, entry] of [...byApi.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        planes.push({
          name: `api:${api}`,
          kind: 'api',
          schemas: sorted(entry.schemas),
          roles: sorted(entry.roles)
        });
      }
    }
    return planes;
  }
};

/**
 * PostgREST exposure, read from the catalog rather than inferred from a
 * schema name: PostgREST serves exactly `pgrst.db_schemas`, which is set as a
 * role or database GUC (`ALTER ROLE authenticator SET pgrst.db_schemas = …`)
 * and therefore lands in `pg_db_role_setting`. `pgrst.db_anon_role` names the
 * role an unauthenticated request runs as, and the connecting role
 * (`authenticator` by convention) is the one that can `SET ROLE` to it.
 *
 * Supabase is PostgREST underneath, so this covers it too; the difference is
 * the role vocabulary, which the `supabase` preset supplies.
 */
export const postgrestAdapter: ExposureAdapter = {
  name: 'postgrest',

  async detect(exec: QueryExecutor): Promise<boolean> {
    return (await postgrestSettings(exec)).size > 0;
  },

  async resolve(exec: QueryExecutor): Promise<PlaneInput[]> {
    const settings = await postgrestSettings(exec);
    const schemas = splitList(settings.get('pgrst.db_schemas'));
    if (schemas.length === 0) return [];

    const anon = settings.get('pgrst.db_anon_role');
    const { rows } = await exec.query<{ rolname: string }>(
      `SELECT r.rolname::text
         FROM pg_db_role_setting s
         JOIN pg_roles r ON r.oid = s.setrole
        WHERE array_to_string(s.setconfig, ',') LIKE '%pgrst.%'`
    );
    // The authenticator is the connecting role, not an API-edge role: it holds
    // no data privileges of its own, so grading it would grade nothing.
    const authenticators = rows.map((r) => r.rolname);

    return [
      {
        name: 'api',
        kind: 'api',
        primary: true,
        schemas,
        roles: anon ? [anon] : []
      },
      ...authenticators.map((role): PlaneInput => ({
        name: `direct:${role}`,
        kind: 'role',
        roles: [role]
      }))
    ];
  }
};

/**
 * Supabase runs PostgREST, but configures it *outside* the database — the
 * schema list is a platform setting, so `pgrst.db_schemas` is usually absent
 * and `postgrestAdapter` correctly resolves nothing. Hence a separate
 * adapter: it prefers the GUCs when a self-hosted stack sets them, and only
 * falls back to the platform's fixed surface once it has *proved* it is
 * looking at Supabase — `auth.users` plus the three roles every project has.
 *
 * The fallback is deliberately confined here. `postgrestAdapter` never
 * guesses: an unconfigured PostgREST resolves no planes, which surfaces as
 * unknown exposure (a capped score and a W1) rather than a wrong surface
 * presented as fact.
 */
export const supabaseAdapter: ExposureAdapter = {
  name: 'supabase',

  async detect(exec: QueryExecutor): Promise<boolean> {
    const { rows } = await exec.query<{ ok: boolean }>(
      `SELECT to_regclass('auth.users') IS NOT NULL
              AND (SELECT count(*) FROM pg_roles
                    WHERE rolname IN ('anon', 'authenticated', 'service_role')) = 3 AS ok`
    );
    return rows[0]?.ok === true;
  },

  async resolve(exec: QueryExecutor): Promise<PlaneInput[]> {
    const configured = await postgrestAdapter.resolve(exec);
    if (configured.length > 0) return configured;

    // Supabase's default exposure, and only reachable once detect() has
    // confirmed this really is a Supabase database.
    const { rows } = await exec.query<{ nspname: string }>(
      `SELECT nspname::text FROM pg_namespace
        WHERE nspname IN ('public', 'graphql_public', 'storage')`
    );
    const schemas = rows.map((r) => r.nspname).sort();
    if (schemas.length === 0) return [];

    return [
      {
        name: 'api',
        kind: 'api',
        primary: true,
        schemas,
        roles: ['anon', 'authenticated']
      },
      // service_role bypasses RLS by design; planes.ts reports it as skipped
      // rather than inventing an ordinary grade for it.
      { name: 'direct:service_role', kind: 'role', roles: ['service_role'] }
    ];
  }
};

/**
 * Hasura reads its exposed surface out of its own metadata: v2+ keeps one
 * JSON document in `hdb_catalog.hdb_metadata`, older versions a row per
 * tracked table in `hdb_catalog.hdb_table`. Only *tracked* tables are served,
 * so the schemas that contain them are the surface.
 */
export const hasuraAdapter: ExposureAdapter = {
  name: 'hasura',

  async detect(exec: QueryExecutor): Promise<boolean> {
    const { rows } = await exec.query<{ ok: boolean }>(
      `SELECT to_regclass('hdb_catalog.hdb_metadata') IS NOT NULL
              OR to_regclass('hdb_catalog.hdb_table') IS NOT NULL AS ok`
    );
    return rows[0]?.ok === true;
  },

  async resolve(exec: QueryExecutor): Promise<PlaneInput[]> {
    const schemas = new Set<string>();

    const { rows: modern } = await exec.query<{ ok: boolean }>(
      `SELECT to_regclass('hdb_catalog.hdb_metadata') IS NOT NULL AS ok`
    );
    if (modern[0]?.ok) {
      const { rows } = await exec.query<{ schema_name: string }>(
        `SELECT DISTINCT t.value -> 'table' ->> 'schema' AS schema_name
           FROM hdb_catalog.hdb_metadata m
           CROSS JOIN LATERAL jsonb_array_elements(m.metadata -> 'sources') AS s(value)
           CROSS JOIN LATERAL jsonb_array_elements(s.value -> 'tables') AS t(value)`
      );
      for (const r of rows) if (r.schema_name) schemas.add(r.schema_name);
    } else {
      const { rows } = await exec.query<{ schema_name: string }>(
        'SELECT DISTINCT table_schema::text AS schema_name FROM hdb_catalog.hdb_table'
      );
      for (const r of rows) if (r.schema_name) schemas.add(r.schema_name);
    }
    if (schemas.size === 0) return [];

    return [{ name: 'api', kind: 'api', primary: true, schemas: sorted(schemas) }];
  }
};

/**
 * PostGraphile publishes whatever schemas it was started with — a CLI/library
 * argument, invisible from inside the database. So this adapter resolves the
 * `graphile-starter` layout (`app_public` served, `app_hidden`/`app_private`
 * not) and nothing else.
 *
 * That is naming-as-intent, which safegres otherwise refuses. The difference
 * is consent: listing this adapter *is* the declaration that the convention
 * holds here. When it doesn't, list `exposure.schemas` instead — explicit
 * always wins.
 */
export const graphileAdapter: ExposureAdapter = {
  name: 'graphile',

  async detect(exec: QueryExecutor): Promise<boolean> {
    const { rows } = await exec.query<{ ok: boolean }>(
      "SELECT to_regnamespace('app_public') IS NOT NULL AS ok"
    );
    return rows[0]?.ok === true;
  },

  async resolve(exec: QueryExecutor): Promise<PlaneInput[]> {
    const { rows } = await exec.query<{ nspname: string }>(
      `SELECT nspname::text
         FROM pg_namespace
        WHERE nspname IN ('app_public', 'app_hidden', 'app_private')`
    );
    const present = new Set(rows.map((r) => r.nspname));
    if (!present.has('app_public')) return [];

    const visitors = await graphileVisitorRoles(exec);

    const planes: PlaneInput[] = [
      {
        name: 'api',
        kind: 'api',
        primary: true,
        // app_hidden is reachable through app_public's views and functions —
        // served indirectly, so it belongs to the surface.
        schemas: ['app_public', ...(present.has('app_hidden') ? ['app_hidden'] : [])],
        roles: visitors
      }
    ];
    if (present.has('app_private')) {
      planes.push({ name: 'internal', kind: 'schema', schemas: ['app_private'] });
    }
    return planes;
  }
};

/**
 * The role PostGraphile runs requests as. graphile-starter names it
 * `<app>_visitor` — project-specific, so it cannot be hardcoded — and reaches
 * it by `SET ROLE` from `<app>_authenticator`. Membership is the reliable
 * signal: the authenticator is a LOGIN role whose only purpose is to become
 * the visitor, so its grantees *are* the request roles. The `%_visitor`
 * suffix is the fallback for a database whose authenticator is provisioned
 * elsewhere (a managed connection pooler, a role created outside migrations).
 *
 * This matters because every unauthenticated request arrives as this role:
 * logged-in or not, PostGraphile uses the same role and distinguishes callers
 * by JWT claims, so it is by definition untrusted.
 */
async function graphileVisitorRoles(exec: QueryExecutor): Promise<string[]> {
  // Roles an `%_authenticator` may SET ROLE to — the request roles by
  // construction, whatever they are named.
  const { rows: granted } = await exec.query<{ rolname: string }>(
    `SELECT DISTINCT member.rolname::text AS rolname
       FROM pg_auth_members m
       JOIN pg_roles authenticator ON authenticator.oid = m.roleid
       JOIN pg_roles member ON member.oid = m.member
      WHERE authenticator.rolname LIKE '%\\_authenticator'`
  );
  if (granted.length > 0) return granted.map((r) => r.rolname).sort();

  const { rows: bySuffix } = await exec.query<{ rolname: string }>(
    `SELECT rolname::text FROM pg_roles
      WHERE rolname = 'visitor' OR rolname LIKE '%\\_visitor'`
  );
  return bySuffix.map((r) => r.rolname).sort();
}

/** Every adapter a config may name with a string. */
export const BUILTIN_ADAPTERS: Record<string, ExposureAdapter> = {
  constructive: constructiveAdapter,
  graphile: graphileAdapter,
  hasura: hasuraAdapter,
  postgrest: postgrestAdapter,
  supabase: supabaseAdapter
};

/**
 * `pgrst.*` GUCs from `pg_db_role_setting`, whichever role or database they
 * were set on. Reading the catalog rather than `current_setting()` is what
 * makes this work from an audit connection that is not the API's.
 */
async function postgrestSettings(exec: QueryExecutor): Promise<Map<string, string>> {
  const { rows } = await exec.query<{ setting: string }>(
    `SELECT unnest(setconfig) AS setting FROM pg_db_role_setting`
  );
  const settings = new Map<string, string>();
  for (const { setting } of rows) {
    const eq = setting.indexOf('=');
    if (eq < 0) continue;
    const key = setting.slice(0, eq).trim().toLowerCase();
    if (key.startsWith('pgrst.')) settings.set(key, setting.slice(eq + 1).trim());
  }
  return settings;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
    )
  ].sort();
}

/**
 * Wrap a fixed set of planes as an adapter — the escape hatch for a surface
 * you know but cannot introspect (a schema list your deployment tooling
 * knows, an API gateway's config read at build time).
 */
export function definePlanes(name: string, planes: PlaneInput[]): ExposureAdapter {
  return {
    name,
    detect: async () => planes.length > 0,
    resolve: async () => planes
  };
}

/**
 * Coerce whatever a config carried in `exposure.adapters` into adapters.
 * Strings resolve against the built-in table only — an unknown name is an
 * error rather than a silent no-op, because a typo'd adapter name would
 * otherwise present as an unexposed database.
 */
export function resolveAdapters(
  entries: Array<string | ExposureAdapter> | undefined
): ExposureAdapter[] {
  if (!entries || entries.length === 0) return [];
  return entries.map((entry) => {
    if (typeof entry !== 'string') return entry as unknown as ExposureAdapter;
    const builtin = BUILTIN_ADAPTERS[entry];
    if (!builtin) {
      throw new Error(
        `unknown exposure adapter "${entry}" — built-ins: ${Object.keys(BUILTIN_ADAPTERS).join(', ')}`
          + '; a custom adapter is passed as an object, not by name'
      );
    }
    return builtin;
  });
}

function sorted(values: Set<string>): string[] {
  return [...values].sort();
}
