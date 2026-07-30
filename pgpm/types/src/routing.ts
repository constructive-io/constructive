/**
 * The unified routing profile: the single, shared shape for consumer-side
 * routing policy ("where should schemas/objects/extensions/roles land?").
 *
 * It attaches at two scopes:
 * - workspace scope: the `portability` field of `pgpm.json`
 *   ({@link PgpmWorkspaceConfig.portability}) — the default for every
 *   apply/transpile in the workspace;
 * - per-import scope: the routing keys of a proxy module's `pgpm.apply.json` —
 *   overrides the workspace profile per key (inner scope wins).
 *
 * Module self-description (what a module provides/consumes) lives elsewhere:
 * the per-module `extensions.json` manifest and `.control` `requires`.
 */

/** Object kinds an object-level route can target. */
export type PgpmRouteKind = 'table' | 'view' | 'function' | 'procedure' | 'type';

/**
 * An object-level route: send one named object out of a source schema to a
 * target schema, overriding the whole-schema default for that object only.
 * Kinds are expressed as separate properties (no dotted identity strings), so
 * a table and a function of the same name route independently.
 */
export interface PgpmRouteEntry {
  /** Source schema the object is defined in (e.g. `users`). */
  fromSchema: string;
  /** Object namespace: `table`/`view` → relation, `procedure` → function. */
  kind: PgpmRouteKind;
  /** Unqualified object name (e.g. `accounts`). */
  name: string;
  /** Target schema the object is routed to (e.g. `reporting`). */
  toSchema: string;
}

/**
 * Extension routing: where the transpiled output should resolve the symbols
 * extensions provide (e.g. isolate `pgcrypto` in a dedicated `extensions`
 * schema, qualifying bare `crypt(...)` calls, or the reverse). A distinct
 * dimension from schema routing — driven by a version-aware symbol inventory,
 * not by the objects the SQL itself creates.
 */
export interface PgpmExtensionsRouting {
  /**
   * Route the matched extensions' provided symbols to this schema. `null`
   * strips qualification (rely on `search_path`). Ignored when `routes` is
   * given.
   */
  toSchema?: string | null;
  /** With `toSchema`: limit to these extensions (default: every inventoried one). */
  only?: string[];
  /**
   * With `toSchema`: which source qualifications to rewrite (a `null` entry
   * also rewrites bare references). Defaults to `public` + bare.
   */
  from?: (string | null)[];
  /**
   * Advanced: explicit per-extension routes (`{ "<ext>": { "to": "<schema>|null",
   * "from"?: [...] } }`). Overrides `toSchema`/`only`/`from`.
   */
  routes?: Record<string, { to: string | null; from?: (string | null)[] }>;
  /** Target PostgreSQL major version, for core-graduation awareness. */
  serverVersion?: number;
}

/** Role-name translation: source role name → target role name. */
export type PgpmRolesRouting = Record<string, string>;

/** The unified routing profile. Every key is optional and merges per key. */
export interface PgpmRoutingProfile {
  /** Whole-schema default: source schema → target schema. */
  schemas?: Record<string, string>;
  /** Object-level routes overriding the `schemas` default per object. */
  route?: PgpmRouteEntry[];
  /** Extension routing (see {@link PgpmExtensionsRouting}). */
  extensions?: PgpmExtensionsRouting;
  /** Role-name translation (see {@link PgpmRolesRouting}). */
  roles?: PgpmRolesRouting;
}

/** The routing-profile keys, in a stable order. */
export const ROUTING_PROFILE_KEYS = ['schemas', 'route', 'extensions', 'roles'] as const;

/**
 * Merge routing profiles per key: for each of `schemas`/`route`/`extensions`/
 * `roles`, the last profile that defines the key wins whole (no deep merge),
 * like lexical scoping — a profile that only overrides `roles` still inherits
 * an outer `extensions` mapping. Returns `undefined` when no input defines any
 * key.
 */
export function mergeRoutingProfiles(
  ...profiles: (PgpmRoutingProfile | undefined)[]
): PgpmRoutingProfile | undefined {
  const merged: PgpmRoutingProfile = {};
  for (const profile of profiles) {
    if (!profile) continue;
    for (const key of ROUTING_PROFILE_KEYS) {
      if (profile[key] !== undefined) {
        (merged as any)[key] = profile[key];
      }
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}
