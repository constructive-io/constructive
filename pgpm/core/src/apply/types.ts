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

/** The parsed, normalized `pgpm.apply.json` spec. */
export interface PgpmApplySpec {
  /**
   * Module name this instance is deployed as. Defaults to the proxy
   * directory's name.
   */
  name?: string;
  /** Source module reference: a module name, or the expanded object form. */
  source: string | ApplySpecSource;
  /** Source schema name → target schema name (drives the AST + plan rewrite). */
  schemas: Record<string, string>;
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
