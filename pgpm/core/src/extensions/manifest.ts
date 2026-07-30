import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Declarative extension manifest (`extensions.json`) that lives next to a
 * module's `pgpm.plan` / `.control`. It makes a module self-describing about
 * the PostgreSQL extensions it relates to:
 *
 * - `provides` — the module *is* the extension wrapper: it installs the
 *   extension into a chosen schema (with grants). This is what replaces the
 *   dynamic `DO $$ EXECUTE 'CREATE EXTENSION ... SCHEMA x' $$` hack, since a
 *   literal `CREATE EXTENSION` is stripped at package time.
 * - `consumes` — the module merely *uses* symbols from an extension installed
 *   elsewhere (e.g. a bare `crypt()` call) and needs them qualified to wherever
 *   the extension actually landed. This is the transform/routing side.
 *
 * `.control` `requires` still names the extension (dependency ordering is
 * unchanged); this manifest only adds the *where + grants* that `.control`
 * cannot express.
 */

/** Candidate file names, in precedence order. */
export const EXTENSIONS_MANIFEST_FILES = ['pgpm.extensions.json', 'extensions.json'] as const;

/**
 * What a declared grant targets. Kept structural (not free-form SQL) so it can
 * be classified, role-routed, and reverted deterministically.
 */
export type ExtensionGrantTarget =
  | 'schema'
  | 'all-tables'
  | 'all-sequences'
  | 'all-functions';

export interface ExtensionGrant {
  /** Privilege list, e.g. `USAGE`, `ALL`, `EXECUTE`, `SELECT`. */
  privileges: string;
  /** Object class the grant applies to, resolved against the install schema. */
  on: ExtensionGrantTarget;
  /** Role name(s). Routed through the workspace role map when one is supplied. */
  to: string | string[];
}

export interface ExtensionProvide {
  /**
   * Target schema for the install. A string routes the extension there; `null`
   * means default/unqualified (control-file location, typically `public`).
   */
  schema?: string | null;
  /**
   * Author's assertion that the extension is relocatable. Defaults to `true`.
   * A fixed-schema (`false`) extension must not be routed to a schema that
   * differs from its control-file schema — {@link compileExtensionInstall}
   * refuses that combination.
   */
  relocatable?: boolean;
  /** Emit `IF NOT EXISTS` on `CREATE EXTENSION`. Defaults to `true`. */
  ifNotExists?: boolean;
  /** Emit `CASCADE` on `CREATE EXTENSION`. Defaults to `false`. */
  cascade?: boolean;
  /**
   * Create `schema` before installing (idempotent). Defaults to `true` when a
   * schema is given. Set `false` when the schema is owned by another module.
   */
  createSchema?: boolean;
  /** Also `DROP SCHEMA` on revert. Defaults to `false` (only drop the extension). */
  dropSchema?: boolean;
  /** Grants applied after install. */
  grants?: ExtensionGrant[];
}

export interface ExtensionConsume {
  /** Bare symbol names this module references (functions/types/operators). */
  symbols?: string[];
}

export interface ExtensionsManifest {
  provides?: Record<string, ExtensionProvide>;
  consumes?: Record<string, ExtensionConsume>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const GRANT_TARGETS: ReadonlySet<string> = new Set<ExtensionGrantTarget>([
  'schema',
  'all-tables',
  'all-sequences',
  'all-functions'
]);

/**
 * Validate + normalize a parsed manifest object. Throws with a precise message
 * on malformed input so authors get actionable errors rather than silent
 * misconfiguration.
 */
export function validateExtensionsManifest(raw: unknown, source = 'extensions.json'): ExtensionsManifest {
  if (!isPlainObject(raw)) {
    throw new Error(`${source}: manifest must be a JSON object`);
  }
  const manifest: ExtensionsManifest = {};

  if (raw.provides !== undefined) {
    if (!isPlainObject(raw.provides)) {
      throw new Error(`${source}: "provides" must be an object keyed by extension name`);
    }
    const provides: Record<string, ExtensionProvide> = {};
    for (const [extname, value] of Object.entries(raw.provides)) {
      provides[extname] = validateProvide(extname, value, source);
    }
    manifest.provides = provides;
  }

  if (raw.consumes !== undefined) {
    if (!isPlainObject(raw.consumes)) {
      throw new Error(`${source}: "consumes" must be an object keyed by extension name`);
    }
    const consumes: Record<string, ExtensionConsume> = {};
    for (const [extname, value] of Object.entries(raw.consumes)) {
      if (!isPlainObject(value)) {
        throw new Error(`${source}: consumes."${extname}" must be an object`);
      }
      const entry: ExtensionConsume = {};
      if (value.symbols !== undefined) {
        if (!Array.isArray(value.symbols) || value.symbols.some((s) => typeof s !== 'string' || !s.trim())) {
          throw new Error(`${source}: consumes."${extname}".symbols must be an array of non-empty strings`);
        }
        entry.symbols = value.symbols as string[];
      }
      consumes[extname] = entry;
    }
    manifest.consumes = consumes;
  }

  return manifest;
}

function validateProvide(extname: string, value: unknown, source: string): ExtensionProvide {
  if (!isPlainObject(value)) {
    throw new Error(`${source}: provides."${extname}" must be an object`);
  }
  const provide: ExtensionProvide = {};

  if (value.schema !== undefined) {
    if (value.schema !== null && (typeof value.schema !== 'string' || !value.schema.trim())) {
      throw new Error(`${source}: provides."${extname}".schema must be a non-empty string or null`);
    }
    provide.schema = value.schema as string | null;
  }

  for (const flag of ['relocatable', 'ifNotExists', 'cascade', 'createSchema', 'dropSchema'] as const) {
    if (value[flag] !== undefined) {
      if (typeof value[flag] !== 'boolean') {
        throw new Error(`${source}: provides."${extname}".${flag} must be a boolean`);
      }
      provide[flag] = value[flag] as boolean;
    }
  }

  if (value.grants !== undefined) {
    if (!Array.isArray(value.grants)) {
      throw new Error(`${source}: provides."${extname}".grants must be an array`);
    }
    provide.grants = value.grants.map((g, i) => validateGrant(extname, g, i, source));
  }

  return provide;
}

function validateGrant(extname: string, value: unknown, index: number, source: string): ExtensionGrant {
  const where = `provides."${extname}".grants[${index}]`;
  if (!isPlainObject(value)) {
    throw new Error(`${source}: ${where} must be an object`);
  }
  if (typeof value.privileges !== 'string' || !value.privileges.trim()) {
    throw new Error(`${source}: ${where}.privileges must be a non-empty string`);
  }
  if (typeof value.on !== 'string' || !GRANT_TARGETS.has(value.on)) {
    throw new Error(
      `${source}: ${where}.on must be one of ${[...GRANT_TARGETS].join(', ')}`
    );
  }
  const toValid =
    (typeof value.to === 'string' && value.to.trim()) ||
    (Array.isArray(value.to) && value.to.length > 0 && value.to.every((r) => typeof r === 'string' && r.trim()));
  if (!toValid) {
    throw new Error(`${source}: ${where}.to must be a role name or non-empty array of role names`);
  }
  return {
    privileges: value.privileges as string,
    on: value.on as ExtensionGrantTarget,
    to: value.to as string | string[]
  };
}

/**
 * Read + validate the `extensions.json` (or `pgpm.extensions.json`) manifest for
 * a module directory. Returns `undefined` when the module declares no manifest.
 */
export function readExtensionsManifest(moduleDir: string): ExtensionsManifest | undefined {
  for (const file of EXTENSIONS_MANIFEST_FILES) {
    const p = join(moduleDir, file);
    if (existsSync(p)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(p, 'utf-8'));
      } catch (e: any) {
        throw new Error(`Failed to parse ${file} at ${moduleDir}: ${e.message}`);
      }
      return validateExtensionsManifest(parsed, file);
    }
  }
  return undefined;
}
