/**
 * The apply-spec ("proxy module") types.
 *
 * A proxy module is a directory containing a single `pgpm.apply.json` file:
 * "apply <source module> transpiled with this schema map, under my name". It
 * needs no `.control`, no `pgpm.plan`, and no deploy/revert/verify scripts —
 * workspace discovery synthesizes a module entry from the spec, so the proxy
 * participates in dependency resolution by name exactly like a regular
 * module. At deploy/verify/revert time the engine transpiles the source
 * module in memory and runs the normal migration path against the result;
 * transpiled code is never committed.
 */

/** File name of the apply spec inside a proxy module directory. */
export const APPLY_SPEC_FILE = 'pgpm.apply.json';

/** Expanded reference to the source module a proxy module applies. */
export interface ApplySpecSource {
  /**
   * Control/module name of the source module as it appears in the workspace
   * module map (e.g. `pgpm-totp`). The source is typically installed into the
   * workspace extensions directory via `pgpm install`; it is source material,
   * not a runtime dependency, so it must not appear in `requires`.
   */
  module: string;
  /** Optional npm package name the source is installed from (e.g. `@pgpm/totp`). */
  package?: string;
  /** Optional exact version pin for the source package. */
  version?: string;
  /**
   * Optional content-addressed pin: the expected `manifest.digest` of the
   * source bundle. When present, apply refuses to proceed if the installed
   * source does not hash to exactly this digest.
   */
  bundleDigest?: string;
}

/**
 * An object-level route in a `pgpm.apply.json` spec: send one named object out
 * of a source schema to a target schema, overriding the whole-schema default
 * for that object only. Kinds are expressed as separate properties (no dotted
 * identity strings), so a table and a function of the same name route
 * independently.
 */
export interface ApplyRouteEntry {
  /** Source schema the object is defined in (e.g. `users`). */
  fromSchema: string;
  /** Object namespace: `table`/`view` → relation, `procedure` → function. */
  kind: 'table' | 'view' | 'function' | 'procedure' | 'type';
  /** Unqualified object name (e.g. `accounts`). */
  name: string;
  /** Target schema the object is routed to (e.g. `reporting`). */
  toSchema: string;
}

/**
 * A per-tenant seed object in a reuse spec: the objects that must be
 * materialized once *per tenant*. `@pgpmjs/slice`'s `partitionModule` starts
 * from these seeds and marks every change that transitively reaches one as
 * per-tenant; everything else is proven shared and emitted once. Expressed as
 * separate properties (no dotted identity strings), matching {@link ApplyRouteEntry}.
 */
export interface ApplyReuseSeed {
  /** Source schema the seed object is defined in (e.g. `catalog`). */
  fromSchema: string;
  /** Object namespace: `table`/`view` → relation, `procedure` → function. */
  kind: 'table' | 'view' | 'function' | 'procedure' | 'type';
  /** Unqualified object name (e.g. `products`). */
  name: string;
}

/**
 * Reuse declaration: split the source into a *shared* module (deployed once,
 * reused by every tenant via ordinary `requires`) and a *per-tenant* module
 * (materialized per instance). The classifier proves the split from the
 * `perTenant` seeds; a shared object that would depend on a per-tenant one is
 * rejected as unsound rather than silently deployed.
 */
export interface ApplyReuseSpec {
  /**
   * Source schema → *shared* target schema. Shared objects land here; this
   * mapping must be stable across tenant instances so the shared module has a
   * deterministic identity and deploys exactly once.
   */
  sharedSchema: Record<string, string>;
  /** Per-tenant seed objects (non-empty). */
  perTenant: ApplyReuseSeed[];
  /**
   * Optional explicit shared-module name. Defaults to a deterministic name
   * derived from the source module and the shared-schema mapping, so two tenant
   * proxies over the same source + shared mapping resolve to one shared module.
   */
  sharedName?: string;
}

/** The parsed, normalized `pgpm.apply.json` spec. */
export interface PgpmApplySpec {
  /**
   * Module name this instance is deployed as. Defaults to the proxy
   * directory's name.
   */
  name?: string;
  /** Source module reference: a module name, or the expanded object form. */
  source: string | ApplySpecSource;
  /**
   * Whole-schema default: source schema → target schema (drives the AST + plan
   * rewrite). Optional when `route` fully covers the objects being moved.
   */
  schemas?: Record<string, string>;
  /**
   * Object-level routes. Each entry overrides the `schemas` default for its
   * specific object, letting one source schema fan out per object (e.g. a
   * table into a tenant schema and a function into a shared schema).
   */
  route?: ApplyRouteEntry[];
  /**
   * Reuse declaration: split shared vs per-tenant objects (see
   * {@link ApplyReuseSpec}). When present, this proxy expands into two modules —
   * a shared module and a per-tenant module that `requires` it.
   */
  reuse?: ApplyReuseSpec;
  /**
   * Runtime requires of the transpiled output (native extensions and other
   * modules). Defaults to the source module's own requires.
   */
  requires?: string[];
  /** Version reported for this instance (default: the source's version). */
  version?: string;
}

/** {@link PgpmApplySpec} with `source` normalized to the object form. */
export interface ResolvedApplySpec extends Omit<PgpmApplySpec, 'source'> {
  source: ApplySpecSource;
}
