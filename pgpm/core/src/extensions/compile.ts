import { ExtensionGrant, ExtensionGrantTarget, ExtensionProvide } from './manifest';

/** Result of compiling one `provides` entry into deployable SQL. */
export interface CompiledExtensionInstall {
  /** Deploy statements, in order (schema, extension, grants). */
  deploy: string[];
  /** Revert statements, in reverse order (drop extension, optionally schema). */
  revert: string[];
  /** Verify statements that error when the install is absent. */
  verify: string[];
}

export interface CompileExtensionInstallOptions {
  /**
   * Optional role-name map applied to grant targets (workspace portability
   * profile). Renames identifiers only — never touches privilege semantics.
   * Special roles (`PUBLIC`, `CURRENT_USER`, `SESSION_USER`) pass through.
   */
  roleMap?: Record<string, string>;
  /**
   * Control-file schema for a fixed-schema (non-relocatable) extension, when
   * known. Used to validate that a `false`-relocatable extension is only
   * "routed" to its own fixed schema.
   */
  fixedSchema?: string | null;
}

const SPECIAL_ROLES: ReadonlySet<string> = new Set(['public', 'current_user', 'session_user']);

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

const routeRole = (role: string, roleMap?: Record<string, string>): string => {
  if (!roleMap) return role;
  if (SPECIAL_ROLES.has(role.toLowerCase())) return role;
  return roleMap[role] ?? role;
};

const grantObjectClause = (on: ExtensionGrantTarget, schema: string): string => {
  const s = quoteIdent(schema);
  switch (on) {
  case 'schema':
    return `SCHEMA ${s}`;
  case 'all-tables':
    return `ALL TABLES IN SCHEMA ${s}`;
  case 'all-sequences':
    return `ALL SEQUENCES IN SCHEMA ${s}`;
  case 'all-functions':
    return `ALL FUNCTIONS IN SCHEMA ${s}`;
  }
};

const grantSql = (
  verb: 'GRANT' | 'REVOKE',
  grant: ExtensionGrant,
  schema: string,
  roleMap?: Record<string, string>
): string => {
  const roles = (Array.isArray(grant.to) ? grant.to : [grant.to])
    .map((r) => routeRole(r, roleMap))
    .join(', ');
  const obj = grantObjectClause(grant.on, schema);
  return verb === 'GRANT'
    ? `GRANT ${grant.privileges} ON ${obj} TO ${roles};`
    : `REVOKE ${grant.privileges} ON ${obj} FROM ${roles};`;
};

/**
 * Compile a single `provides` declaration into deploy / revert / verify SQL.
 *
 * Pure and deterministic: given the same input it returns byte-identical SQL,
 * with no dynamic `EXECUTE`. This is the nuts-and-bolts primitive; wiring it
 * into the deploy path (and eventually into real plan changes exempt from
 * `filterStatements` stripping) composes on top of it.
 */
export function compileExtensionInstall(
  extname: string,
  provide: ExtensionProvide,
  options: CompileExtensionInstallOptions = {}
): CompiledExtensionInstall {
  const { roleMap, fixedSchema } = options;
  const schema = provide.schema === undefined ? null : provide.schema;
  const relocatable = provide.relocatable ?? true;
  const ifNotExists = provide.ifNotExists ?? true;
  const cascade = provide.cascade ?? false;
  const createSchema = provide.createSchema ?? schema !== null;
  const dropSchema = provide.dropSchema ?? false;
  const grants = provide.grants ?? [];

  // A fixed-schema extension can only be placed at its own fixed schema.
  if (!relocatable && schema !== null && fixedSchema != null && schema !== fixedSchema) {
    throw new Error(
      `Extension "${extname}" is non-relocatable (fixed schema "${fixedSchema}") and cannot be installed into "${schema}".`
    );
  }
  if (grants.length > 0 && schema === null) {
    throw new Error(
      `Extension "${extname}" declares grants but no schema; schema-qualified grants require an install schema.`
    );
  }

  const ext = quoteIdent(extname);
  const deploy: string[] = [];
  const revert: string[] = [];
  const verify: string[] = [];

  if (schema !== null && createSchema) {
    deploy.push(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};`);
  }

  const createParts = ['CREATE EXTENSION'];
  if (ifNotExists) createParts.push('IF NOT EXISTS');
  createParts.push(ext);
  if (schema !== null) createParts.push(`WITH SCHEMA ${quoteIdent(schema)}`);
  if (cascade) createParts.push('CASCADE');
  deploy.push(`${createParts.join(' ')};`);

  for (const g of grants) {
    deploy.push(grantSql('GRANT', g, schema as string, roleMap));
  }

  // Revert: drop grants (best-effort), then extension, then optionally schema.
  for (const g of [...grants].reverse()) {
    revert.push(grantSql('REVOKE', g, schema as string, roleMap));
  }
  revert.push(`DROP EXTENSION IF EXISTS ${ext};`);
  if (schema !== null && createSchema && dropSchema) {
    revert.push(`DROP SCHEMA IF EXISTS ${quoteIdent(schema)};`);
  }

  // Verify: assert the extension exists in the expected namespace.
  if (schema !== null) {
    verify.push(
      [
        'SELECT 1 / count(*)::int AS ok',
        'FROM pg_catalog.pg_extension e',
        'JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace',
        `WHERE e.extname = ${quoteLiteral(extname)} AND n.nspname = ${quoteLiteral(schema)};`
      ].join('\n')
    );
  } else {
    verify.push(
      [
        'SELECT 1 / count(*)::int AS ok',
        'FROM pg_catalog.pg_extension e',
        `WHERE e.extname = ${quoteLiteral(extname)};`
      ].join('\n')
    );
  }

  return { deploy, revert, verify };
}

const quoteLiteral = (s: string): string => `'${s.replace(/'/g, "''")}'`;

/** Compile every `provides` entry in a manifest, keyed by extension name. */
export function compileExtensionInstalls(
  provides: Record<string, ExtensionProvide>,
  options: CompileExtensionInstallOptions = {}
): Record<string, CompiledExtensionInstall> {
  const out: Record<string, CompiledExtensionInstall> = {};
  for (const [extname, provide] of Object.entries(provides)) {
    out[extname] = compileExtensionInstall(extname, provide, options);
  }
  return out;
}
