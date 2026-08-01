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
 * The reference implementation of these templates is constructive-db's
 * `db_deps` SQL package (`db_deps.table_deps`, `db_deps.column_deps`,
 * `db_deps.next_alteration`, ...); this package is the TypeScript rendering
 * of the same spec, so paths derived in SQL and in TS agree byte-for-byte.
 *
 * Canonical templates (naming spec v1, `directory` style — matching
 * `db_deps.*` and the generated `application/constructive` plan):
 *
 *   schema     schemas/{schema}/schema
 *   table      schemas/{schema}/tables/{table}/table
 *   column     schemas/{schema}/tables/{table}/columns/{name}/column
 *   constraint schemas/{schema}/tables/{table}/constraints/{name}/constraint
 *   policy     schemas/{schema}/tables/{table}/policies/{name}/policy
 *   rls        schemas/{schema}/tables/{table}/policies/enable_row_level_security
 *   trigger    schemas/{schema}/tables/{table}/triggers/{name}
 *   index      schemas/{schema}/tables/{table}/indexes/{name}
 *   seed_dml   schemas/{schema}/tables/{table}/fixtures/{name}
 *   function   schemas/{schema}/procedures/{name}/procedure
 *   view       schemas/{schema}/views/{name}/view
 *   type       schemas/{schema}/types/{name}
 *   sequence   schemas/{schema}/sequences/{name}
 *   extension  extensions/{name}
 *   role       roles/{name}
 *
 * `flat` style drops the trailing kind token for functions/views/columns/
 * constraints/policies (`schemas/{s}/procedures/{n}`) — the convention used
 * by hand-authored constructive-db packages (`db_deps.fn_deps`).
 *
 * Conflicts/re-alterations: when the same object is altered again, the spec
 * appends a monotonically numbered alteration segment (`db_deps.next_alteration`):
 * `<parent>/alterations/alt0000000042` — see {@link alterationPathFor}.
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
  | 'column'
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

/**
 * Rendering style.
 *
 * - `directory` — every object is a directory closed by a kind token
 *   (`.../procedures/{n}/procedure`), as produced by `db_deps.*` and the
 *   generated `application/constructive` plan. The default.
 * - `flat` — schema-scoped objects are leaf files (`.../procedures/{n}`),
 *   as used by hand-authored constructive-db packages.
 */
export type PathStyle = 'directory' | 'flat';

export interface PathForOptions {
  style?: PathStyle;
}

/** Kinds whose objects are scoped to (and only unique within) a table. */
const TABLE_SCOPED = new Set<ObjectIdentityKind>([
  'trigger',
  'policy',
  'index',
  'column',
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
  column: 'columns',
  constraint: 'constraints',
  seed_dml: 'fixtures'
};

/** Trailing kind tokens in `directory` style (mirrors `db_deps.*_deps`). */
const KIND_TOKENS: Partial<Record<ObjectIdentityKind, string>> = {
  function: 'procedure',
  view: 'view',
  policy: 'policy',
  column: 'column',
  constraint: 'constraint'
};

/**
 * Render an identity to its canonical pgpm change path (naming spec v1).
 * Total and deterministic: every identity gets exactly one path per style.
 */
export function pathFor(identity: ObjectIdentity, options: PathForOptions = {}): string {
  const style = options.style ?? 'directory';
  const { kind, name } = identity;
  const schema = identity.schema ?? 'public';
  const token = style === 'directory' ? KIND_TOKENS[kind] : undefined;

  if (kind === 'schema') return `schemas/${name}/schema`;
  if (kind === 'extension') return `extensions/${name}`;
  if (kind === 'role') return `roles/${name}`;
  if (kind === 'table') return `schemas/${schema}/tables/${name}/table`;

  if (TABLE_SCOPED.has(kind)) {
    const dir = TABLE_DIRS[kind]!;
    const base = `schemas/${schema}/tables/${identity.table ?? name}/${dir}/${name}`;
    return token ? `${base}/${token}` : base;
  }

  const dir = SCHEMA_DIRS[kind];
  if (dir) {
    const base = `schemas/${schema}/${dir}/${name}`;
    return token ? `${base}/${token}` : base;
  }
  return `schemas/${schema}/objects/${name}`;
}

/**
 * Path for the nth re-alteration of an object (the conflict convention):
 * `<parent>/alterations/alt0000000042`, mirroring `db_deps.next_alteration`.
 * Any existing alteration suffix on `parent` is stripped first, so the same
 * parent can be renumbered. Sequencing (the counter) is the caller's state;
 * this renders deterministically from `(parent, n)`.
 */
export function alterationPathFor(parent: string, n: number, prefix = 'alt'): string {
  const stripped = parent.replace(new RegExp(`/alterations/${prefix}[0-9]+$`), '');
  return `${stripped}/alterations/${prefix}${String(n).padStart(10, '0')}`;
}
