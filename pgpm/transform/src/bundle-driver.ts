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
  RouteSpec,
  SchemaRouter,
  SchemaTransformResult,
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
  /** Target schema this object is routed to (e.g. `reporting`). */
  toSchema: string;
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
    const bucketKey = ROUTE_KIND_BUCKET[route.kind];
    const target = ensure(route.fromSchema);
    (target[bucketKey] ??= {})[route.name] = route.toSchema;
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

  const renameChange = (name: string): string => renameChangePath(name, router);

  const transformScript = (sql: string, _ctx: BundleScriptContext): string => {
    return transformSql(sql, router, options.transform, result).content;
  };

  return { renameChange, transformScript, result };
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
