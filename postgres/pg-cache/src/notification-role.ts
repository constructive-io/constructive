import type { Pool, PoolClient, QueryResult } from 'pg';

export const PG_NOTIFICATION_ROLE_AUDIT_VERSION = 'pg-notification-role:v1';
export const PG_NOTIFICATION_ROLE_UNSAFE_ERROR_CODE = 'PG_NOTIFICATION_ROLE_UNSAFE';
export const PG_NOTIFICATION_ROLE_CONTRACT_ERROR_CODE =
  'PG_NOTIFICATION_ROLE_CONTRACT_INVALID';

export type PgNotificationRoleViolationCode =
  | 'LOGIN_ROLE_MISMATCH'
  | 'CURRENT_ROLE_MISMATCH'
  | 'DATABASE_MISMATCH'
  | 'LOGIN_REQUIRED'
  | 'NOINHERIT_REQUIRED'
  | 'SUPERUSER'
  | 'BYPASSRLS'
  | 'CREATEROLE'
  | 'CREATEDB'
  | 'REPLICATION'
  | 'ROLE_MEMBERSHIP'
  | 'TARGET_DATABASE_MISSING'
  | 'TARGET_CONNECT_REQUIRED'
  | 'CROSS_DATABASE_CONNECT'
  | 'DATABASE_OWNER'
  | 'DATABASE_CREATE'
  | 'DATABASE_TEMP'
  | 'SCHEMA_OWNER'
  | 'SCHEMA_CREATE'
  | 'SCHEMA_USAGE'
  | 'RELATION_PRIVILEGE'
  | 'FUNCTION_PRIVILEGE'
  | 'SEQUENCE_PRIVILEGE'
  | 'AUDIT_NO_RESULT';

/** Credential-free identity expected from one dedicated listener login. */
export interface PgNotificationRoleContract {
  role: string;
  database: string;
}

/** Safe to persist in diagnostics: connection secrets/config are never copied. */
export interface PgNotificationRoleAudit {
  version: typeof PG_NOTIFICATION_ROLE_AUDIT_VERSION;
  role: string;
  database: string;
  safe: boolean;
  violations: readonly PgNotificationRoleViolationCode[];
}

/** Catalog-query capability used by the broker's pinned LISTEN client. */
export type PgNotificationRoleClient = Pick<PoolClient, 'query'>;

interface PgNotificationRoleAuditRow {
  expected_role: string;
  session_role: string;
  active_role: string;
  active_database: string;
  rolcanlogin: boolean;
  rolinherit: boolean;
  rolsuper: boolean;
  rolbypassrls: boolean;
  rolcreaterole: boolean;
  rolcreatedb: boolean;
  rolreplication: boolean;
  membership_count: number;
  target_database_exists: boolean;
  target_connect: boolean;
  other_database_connect_count: number;
  target_database_owner: boolean;
  target_database_create: boolean;
  target_database_temp: boolean;
  schema_owner_count: number;
  schema_create_count: number;
  schema_usage_count: number;
  relation_privilege_count: number;
  function_privilege_count: number;
  sequence_privilege_count: number;
}

/**
 * Audit only the session login's effective privileges. PostgreSQL system
 * schemas/objects are excluded because ordinary logins necessarily use the
 * catalog; every non-system schema and object remains in scope.
 */
export const PG_NOTIFICATION_ROLE_AUDIT_SQL = `
WITH login_role AS MATERIALIZED (
  SELECT r.oid, r.rolname, r.rolcanlogin, r.rolinherit, r.rolsuper,
         r.rolbypassrls, r.rolcreaterole, r.rolcreatedb, r.rolreplication
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = session_user
), target_database AS MATERIALIZED (
  SELECT d.oid, d.datname, d.datdba
  FROM pg_catalog.pg_database d
  WHERE d.datname = $2::text
), application_schemas AS MATERIALIZED (
  SELECT n.oid, n.nspname, n.nspowner
  FROM pg_catalog.pg_namespace n
  WHERE n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
)
SELECT $1::text AS expected_role,
       session_user AS session_role,
       current_user AS active_role,
       pg_catalog.current_database() AS active_database,
       r.rolcanlogin,
       r.rolinherit,
       r.rolsuper,
       r.rolbypassrls,
       r.rolcreaterole,
       r.rolcreatedb,
       r.rolreplication,
       (
         SELECT count(*)::int
         FROM pg_catalog.pg_auth_members membership
         WHERE membership.member = r.oid OR membership.roleid = r.oid
       ) AS membership_count,
       (target.oid IS NOT NULL) AS target_database_exists,
       COALESCE(
         pg_catalog.has_database_privilege(r.rolname, target.oid, 'CONNECT'),
         false
       ) AS target_connect,
       (
         SELECT count(*)::int
         FROM pg_catalog.pg_database database_record
         WHERE database_record.datname <> $2::text
           AND pg_catalog.has_database_privilege(
             r.rolname,
             database_record.oid,
             'CONNECT'
           )
       ) AS other_database_connect_count,
       COALESCE(target.datdba = r.oid, false) AS target_database_owner,
       COALESCE(
         pg_catalog.has_database_privilege(r.rolname, target.oid, 'CREATE'),
         false
       ) AS target_database_create,
       COALESCE(
         pg_catalog.has_database_privilege(r.rolname, target.oid, 'TEMP'),
         false
       ) AS target_database_temp,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         WHERE schema_record.nspowner = r.oid
       ) AS schema_owner_count,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         WHERE pg_catalog.has_schema_privilege(
           r.rolname,
           schema_record.oid,
           'CREATE'
         )
       ) AS schema_create_count,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         WHERE pg_catalog.has_schema_privilege(
           r.rolname,
           schema_record.oid,
           'USAGE'
         )
       ) AS schema_usage_count,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         INNER JOIN pg_catalog.pg_class relation
           ON relation.relnamespace = schema_record.oid
         WHERE CASE WHEN relation.relkind IN ('r', 'p', 'v', 'm', 'f')
           THEN pg_catalog.has_table_privilege(
             r.rolname,
             relation.oid,
             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
           )
           OR pg_catalog.has_any_column_privilege(
             r.rolname,
             relation.oid,
             'SELECT,INSERT,UPDATE,REFERENCES'
           )
           ELSE false
         END
       ) AS relation_privilege_count,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         INNER JOIN pg_catalog.pg_proc routine
           ON routine.pronamespace = schema_record.oid
         WHERE pg_catalog.has_function_privilege(
           r.rolname,
           routine.oid,
           'EXECUTE'
         )
       ) AS function_privilege_count,
       (
         SELECT count(*)::int
         FROM application_schemas schema_record
         INNER JOIN pg_catalog.pg_class sequence_record
           ON sequence_record.relnamespace = schema_record.oid
         WHERE CASE WHEN sequence_record.relkind = 'S'
           THEN pg_catalog.has_sequence_privilege(
             r.rolname,
             sequence_record.oid,
             'USAGE,SELECT,UPDATE'
           )
           ELSE false
         END
       ) AS sequence_privilege_count
FROM login_role r
LEFT JOIN target_database target ON true
`;

const containsUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const assertIdentifier = (kind: 'role' | 'database', value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PgNotificationRoleContractError(`${kind} must be a non-empty string`);
  }
  if (value.includes('\0') || containsUnpairedSurrogate(value)) {
    throw new PgNotificationRoleContractError(`${kind} is not a valid PostgreSQL name`);
  }
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes > 63) {
    throw new PgNotificationRoleContractError(
      `${kind} is ${bytes} UTF-8 bytes; PostgreSQL allows at most 63`
    );
  }
  return value;
};

const normalizeContract = (
  contract: PgNotificationRoleContract
): Readonly<PgNotificationRoleContract> => Object.freeze({
  role: assertIdentifier('role', contract?.role),
  database: assertIdentifier('database', contract?.database)
});

export class PgNotificationRoleContractError extends Error {
  readonly code = PG_NOTIFICATION_ROLE_CONTRACT_ERROR_CODE;

  constructor(reason: string) {
    super(`Invalid PostgreSQL notification-role contract: ${reason}`);
    this.name = 'PgNotificationRoleContractError';
  }
}

export class UnsafePgNotificationRoleError extends Error {
  readonly code = PG_NOTIFICATION_ROLE_UNSAFE_ERROR_CODE;

  constructor(
    readonly audit: PgNotificationRoleAudit
  ) {
    super(
      `PostgreSQL notification role ${JSON.stringify(audit.role)} for database `
      + `${JSON.stringify(audit.database)} is unsafe: ${audit.violations.join(',')}`
    );
    this.name = 'UnsafePgNotificationRoleError';
  }
}

/**
 * Enforce a one-to-one role/database mapping without accepting connection
 * config. Exact duplicate pairs are collapsed for multi-generation reuse.
 */
export const normalizePgNotificationRoleContracts = (
  contracts: readonly PgNotificationRoleContract[]
): readonly Readonly<PgNotificationRoleContract>[] => {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    throw new PgNotificationRoleContractError('at least one role/database pair is required');
  }
  const byDatabase = new Map<string, string>();
  const byRole = new Map<string, string>();
  const unique = new Map<string, Readonly<PgNotificationRoleContract>>();
  for (const candidate of contracts) {
    const contract = normalizeContract(candidate);
    const databaseRole = byDatabase.get(contract.database);
    if (databaseRole && databaseRole !== contract.role) {
      throw new PgNotificationRoleContractError(
        `database ${JSON.stringify(contract.database)} maps to multiple login roles`
      );
    }
    const roleDatabase = byRole.get(contract.role);
    if (roleDatabase && roleDatabase !== contract.database) {
      throw new PgNotificationRoleContractError(
        `login role ${JSON.stringify(contract.role)} maps to multiple databases`
      );
    }
    byDatabase.set(contract.database, contract.role);
    byRole.set(contract.role, contract.database);
    unique.set(`${contract.database}\0${contract.role}`, contract);
  }
  return Object.freeze(
    [...unique.values()].sort((left, right) => {
      if (left.database !== right.database) {
        return left.database < right.database ? -1 : 1;
      }
      if (left.role === right.role) return 0;
      return left.role < right.role ? -1 : 1;
    })
  );
};

const violationCodes = (
  row: PgNotificationRoleAuditRow | undefined,
  contract: Readonly<PgNotificationRoleContract>
): PgNotificationRoleViolationCode[] => {
  if (!row) return ['AUDIT_NO_RESULT'];
  const violations: PgNotificationRoleViolationCode[] = [];
  if (row.session_role !== contract.role) violations.push('LOGIN_ROLE_MISMATCH');
  if (row.active_role !== row.session_role) violations.push('CURRENT_ROLE_MISMATCH');
  if (row.active_database !== contract.database) violations.push('DATABASE_MISMATCH');
  if (!row.rolcanlogin) violations.push('LOGIN_REQUIRED');
  if (row.rolinherit) violations.push('NOINHERIT_REQUIRED');
  if (row.rolsuper) violations.push('SUPERUSER');
  if (row.rolbypassrls) violations.push('BYPASSRLS');
  if (row.rolcreaterole) violations.push('CREATEROLE');
  if (row.rolcreatedb) violations.push('CREATEDB');
  if (row.rolreplication) violations.push('REPLICATION');
  if (row.membership_count > 0) violations.push('ROLE_MEMBERSHIP');
  if (!row.target_database_exists) violations.push('TARGET_DATABASE_MISSING');
  if (!row.target_connect) violations.push('TARGET_CONNECT_REQUIRED');
  if (row.other_database_connect_count > 0) violations.push('CROSS_DATABASE_CONNECT');
  if (row.target_database_owner) violations.push('DATABASE_OWNER');
  if (row.target_database_create) violations.push('DATABASE_CREATE');
  if (row.target_database_temp) violations.push('DATABASE_TEMP');
  if (row.schema_owner_count > 0) violations.push('SCHEMA_OWNER');
  if (row.schema_create_count > 0) violations.push('SCHEMA_CREATE');
  if (row.schema_usage_count > 0) violations.push('SCHEMA_USAGE');
  if (row.relation_privilege_count > 0) violations.push('RELATION_PRIVILEGE');
  if (row.function_privilege_count > 0) violations.push('FUNCTION_PRIVILEGE');
  if (row.sequence_privilege_count > 0) violations.push('SEQUENCE_PRIVILEGE');
  return violations;
};

/** Execute one fresh audit on an already-owned client without releasing it. */
export const auditPgNotificationRoleClient = async (
  client: PgNotificationRoleClient,
  candidate: PgNotificationRoleContract
): Promise<PgNotificationRoleAudit> => {
  const contract = normalizeContract(candidate);
  let inTransaction = false;
  let result: QueryResult<PgNotificationRoleAuditRow>;
  try {
    await client.query('BEGIN READ ONLY');
    inTransaction = true;
    await client.query('SET LOCAL jit TO off');
    result = await client.query<PgNotificationRoleAuditRow>(
      PG_NOTIFICATION_ROLE_AUDIT_SQL,
      [contract.role, contract.database]
    );
    await client.query('COMMIT');
    inTransaction = false;
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the catalog-audit failure; the owning broker destroys the client.
      }
    }
    throw error;
  }

  const violations = Object.freeze(violationCodes(result.rows[0], contract));
  return Object.freeze({
    version: PG_NOTIFICATION_ROLE_AUDIT_VERSION,
    role: contract.role,
    database: contract.database,
    safe: violations.length === 0,
    violations
  });
};

/** Execute one fresh, read-only catalog audit. Successful results are not cached. */
export const auditPgNotificationRole = async (
  pool: Pool,
  candidate: PgNotificationRoleContract
): Promise<PgNotificationRoleAudit> => {
  const client: PoolClient = await pool.connect();
  let destroyClient = false;
  try {
    return await auditPgNotificationRoleClient(client, candidate);
  } catch (error) {
    destroyClient = true;
    throw error;
  } finally {
    client.release(destroyClient);
  }
};

/** Fail closed on a pinned client without exposing general query access. */
export const assertPgNotificationRoleClient = async (
  client: PgNotificationRoleClient,
  contract: PgNotificationRoleContract
): Promise<PgNotificationRoleAudit> => {
  const audit = await auditPgNotificationRoleClient(client, contract);
  if (!audit.safe) throw new UnsafePgNotificationRoleError(audit);
  return audit;
};

/** Fail closed with a stable code while retaining a credential-free audit. */
export const assertPgNotificationRole = async (
  pool: Pool,
  contract: PgNotificationRoleContract
): Promise<PgNotificationRoleAudit> => {
  const audit = await auditPgNotificationRole(pool, contract);
  if (!audit.safe) throw new UnsafePgNotificationRoleError(audit);
  return audit;
};
