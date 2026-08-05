import { performance } from 'node:perf_hooks';

import type { Pool, PoolClient, QueryResult } from 'pg';

export const RUNTIME_ROLE_SAFETY_SQL = `
WITH RECURSIVE execution_roles AS (
  SELECT r.oid, r.rolname
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = current_user
     OR r.rolname = ANY($1::text[])
), execution_role_reachability AS MATERIALIZED (
  SELECT execution_role.oid AS execution_role_oid,
         execution_role.rolname AS execution_role_name,
         candidate.oid AS reachable_role_oid,
         candidate.rolname AS reachable_role_name,
         pg_catalog.pg_has_role(execution_role.oid, candidate.oid, 'USAGE')
           AS via_usage,
         pg_catalog.pg_has_role(execution_role.oid, candidate.oid, 'SET')
           AS via_set
  FROM execution_roles execution_role
  INNER JOIN pg_catalog.pg_roles candidate
    ON candidate.oid = execution_role.oid
    OR pg_catalog.pg_has_role(execution_role.oid, candidate.oid, 'USAGE')
    OR pg_catalog.pg_has_role(execution_role.oid, candidate.oid, 'SET')
), accessible_roles AS (
  SELECT r.oid, r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreaterole,
         r.rolcreatedb, r.rolreplication, r.rolinherit
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = current_user
     OR r.rolname = ANY($1::text[])
     OR pg_catalog.pg_has_role(current_user, r.oid, 'USAGE')
     OR pg_catalog.pg_has_role(current_user, r.oid, 'SET')
     OR EXISTS (
       SELECT 1
       FROM execution_role_reachability reachable
       WHERE reachable.reachable_role_oid = r.oid
     )
), exposed_schemas AS (
  SELECT n.oid, n.nspname, n.nspowner
  FROM pg_catalog.pg_namespace n
  WHERE n.nspname = ANY($2::text[])
), approved_schemas AS (
  SELECT n.oid, n.nspname, n.nspowner
  FROM pg_catalog.pg_namespace n
  WHERE n.nspname = ANY($2::text[] || $3::text[])
), current_database_record AS (
  SELECT d.oid, d.datname, d.datdba
  FROM pg_catalog.pg_database d
  WHERE d.datname = pg_catalog.current_database()
), unapproved_schema_access AS MATERIALIZED (
  SELECT r.oid AS role_oid, r.rolname, n.oid AS namespace_oid, n.nspname,
         n.nspowner = r.oid AS is_owner,
         pg_catalog.has_schema_privilege(r.rolname, n.oid, 'CREATE') AS can_create,
         pg_catalog.has_schema_privilege(r.rolname, n.oid, 'USAGE') AS can_use
  FROM accessible_roles r
  INNER JOIN pg_catalog.pg_namespace n ON true
  WHERE n.nspname <> 'information_schema'
    AND n.nspname NOT LIKE 'pg\\_%'
    AND NOT EXISTS (SELECT 1 FROM approved_schemas a WHERE a.oid = n.oid)
    AND (
      n.nspowner = r.oid
      OR pg_catalog.has_schema_privilege(r.rolname, n.oid, 'CREATE')
      OR pg_catalog.has_schema_privilege(r.rolname, n.oid, 'USAGE')
    )
), login_role_violations AS (
  SELECT array_remove(ARRAY[
    CASE WHEN rolinherit THEN 'INHERIT' END
  ], NULL) AS capabilities
  FROM accessible_roles
  WHERE rolname = current_user AND rolinherit
), inherited_role_violations AS (
  SELECT r.rolname
  FROM pg_catalog.pg_roles r
  WHERE r.rolname <> current_user
    AND pg_catalog.pg_has_role(current_user, r.oid, 'USAGE')
), unexpected_set_role_violations AS (
  SELECT r.rolname
  FROM pg_catalog.pg_roles r
  WHERE r.rolname <> current_user
    AND NOT (r.rolname = ANY($1::text[]))
    AND pg_catalog.pg_has_role(current_user, r.oid, 'SET')
), request_role_reachability_violations AS (
  SELECT reachable.execution_role_name AS request_role,
         reachable.reachable_role_name AS reachable_role,
         reachable.via_usage,
         reachable.via_set
  FROM execution_role_reachability reachable
  WHERE reachable.execution_role_name = ANY($1::text[])
    AND reachable.execution_role_oid <> reachable.reachable_role_oid
), role_violations AS (
  SELECT rolname,
         array_remove(ARRAY[
           CASE WHEN rolsuper THEN 'SUPERUSER' END,
           CASE WHEN rolbypassrls THEN 'BYPASSRLS' END,
           CASE WHEN rolcreaterole THEN 'CREATEROLE' END,
           CASE WHEN rolcreatedb THEN 'CREATEDB' END,
           CASE WHEN rolreplication THEN 'REPLICATION' END
         ], NULL) AS capabilities
  FROM accessible_roles
  WHERE rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication
), database_violations AS (
  SELECT r.rolname, d.datname, violation.capability
  FROM accessible_roles r
  INNER JOIN current_database_record d ON true
  CROSS JOIN LATERAL (
    VALUES
      ('OWNER'::text, d.datdba = r.oid),
      ('CREATE'::text, pg_catalog.has_database_privilege(r.rolname, d.oid, 'CREATE')),
      ('TEMP'::text, pg_catalog.has_database_privilege(r.rolname, d.oid, 'TEMP'))
  ) AS violation(capability, present)
  WHERE violation.present
), cross_database_violations AS (
  SELECT r.rolname, d.datname
  FROM accessible_roles r
  INNER JOIN current_database_record current_database ON true
  INNER JOIN pg_catalog.pg_database d ON d.oid <> current_database.oid
  WHERE pg_catalog.has_database_privilege(r.rolname, d.oid, 'CONNECT')
), schema_violations AS (
  SELECT r.rolname, n.nspname,
         CASE WHEN n.nspowner = r.oid THEN 'OWNER' ELSE 'CREATE' END AS capability
  FROM accessible_roles r
  INNER JOIN approved_schemas n ON true
  WHERE n.nspowner = r.oid
     OR pg_catalog.has_schema_privilege(r.rolname, n.nspname, 'CREATE')
), cross_schema_violations AS (
  SELECT access.rolname, access.nspname,
         array_remove(ARRAY[
           CASE WHEN access.can_create OR access.is_owner THEN 'CREATE/OWNER' END,
           CASE WHEN EXISTS (
             SELECT 1
             FROM pg_catalog.pg_class c
             WHERE c.relnamespace = access.namespace_oid
               AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
               AND pg_catalog.has_table_privilege(
                 access.rolname,
                 c.oid,
                 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
               )
           ) AND access.can_use
             THEN 'RELATION' END,
           CASE WHEN EXISTS (
             SELECT 1
             FROM pg_catalog.pg_class c
             WHERE c.relnamespace = access.namespace_oid
               AND CASE WHEN c.relkind = 'S'
                 THEN pg_catalog.has_sequence_privilege(
                   access.rolname,
                   c.oid,
                   'USAGE,SELECT,UPDATE'
                 )
                 ELSE false
               END
           ) AND access.can_use
             THEN 'SEQUENCE' END,
           CASE WHEN EXISTS (
             SELECT 1
             FROM pg_catalog.pg_proc p
             WHERE p.pronamespace = access.namespace_oid
               AND pg_catalog.has_function_privilege(access.rolname, p.oid, 'EXECUTE')
           ) AND access.can_use
             THEN 'FUNCTION' END,
           CASE WHEN EXISTS (
             SELECT 1
             FROM pg_catalog.pg_type t
             WHERE t.typnamespace = access.namespace_oid
               AND pg_catalog.has_type_privilege(access.rolname, t.oid, 'USAGE')
           ) AND access.can_use
             THEN 'TYPE' END
         ], NULL) AS capabilities
  FROM unapproved_schema_access access
  WHERE access.can_create
    OR access.is_owner
    OR (
      access.can_use
      AND (
        EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class c
          WHERE c.relnamespace = access.namespace_oid
            AND (
              (c.relkind IN ('r', 'p', 'v', 'm', 'f') AND pg_catalog.has_table_privilege(
                access.rolname,
                c.oid,
                'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
              ))
              OR CASE WHEN c.relkind = 'S'
                THEN pg_catalog.has_sequence_privilege(
                  access.rolname,
                  c.oid,
                  'USAGE,SELECT,UPDATE'
                )
                ELSE false
              END
            )
        )
        OR EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc p
          WHERE p.pronamespace = access.namespace_oid
            AND pg_catalog.has_function_privilege(access.rolname, p.oid, 'EXECUTE')
        )
        OR EXISTS (
          SELECT 1
          FROM pg_catalog.pg_type t
          WHERE t.typnamespace = access.namespace_oid
            AND pg_catalog.has_type_privilege(access.rolname, t.oid, 'USAGE')
        )
      )
    )
), object_owner_violations AS (
  SELECT r.rolname, n.nspname, c.relname AS object_name,
         CASE c.relkind
           WHEN 'S' THEN 'SEQUENCE'
           WHEN 'v' THEN 'VIEW'
           WHEN 'm' THEN 'MATERIALIZED VIEW'
           WHEN 'f' THEN 'FOREIGN TABLE'
           ELSE 'RELATION'
         END AS object_kind
  FROM accessible_roles r
  INNER JOIN approved_schemas n ON true
  INNER JOIN pg_catalog.pg_class c
    ON c.relnamespace = n.oid AND c.relowner = r.oid

  UNION ALL

  SELECT r.rolname, n.nspname, p.proname, 'FUNCTION'
  FROM accessible_roles r
  INNER JOIN approved_schemas n ON true
  INNER JOIN pg_catalog.pg_proc p
    ON p.pronamespace = n.oid AND p.proowner = r.oid

  UNION ALL

  SELECT r.rolname, n.nspname, t.typname, 'TYPE'
  FROM accessible_roles r
  INNER JOIN approved_schemas n ON true
  INNER JOIN pg_catalog.pg_type t
    ON t.typnamespace = n.oid AND t.typowner = r.oid
), stored_expression_roots AS (
  SELECT 'pg_catalog.pg_trigger'::regclass::oid AS root_class,
         trigger.oid AS root_id,
         namespace.nspname,
         class.relname || ':' || trigger.tgname AS object_name
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_class class ON class.relnamespace = namespace.oid
  INNER JOIN pg_catalog.pg_trigger trigger ON trigger.tgrelid = class.oid
  WHERE NOT trigger.tgisinternal

  UNION ALL

  SELECT 'pg_catalog.pg_attrdef'::regclass::oid,
         attribute_default.oid,
         namespace.nspname,
         class.relname || '.' || attribute.attname
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_class class ON class.relnamespace = namespace.oid
  INNER JOIN pg_catalog.pg_attrdef attribute_default ON attribute_default.adrelid = class.oid
  INNER JOIN pg_catalog.pg_attribute attribute
    ON attribute.attrelid = class.oid AND attribute.attnum = attribute_default.adnum

  UNION ALL

  SELECT 'pg_catalog.pg_policy'::regclass::oid,
         policy.oid,
         namespace.nspname,
         class.relname || ':' || policy.polname
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_class class ON class.relnamespace = namespace.oid
  INNER JOIN pg_catalog.pg_policy policy ON policy.polrelid = class.oid

  UNION ALL

  SELECT 'pg_catalog.pg_rewrite'::regclass::oid,
         rewrite.oid,
         namespace.nspname,
         class.relname || ':' || rewrite.rulename
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_class class ON class.relnamespace = namespace.oid
  INNER JOIN pg_catalog.pg_rewrite rewrite ON rewrite.ev_class = class.oid

  UNION ALL

  SELECT 'pg_catalog.pg_constraint'::regclass::oid,
         constraint_record.oid,
         namespace.nspname,
         COALESCE(class.relname || ':', '') || constraint_record.conname
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_constraint constraint_record
    ON constraint_record.connamespace = namespace.oid
  LEFT JOIN pg_catalog.pg_class class ON class.oid = constraint_record.conrelid

  UNION ALL

  SELECT 'pg_catalog.pg_class'::regclass::oid,
         index_class.oid,
         namespace.nspname,
         index_class.relname
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_class index_class
    ON index_class.relnamespace = namespace.oid
    AND index_class.relkind IN ('i', 'I')

  UNION ALL

  SELECT 'pg_catalog.pg_proc'::regclass::oid,
         procedure.oid,
         namespace.nspname,
         procedure.proname
  FROM exposed_schemas namespace
  INNER JOIN pg_catalog.pg_proc procedure ON procedure.pronamespace = namespace.oid
), stored_dependency_closure(
  root_class,
  root_id,
  nspname,
  object_name,
  dependency_class,
  dependency_id
) AS (
  SELECT root.root_class,
         root.root_id,
         root.nspname,
         root.object_name,
         dependency.refclassid,
         dependency.refobjid
  FROM stored_expression_roots root
  INNER JOIN pg_catalog.pg_depend dependency
    ON dependency.classid = root.root_class
    AND dependency.objid = root.root_id
  WHERE dependency.refobjid <> 0

  UNION

  SELECT closure.root_class,
         closure.root_id,
         closure.nspname,
         closure.object_name,
         dependency.refclassid,
         dependency.refobjid
  FROM stored_dependency_closure closure
  INNER JOIN pg_catalog.pg_depend dependency
    ON dependency.classid = closure.dependency_class
    AND dependency.objid = closure.dependency_id
  WHERE dependency.refobjid <> 0
), stored_dependency_violations AS (
  SELECT DISTINCT root.nspname, root.object_name,
         CASE
           WHEN dependency_proc.prosecdef
             THEN 'STORED EXPRESSION CALLS SECURITY DEFINER'
           ELSE 'STORED EXPRESSION CROSSES SCHEMA'
         END AS reason,
         dependency_namespace.nspname || '.' || dependency_proc.proname AS dependency
  FROM stored_dependency_closure root
  INNER JOIN pg_catalog.pg_proc dependency_proc
    ON root.dependency_class = 'pg_catalog.pg_proc'::regclass
    AND dependency_proc.oid = root.dependency_id
  INNER JOIN pg_catalog.pg_namespace dependency_namespace
    ON dependency_namespace.oid = dependency_proc.pronamespace
  WHERE dependency_proc.prosecdef
     OR (
       dependency_namespace.nspname <> 'pg_catalog'
       AND NOT EXISTS (
         SELECT 1 FROM approved_schemas approved
         WHERE approved.oid = dependency_namespace.oid
       )
     )

  UNION

  SELECT DISTINCT root.nspname, root.object_name,
         'STORED EXPRESSION CROSSES SCHEMA',
         dependency_namespace.nspname || '.' || dependency_class.relname
  FROM stored_dependency_closure root
  INNER JOIN pg_catalog.pg_class dependency_class
    ON root.dependency_class = 'pg_catalog.pg_class'::regclass
    AND dependency_class.oid = root.dependency_id
  INNER JOIN pg_catalog.pg_namespace dependency_namespace
    ON dependency_namespace.oid = dependency_class.relnamespace
  WHERE dependency_namespace.nspname <> 'pg_catalog'
    AND NOT EXISTS (
      SELECT 1 FROM approved_schemas approved
      WHERE approved.oid = dependency_namespace.oid
    )
), privileged_object_violations AS (
  SELECT n.nspname, p.proname AS object_name, 'SECURITY DEFINER FUNCTION' AS reason
  FROM approved_schemas n
  INNER JOIN pg_catalog.pg_proc p ON p.pronamespace = n.oid
  WHERE p.prosecdef

  UNION ALL

  SELECT n.nspname, c.relname, 'OWNER-RIGHTS VIEW'
  FROM approved_schemas n
  INNER JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
  WHERE c.relkind = 'v'
    AND NOT COALESCE(c.reloptions @> ARRAY['security_invoker=true'], false)

  UNION ALL

  SELECT n.nspname, c.relname, 'FOREIGN TABLE'
  FROM approved_schemas n
  INNER JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
  WHERE c.relkind = 'f'

  UNION ALL

  SELECT n.nspname, c.relname, 'MATERIALIZED VIEW'
  FROM approved_schemas n
  INNER JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
  WHERE c.relkind = 'm'
)
SELECT current_user AS login_role,
       COALESCE((SELECT json_agg(login_role_violations) FROM login_role_violations), '[]'::json) AS login_role_violations,
       COALESCE((SELECT json_agg(inherited_role_violations) FROM inherited_role_violations), '[]'::json) AS inherited_role_violations,
       COALESCE((SELECT json_agg(unexpected_set_role_violations) FROM unexpected_set_role_violations), '[]'::json) AS unexpected_set_role_violations,
       COALESCE((SELECT json_agg(request_role_reachability_violations) FROM request_role_reachability_violations), '[]'::json) AS request_role_reachability_violations,
       COALESCE((SELECT json_agg(role_violations) FROM role_violations), '[]'::json) AS role_violations,
       COALESCE((SELECT json_agg(database_violations) FROM database_violations), '[]'::json) AS database_violations,
       COALESCE((SELECT json_agg(cross_database_violations) FROM cross_database_violations), '[]'::json) AS cross_database_violations,
       COALESCE((SELECT json_agg(schema_violations) FROM schema_violations), '[]'::json) AS schema_violations,
       COALESCE((SELECT json_agg(cross_schema_violations) FROM cross_schema_violations), '[]'::json) AS cross_schema_violations,
       COALESCE((SELECT json_agg(object_owner_violations) FROM object_owner_violations), '[]'::json) AS object_owner_violations,
       COALESCE((SELECT json_agg(privileged_object_violations) FROM privileged_object_violations), '[]'::json) AS privileged_object_violations,
       COALESCE((SELECT json_agg(stored_dependency_violations) FROM stored_dependency_violations), '[]'::json) AS stored_dependency_violations,
       ARRAY(
         SELECT requested
         FROM unnest($1::text[]) requested
         WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = requested)
       ) AS missing_roles,
       ARRAY(
         SELECT r.rolname::text
         FROM pg_catalog.pg_roles r
         WHERE r.rolname = ANY($1::text[])
           AND r.rolname <> current_user
           AND NOT pg_catalog.pg_has_role(current_user, r.oid, 'SET')
       ) AS inaccessible_roles,
       ARRAY(
         SELECT requested
         FROM unnest($2::text[] || $3::text[]) requested
         WHERE NOT EXISTS (SELECT 1 FROM approved_schemas n WHERE n.nspname = requested)
       ) AS missing_schemas
`;

interface RuntimeRoleSafetyRow {
  login_role: string;
  login_role_violations: Array<{ capabilities: string[] }> | string;
  inherited_role_violations: Array<{ rolname: string }> | string;
  unexpected_set_role_violations: Array<{ rolname: string }> | string;
  request_role_reachability_violations: Array<{
    request_role: string;
    reachable_role: string;
    via_usage: boolean;
    via_set: boolean;
  }> | string;
  role_violations: Array<{ rolname: string; capabilities: string[] }> | string;
  database_violations: Array<{
    rolname: string;
    datname: string;
    capability: string;
  }> | string;
  cross_database_violations: Array<{
    rolname: string;
    datname: string;
  }> | string;
  schema_violations: Array<{ rolname: string; nspname: string; capability: string }> | string;
  cross_schema_violations: Array<{
    rolname: string;
    nspname: string;
    capabilities: string[];
  }> | string;
  object_owner_violations: Array<{
    rolname: string;
    nspname: string;
    object_name: string;
    object_kind: string;
  }> | string;
  privileged_object_violations: Array<{
    nspname: string;
    object_name: string;
    reason: string;
  }> | string;
  stored_dependency_violations: Array<{
    nspname: string;
    object_name: string;
    reason: string;
    dependency: string;
  }> | string;
  missing_roles: string[];
  inaccessible_roles: string[];
  missing_schemas: string[];
}

const parseRequiredJsonColumn = <T>(
  value: T[] | string | null | undefined,
  column: string
): T[] => {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new UnsafeRuntimeRoleError([
        `safety query returned invalid JSON for ${column}`
      ]);
    }
  }
  if (!Array.isArray(parsed)) {
    throw new UnsafeRuntimeRoleError([
      `safety query did not return ${column} as a JSON array`
    ]);
  }
  return parsed as T[];
};

const parseRequiredTextArrayColumn = (
  value: string[] | null | undefined,
  column: string
): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new UnsafeRuntimeRoleError([
      `safety query did not return ${column} as a text array`
    ]);
  }
  return value;
};

export class UnsafeRuntimeRoleError extends Error {
  readonly code = 'GRAPHILE_UNSAFE_RUNTIME_ROLE';

  constructor(readonly violations: string[]) {
    super(`GraphQL runtime role safety check failed: ${violations.join('; ')}`);
    this.name = 'UnsafeRuntimeRoleError';
  }
}

export const assertRuntimeRoleSafety = async (
  pool: Pool,
  requestRoles: string[],
  exposedSchemas: string[],
  dependencySchemas: string[] = []
): Promise<void> => {
  const uniqueRoles = [...new Set(requestRoles.filter(Boolean))];
  const uniqueExposedSchemas = [...new Set(exposedSchemas.filter(Boolean))];
  const uniqueDependencySchemas = [...new Set(
    dependencySchemas.filter((schema) => schema && !uniqueExposedSchemas.includes(schema))
  )];
  const client: PoolClient = await pool.connect();
  let inTransaction = false;
  let destroyClient = false;
  let result: QueryResult<RuntimeRoleSafetyRow>;
  try {
    // Both commands use the simple protocol, so send them together and avoid a
    // second network round trip without changing the read-only transaction or
    // the per-audit JIT policy.
    await client.query('BEGIN READ ONLY; SET LOCAL jit TO off');
    inTransaction = true;
    // The catalog ACL audit has a deliberately broad static plan. On large
    // catalogs PostgreSQL can spend over a second compiling hundreds of JIT
    // functions for a query that executes in milliseconds once compiled.
    result = await client.query<RuntimeRoleSafetyRow>(RUNTIME_ROLE_SAFETY_SQL, [
      uniqueRoles,
      uniqueExposedSchemas,
      uniqueDependencySchemas
    ]);
    await client.query('COMMIT');
    inTransaction = false;
  } catch (error) {
    destroyClient = true;
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the safety-check failure; pg-pool will discard a broken
        // connection through its normal error path.
      }
    }
    throw error;
  } finally {
    client.release(destroyClient);
  }
  const row = result.rows[0];
  if (!row) {
    throw new UnsafeRuntimeRoleError(['safety query returned no result']);
  }

  if (typeof row.login_role !== 'string' || row.login_role.length === 0) {
    throw new UnsafeRuntimeRoleError([
      'safety query did not return a non-empty login_role'
    ]);
  }

  // Every result column participates in the tenant boundary. Treat query/result
  // drift as an unsafe audit instead of interpreting an absent check as an
  // empty violation set.
  const loginRoleViolations = parseRequiredJsonColumn<{
    capabilities: string[];
  }>(row.login_role_violations, 'login_role_violations');
  const inheritedRoleViolations = parseRequiredJsonColumn<{
    rolname: string;
  }>(row.inherited_role_violations, 'inherited_role_violations');
  const databaseViolations = parseRequiredJsonColumn<{
    rolname: string;
    datname: string;
    capability: string;
  }>(row.database_violations, 'database_violations');
  const crossDatabaseViolations = parseRequiredJsonColumn<{
    rolname: string;
    datname: string;
  }>(row.cross_database_violations, 'cross_database_violations');
  const unexpectedSetRoleViolations = parseRequiredJsonColumn<{
    rolname: string;
  }>(row.unexpected_set_role_violations, 'unexpected_set_role_violations');
  const requestRoleReachabilityViolations = parseRequiredJsonColumn<{
    request_role: string;
    reachable_role: string;
    via_usage: boolean;
    via_set: boolean;
  }>(
    row.request_role_reachability_violations,
    'request_role_reachability_violations'
  );
  const roleViolations = parseRequiredJsonColumn<{
    rolname: string;
    capabilities: string[];
  }>(row.role_violations, 'role_violations');
  const schemaViolations = parseRequiredJsonColumn<{
    rolname: string;
    nspname: string;
    capability: string;
  }>(row.schema_violations, 'schema_violations');
  const crossSchemaViolations = parseRequiredJsonColumn<{
    rolname: string;
    nspname: string;
    capabilities: string[];
  }>(row.cross_schema_violations, 'cross_schema_violations');
  const objectOwnerViolations = parseRequiredJsonColumn<{
    rolname: string;
    nspname: string;
    object_name: string;
    object_kind: string;
  }>(row.object_owner_violations, 'object_owner_violations');
  const privilegedObjectViolations = parseRequiredJsonColumn<{
    nspname: string;
    object_name: string;
    reason: string;
  }>(row.privileged_object_violations, 'privileged_object_violations');
  const storedDependencyViolations = parseRequiredJsonColumn<{
    nspname: string;
    object_name: string;
    reason: string;
    dependency: string;
  }>(row.stored_dependency_violations, 'stored_dependency_violations');
  const missingRoles = parseRequiredTextArrayColumn(
    row.missing_roles,
    'missing_roles'
  );
  const inaccessibleRoles = parseRequiredTextArrayColumn(
    row.inaccessible_roles,
    'inaccessible_roles'
  );
  const missingSchemas = parseRequiredTextArrayColumn(
    row.missing_schemas,
    'missing_schemas'
  );

  const violations = [
    ...loginRoleViolations.map(
      (role) => `${row.login_role} has ${role.capabilities.join(',')}`
    ),
    ...inheritedRoleViolations.map(
      (role) => `${row.login_role} inherits privileges from role ${role.rolname}`
    ),
    ...unexpectedSetRoleViolations.map(
      (role) => `${row.login_role} can SET ROLE to unconfigured role ${role.rolname}`
    ),
    ...requestRoleReachabilityViolations.map(
      (role) => `${role.request_role} can reach role ${role.reachable_role}`
        + ` after SET ROLE (USAGE=${role.via_usage},SET=${role.via_set})`
    ),
    ...roleViolations.map(
      (role) => `${role.rolname} has ${role.capabilities.join(',')}`
    ),
    ...databaseViolations.map(
      (database) => `${database.rolname} has ${database.capability} on database ${database.datname}`
    ),
    ...crossDatabaseViolations.map(
      (database) => `${database.rolname} has CONNECT on non-target database ${database.datname}`
    ),
    ...schemaViolations.map(
      (schema) => `${schema.rolname} has ${schema.capability} on schema ${schema.nspname}`
    ),
    ...crossSchemaViolations.map(
      (schema) => `${schema.rolname} has ${schema.capabilities.join(',')} on unapproved schema ${schema.nspname}`
    ),
    ...objectOwnerViolations.map(
      (object) => `${object.rolname} owns ${object.object_kind} ${object.nspname}.${object.object_name}`
    ),
    ...privilegedObjectViolations.map(
      (object) => `${object.reason} ${object.nspname}.${object.object_name} is not allowed in the approved GraphQL schema scope`
    ),
    ...storedDependencyViolations.map(
      (object) => `${object.reason} from ${object.nspname}.${object.object_name} to ${object.dependency}`
    ),
    ...missingRoles.map((role) => `request role ${role} does not exist`),
    ...inaccessibleRoles.map(
      (role) => `runtime login ${row.login_role} cannot SET ROLE ${role}`
    ),
    ...missingSchemas.map((schema) => `exposed schema ${schema} does not exist`)
  ];

  if (violations.length > 0) throw new UnsafeRuntimeRoleError(violations);
};

interface CachedSafetyCheck {
  promise: Promise<void>;
  /** Wall-clock time when the successful catalog audit completed. */
  validatedAt: number | null;
}

export interface RuntimeRoleSafetyStats {
  checksStarted: number;
  checksSucceeded: number;
  checksFailed: number;
  inFlightCoalesces: number;
  successfulResultReuses: number;
  durationMsTotal: number;
  durationMsMax: number;
}

const runtimeRoleSafetyStats: RuntimeRoleSafetyStats = {
  checksStarted: 0,
  checksSucceeded: 0,
  checksFailed: 0,
  inFlightCoalesces: 0,
  successfulResultReuses: 0,
  durationMsTotal: 0,
  durationMsMax: 0
};

/** Process-level audit timing and coalescing telemetry for local diagnostics. */
export const getRuntimeRoleSafetyStats = (): Readonly<RuntimeRoleSafetyStats> => ({
  ...runtimeRoleSafetyStats
});

const recordRuntimeRoleSafetyDuration = (startedAt: number): void => {
  const durationMs = performance.now() - startedAt;
  runtimeRoleSafetyStats.durationMsTotal += durationMs;
  runtimeRoleSafetyStats.durationMsMax = Math.max(
    runtimeRoleSafetyStats.durationMsMax,
    durationMs
  );
};

/**
 * Successful catalog audits may only be reused for a narrowly bounded window.
 * Callers may choose a fresher policy, including zero for in-flight coalescing
 * without any completed-result reuse, but may not extend this safety bound.
 */
// Without an authoritative control-plane epoch, a completed catalog result is
// stale immediately. Keep the opt-in cap small for deployments that wire the
// invalidation seam to every DDL/ACL commit, but make fresh checks the default.
export const DEFAULT_RUNTIME_ROLE_SAFETY_MAX_AGE_MS = 0;
export const MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS = 1_000;

export interface RuntimeRoleSafetyCacheOptions {
  maxSuccessAgeMs?: number;
}

const safetyChecks = new WeakMap<Pool, Map<string, CachedSafetyCheck>>();

const normalizeMaxSuccessAgeMs = (value: number | undefined): number => {
  const maxSuccessAgeMs = value ?? DEFAULT_RUNTIME_ROLE_SAFETY_MAX_AGE_MS;
  if (
    !Number.isSafeInteger(maxSuccessAgeMs)
    || maxSuccessAgeMs < 0
    || maxSuccessAgeMs > MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS
  ) {
    throw new RangeError(
      `runtime role safety maxSuccessAgeMs must be an integer between 0 and ${MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS}`
    );
  }
  return maxSuccessAgeMs;
};

/** Coalesce identical safety checks for every consumer of a runtime pool. */
const safetyCheckKey = (
  requestRoles: string[],
  exposedSchemas: string[],
  dependencySchemas: string[]
): string => JSON.stringify([
  [...new Set(requestRoles.filter(Boolean))].sort(),
  [...new Set(exposedSchemas.filter(Boolean))].sort(),
  [...new Set(dependencySchemas.filter(Boolean))].sort()
]);

/** Reuse a recent successful audit while coalescing concurrent callers. */
export const ensureRuntimeRoleSafety = (
  pool: Pool,
  requestRoles: string[],
  exposedSchemas: string[],
  dependencySchemas: string[] = [],
  options: RuntimeRoleSafetyCacheOptions = {}
): Promise<void> => {
  const maxSuccessAgeMs = normalizeMaxSuccessAgeMs(options.maxSuccessAgeMs);
  const key = safetyCheckKey(requestRoles, exposedSchemas, dependencySchemas);
  let checksForPool = safetyChecks.get(pool);
  if (!checksForPool) {
    checksForPool = new Map();
    safetyChecks.set(pool, checksForPool);
  }
  const existing = checksForPool.get(key);
  if (existing) {
    if (existing.validatedAt == null) {
      runtimeRoleSafetyStats.inFlightCoalesces++;
      return existing.promise;
    }
    const now = Date.now();
    const successAgeMs = now - existing.validatedAt;
    if (
      maxSuccessAgeMs > 0
      && successAgeMs >= 0
      && successAgeMs < maxSuccessAgeMs
    ) {
      runtimeRoleSafetyStats.successfulResultReuses++;
      return existing.promise;
    }
  }

  let check!: CachedSafetyCheck;
  runtimeRoleSafetyStats.checksStarted++;
  const startedAt = performance.now();
  const pending = assertRuntimeRoleSafety(
    pool,
    requestRoles,
    exposedSchemas,
    dependencySchemas
  ).then(() => {
    runtimeRoleSafetyStats.checksSucceeded++;
    recordRuntimeRoleSafetyDuration(startedAt);
    check.validatedAt = Date.now();
  }).catch((error) => {
    runtimeRoleSafetyStats.checksFailed++;
    recordRuntimeRoleSafetyDuration(startedAt);
    if (checksForPool?.get(key) === check) checksForPool.delete(key);
    throw error;
  });
  check = { promise: pending, validatedAt: null };
  checksForPool.set(key, check);
  return pending;
};

/**
 * Invalidate one audit contract, or every cached audit for the pool when the
 * contract arguments are omitted. Control-plane DDL/GRANT/REVOKE paths should
 * call this immediately after committing catalog changes.
 */
export const invalidateRuntimeRoleSafety = (
  pool: Pool,
  requestRoles?: string[],
  exposedSchemas?: string[],
  dependencySchemas: string[] = []
): void => {
  const checksForPool = safetyChecks.get(pool);
  if (!checksForPool) return;
  if (requestRoles == null || exposedSchemas == null) {
    safetyChecks.delete(pool);
    return;
  }
  checksForPool.delete(
    safetyCheckKey(requestRoles, exposedSchemas, dependencySchemas)
  );
  if (checksForPool.size === 0) safetyChecks.delete(pool);
};

/** Force a new audit for schema build admission, even after a cached success. */
export const refreshRuntimeRoleSafety = (
  pool: Pool,
  requestRoles: string[],
  exposedSchemas: string[],
  dependencySchemas: string[] = []
): Promise<void> => {
  invalidateRuntimeRoleSafety(pool, requestRoles, exposedSchemas, dependencySchemas);
  return ensureRuntimeRoleSafety(pool, requestRoles, exposedSchemas, dependencySchemas);
};
