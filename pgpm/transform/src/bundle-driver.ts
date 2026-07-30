/**
 * Bundle transpile/apply drivers.
 *
 * Adapters that plug this package's AST transforms into the pgpm migration
 * bundle seams (`transpileBundle`'s `renameChange`/`transformScript` and
 * `applyBundle`'s `validateReferences`). The seams are structurally typed on
 * purpose — no dependency on `@pgpmjs/bundle`/`@pgpmjs/core` — so the driver
 * stays a pure function factory over `transformSql` and `classifyStatements`.
 */

import { classifyStatements } from '@pgsql/transform';
import {
  createExtensionResult,
  createRoleResult,
  ExtensionDefinition,
  ExtensionRouteSpec,
  ExtensionRouter,
  ExtensionTransformResult,
  RoleRouteSpec,
  RoleRouter,
  RoleTransformResult,
  RouteSpec,
  SchemaRouter,
  SchemaTransformResult,
  transformExtensions,
  transformRoles,
  transformSql,
  TransformSqlOptions
} from '@pgsql/transform';

/** Identity of the script being transformed/validated (matches the bundle seams). */
export interface BundleScriptContext {
  change: string;
  kind: 'deploy' | 'revert' | 'verify';
}

/**
 * A single object-level route: send one named object out of a source schema to
 * a different target schema, independent of the schema-level default. The
 * object `kind` selects the routing namespace (relation / function / type) so a
 * table and a function of the same name route independently.
 */
export interface SchemaObjectRoute {
  /** Source schema the object is defined in (e.g. `users`). */
  fromSchema: string;
  /** Object namespace. `table`/`view` → relation, `procedure` → function. */
  kind: 'table' | 'view' | 'function' | 'procedure' | 'type';
  /** Unqualified object name (e.g. `accounts`). */
  name: string;
  /**
   * Target schema this object is routed to (e.g. `reporting`). `null` strips
   * qualification (resolve via `search_path`); omitted with `toName` leaves
   * the schema to the whole-schema default.
   */
  toSchema?: string | null;
  /**
   * Target object name — rebinds references to a *different* object (e.g.
   * point `identity.current_actor()` at `current_user_id()`). At least one of
   * `toSchema`/`toName` must be given.
   */
  toName?: string;
}

/**
 * Extension routing for a transpile: where to install extensions and where the
 * symbols they provide (functions/types/operators) should resolve. Distinct
 * from schema routing — the objects are owned by an extension, not declared in
 * the SQL — so it is driven by a version-aware symbol inventory. See the
 * upstream `ExtensionRouter` for the full model. `toSchema: null` (or a `routes`
 * entry with `to: null`) strips qualification — the "rely on search_path"
 * direction — so the same mechanism moves symbols into a dedicated schema and
 * back out again.
 */
export interface ExtensionRoutingInput {
  /**
   * Move the matched extensions and their provided symbols to this single
   * schema (`null` strips qualification). Ignored when `routes` is given.
   */
  toSchema?: string | null;
  /** With `toSchema`: limit to these extensions (default: every inventoried one). */
  only?: string[];
  /**
   * With `toSchema`: which source qualifications to rewrite (a `null` entry
   * also rewrites bare references). Defaults to `public` + bare.
   */
  from?: (string | null)[];
  /** Advanced: explicit per-extension route spec. Overrides `toSchema`/`only`/`from`. */
  routes?: ExtensionRouteSpec;
  /** Target PostgreSQL major version, for core-graduation awareness (e.g. `gen_random_uuid`). */
  serverVersion?: number;
  /** Augmented or replacement symbol inventory (defaults to the curated common set). */
  inventory?: ExtensionDefinition[];
}

/**
 * Build an {@link ExtensionRouter} from the declarative {@link ExtensionRoutingInput}:
 * an explicit `routes` spec when given, otherwise the "move everything matched
 * to one schema" shortcut via `ExtensionRouter.toSchema`.
 */
export function buildExtensionRouter(input: ExtensionRoutingInput): ExtensionRouter {
  const opts: { serverVersion?: number; inventory?: ExtensionDefinition[] } = {};
  if (input.serverVersion !== undefined) opts.serverVersion = input.serverVersion;
  if (input.inventory) opts.inventory = input.inventory;
  if (input.routes) return new ExtensionRouter(input.routes, opts);
  return ExtensionRouter.toSchema(input.toSchema ?? null, {
    ...opts,
    extensions: input.only,
    from: input.from
  });
}

export interface SchemaTranspilerOptions {
  /**
   * Whole-schema default: source schema → target schema. Optional when
   * `routes` fully cover the objects being moved.
   */
  schemaMap?: Record<string, string>;
  /**
   * Object-level overrides. Each route wins over the schema-level default for
   * its specific object, letting a single source schema fan out per object.
   */
  routes?: SchemaObjectRoute[];
  /**
   * Route extension installs and provided-symbol references (a dimension
   * orthogonal to schema routing). See {@link ExtensionRoutingInput}.
   */
  extensions?: ExtensionRoutingInput;
  /**
   * Rename role identifiers (source role name → target role name), for
   * translating between databases that name equivalent roles differently.
   * Renames identifiers only — never role attributes.
   */
  roles?: RoleRouteSpec | Map<string, string>;
  /** Forwarded to {@link transformSql} (round-trip validation, extra passes). */
  transform?: TransformSqlOptions;
}

/** pgpm change-path folder segment → transform routing namespace. */
const PATH_KIND_NS: Record<string, 'relation' | 'function' | 'type'> = {
  tables: 'relation',
  views: 'relation',
  procedures: 'function',
  functions: 'function',
  types: 'type'
};

/** Object route `kind` → the {@link SchemaRoute} bucket it belongs in. */
const ROUTE_KIND_BUCKET: Record<
  SchemaObjectRoute['kind'],
  'relations' | 'functions' | 'types'
> = {
  table: 'relations',
  view: 'relations',
  function: 'functions',
  procedure: 'functions',
  type: 'types'
};

/**
 * Build a {@link SchemaRouter} from a schema-level default map plus object
 * routes. Object routes are grouped into the router's relation/function/type
 * buckets; schema-level entries become each route's default target.
 */
export function buildSchemaRouter(options: SchemaTranspilerOptions): SchemaRouter {
  const spec: RouteSpec = {};
  const ensure = (schema: string) => (spec[schema] ??= {});

  for (const [from, to] of Object.entries(options.schemaMap ?? {})) {
    ensure(from).schema = to;
  }
  for (const route of options.routes ?? []) {
    if (route.toSchema === undefined && route.toName === undefined) {
      throw new Error(
        `Object route for ${route.fromSchema}.${route.name} needs "toSchema" and/or "toName"`
      );
    }
    const bucketKey = ROUTE_KIND_BUCKET[route.kind];
    const target = ensure(route.fromSchema);
    (target[bucketKey] ??= {})[route.name] =
      route.toName === undefined && typeof route.toSchema === 'string'
        ? route.toSchema
        : {
            ...(route.toSchema !== undefined ? { schema: route.toSchema } : {}),
            ...(route.toName !== undefined ? { name: route.toName } : {})
          };
  }
  return new SchemaRouter(spec);
}

export interface SchemaTranspiler {
  /**
   * Change-name/path rewrite (the pgpm structural dimension): rewrites the
   * schema segment of a change path to the object's routed target. The object
   * identity is read from the path itself — `schemas/<schema>/<kind>/<name>` —
   * so a table and a function under the same source schema can land in
   * different target schemas, e.g. `schemas/users/tables/accounts/table` →
   * `schemas/tenant_a/tables/accounts/table` while
   * `schemas/users/procedures/account_count` → `schemas/reporting/procedures/account_count`.
   */
  renameChange: (name: string) => string;
  /**
   * SQL body rewrite (the AST dimension): full AST transform of every mapped
   * schema reference via {@link transformSql}, including PL/pgSQL bodies.
   * Throws if a mapped schema survives untransformed.
   */
  transformScript: (sql: string, ctx: BundleScriptContext) => string;
  /**
   * Accumulated report across every script this transpiler has transformed:
   * schemas found/transformed and any per-script errors.
   */
  result: SchemaTransformResult;
  /**
   * Accumulated extension-routing report (installs moved, symbols rewritten).
   * Present only when `extensions` was configured.
   */
  extensionResult?: ExtensionTransformResult;
  /**
   * Accumulated role-routing report (role → rewrite count). Present only when
   * `roles` was configured.
   */
  roleResult?: RoleTransformResult;
}

/**
 * Rewrite the schema segment of a pgpm change path to the object's routed
 * target. Interprets `schemas/<schema>/<kind>/<name>...`: the bare
 * `schemas/<schema>/schema` change resolves at the schema level; typed folders
 * (`tables`, `procedures`, `types`, …) resolve the named object in its
 * namespace, so object routes and the schema-level default both apply.
 */
function renameChangePath(name: string, router: SchemaRouter): string {
  const parts = name.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] !== 'schemas') continue;
    const schema = parts[i + 1];
    if (!router.has(schema)) continue;

    const folder = parts[i + 2];
    let target: string | undefined;
    if (folder === undefined || folder === 'schema') {
      target = router.resolve(schema, undefined, 'schema');
    } else {
      const ns = PATH_KIND_NS[folder];
      const objectName = parts[i + 3];
      target = ns
        ? router.resolve(schema, objectName, ns)
        : router.resolve(schema, undefined, 'schema');
    }

    if (target && target !== schema) parts[i + 1] = target;
  }
  return parts.join('/');
}

/**
 * Build the caller-supplied callbacks for `transpileBundle` from a schema map
 * and/or object routes, so the folder/plan rename (change identity) and the
 * in-SQL rewrite (AST) stay in lockstep on the exact same {@link SchemaRouter}.
 */
export function makeSchemaTranspiler(options: SchemaTranspilerOptions): SchemaTranspiler {
  const router = buildSchemaRouter(options);
  const result: SchemaTransformResult = {
    schemasFound: new Set(),
    schemasTransformed: new Map(),
    errors: []
  };

  // Extension/role routing are additional, orthogonal AST dimensions applied
  // after schema routing on each script. Each is a self-contained parse →
  // rewrite → deparse pass, so they compose by threading the SQL through.
  const extRouter = options.extensions ? buildExtensionRouter(options.extensions) : undefined;
  const roleRouter = options.roles ? RoleRouter.from(options.roles) : undefined;
  const extensionResult = extRouter ? createExtensionResult() : undefined;
  const roleResult = roleRouter ? createRoleResult() : undefined;

  const renameChange = (name: string): string => renameChangePath(name, router);

  const transformScript = (sql: string, _ctx: BundleScriptContext): string => {
    let out = transformSql(sql, router, options.transform, result).content;
    if (extRouter) {
      const r = transformExtensions(out, extRouter);
      out = r.sql;
      for (const [name, schema] of r.result.installsMoved) {
        extensionResult!.installsMoved.set(name, schema);
      }
      for (const [name, count] of r.result.symbolsRewritten) {
        extensionResult!.symbolsRewritten.set(
          name,
          (extensionResult!.symbolsRewritten.get(name) ?? 0) + count
        );
      }
    }
    if (roleRouter) {
      const r = transformRoles(out, roleRouter);
      out = r.sql;
      for (const [name, count] of r.result.rolesRenamed) {
        roleResult!.rolesRenamed.set(name, (roleResult!.rolesRenamed.get(name) ?? 0) + count);
      }
    }
    return out;
  };

  return { renameChange, transformScript, result, extensionResult, roleResult };
}

export interface NamespaceValidatorOptions {
  /** Schemas the bundle is allowed to create objects in or reference. */
  allowedSchemas: string[];
  /**
   * Also flag statements whose PL/pgSQL bodies execute dynamic SQL — their
   * references are invisible to the AST, so containment cannot be proven.
   * Off by default (dynamic SQL is common in legitimate functions).
   */
  flagDynamicSql?: boolean;
}

/**
 * Build an `applyBundle`-compatible `validateReferences` callback: returns a
 * description of every schema-qualified object a script creates or references
 * outside the allowed namespace. Unqualified references resolve via
 * search_path and are not reported.
 */
export function makeNamespaceValidator(
  options: NamespaceValidatorOptions
): (sql: string, ctx: BundleScriptContext) => string[] {
  const allowed = new Set(options.allowedSchemas);

  return (sql: string, _ctx: BundleScriptContext): string[] => {
    const violations = new Set<string>();
    for (const facts of classifyStatements(sql)) {
      for (const ref of [...facts.creates, ...facts.references, ...facts.fkTargets]) {
        if (ref.schema && !allowed.has(ref.schema)) {
          violations.add(`${facts.nodeTag}: ${ref.schema}.${ref.name}`);
        }
      }
      if (options.flagDynamicSql && facts.dynamicSql) {
        violations.add(`${facts.nodeTag}: dynamic SQL — references not statically verifiable`);
      }
    }
    return [...violations];
  };
}
