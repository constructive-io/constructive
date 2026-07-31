/**
 * PGPM naming spec v1 — canonical, derived change paths.
 *
 * A change path is never authored and never identity: it is a pure projection
 * of an object's identity through this spec. Objects (content-addressed ASTs
 * + dependency edges) are the source of truth; paths are re-derivable at any
 * time, so regrouping, renaming schemes, or repartitioning packages can never
 * break identity-keyed consumers (diff, dependency resolution).
 *
 * The identity itself is produced upstream (`identityOf` in
 * `@pgsql/transform`, a pure function of classifier facts). This package only
 * renders identities to paths; the `ObjectIdentity` shape below is
 * structurally identical to the upstream type, so either can be passed.
 *
 * Canonical templates (the conventions used across constructive-db deploy
 * trees):
 *
 *   schema     schemas/{schema}/schema
 *   table      schemas/{schema}/tables/{table}/table
 *   trigger    schemas/{schema}/tables/{table}/triggers/{name}
 *   policy     schemas/{schema}/tables/{table}/policies/{name}
 *   index      schemas/{schema}/tables/{table}/indexes/{name}
 *   constraint schemas/{schema}/tables/{table}/constraints/{name}
 *   seed_dml   schemas/{schema}/tables/{table}/fixtures/{name}
 *   function   schemas/{schema}/procedures/{name}
 *   view       schemas/{schema}/views/{name}
 *   type       schemas/{schema}/types/{name}
 *   sequence   schemas/{schema}/sequences/{name}
 *   extension  extensions/{name}
 *   role       roles/{name}
 */

/** Spec version, so bundles/modules can declare which scheme derived their paths. */
export const PGPM_NAMING_SPEC_VERSION = 1;

/** The kinds of objects the naming spec assigns paths to. */
export type ObjectIdentityKind =
  | 'schema'
  | 'extension'
  | 'role'
  | 'table'
  | 'view'
  | 'sequence'
  | 'type'
  | 'function'
  | 'index'
  | 'trigger'
  | 'policy'
  | 'constraint'
  | 'seed_dml'
  | 'other';

/**
 * The identity of a database object — what a change path is derived from.
 * Structurally identical to `ObjectIdentity` in `@pgsql/transform`.
 */
export interface ObjectIdentity {
  kind: ObjectIdentityKind;
  /** Owning schema (`null` for non-schema objects: roles, extensions). */
  schema: string | null;
  /** Object name, unqualified (for table-scoped kinds: without the table). */
  name: string;
  /** Owning table, for objects only unique per table (trigger/policy/index/constraint/seed). */
  table?: string;
}

/** Kinds whose objects are scoped to (and only unique within) a table. */
const TABLE_SCOPED = new Set<ObjectIdentityKind>([
  'trigger',
  'policy',
  'index',
  'constraint',
  'seed_dml'
]);

/** Directory names for schema-scoped object kinds. */
const SCHEMA_DIRS: Partial<Record<ObjectIdentityKind, string>> = {
  view: 'views',
  sequence: 'sequences',
  type: 'types',
  function: 'procedures'
};

/** Directory names for table-scoped object kinds. */
const TABLE_DIRS: Partial<Record<ObjectIdentityKind, string>> = {
  trigger: 'triggers',
  policy: 'policies',
  index: 'indexes',
  constraint: 'constraints',
  seed_dml: 'fixtures'
};

/**
 * Render an identity to its canonical pgpm change path (naming spec v1).
 * Total and deterministic: every identity gets exactly one path.
 */
export function pathFor(identity: ObjectIdentity): string {
  const { kind, name } = identity;
  const schema = identity.schema ?? 'public';

  if (kind === 'schema') return `schemas/${name}/schema`;
  if (kind === 'extension') return `extensions/${name}`;
  if (kind === 'role') return `roles/${name}`;
  if (kind === 'table') return `schemas/${schema}/tables/${name}/table`;

  if (TABLE_SCOPED.has(kind)) {
    const dir = TABLE_DIRS[kind]!;
    return `schemas/${schema}/tables/${identity.table ?? name}/${dir}/${name}`;
  }

  const dir = SCHEMA_DIRS[kind];
  if (dir) return `schemas/${schema}/${dir}/${name}`;
  return `schemas/${schema}/objects/${name}`;
}
