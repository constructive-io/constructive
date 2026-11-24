import type { Pool } from 'pg';

import type { ApiStructure } from '../types';

export const API_ROLE_VALIDATION_SQL = `
WITH configured_roles AS MATERIALIZED (
  SELECT oid, rolname, rolsuper, rolbypassrls
  FROM pg_catalog.pg_roles WHERE rolname = ANY($1::text[])
), settable_roles AS MATERIALIZED (
  SELECT configured.oid AS configured_oid, r.oid, r.rolsuper, r.rolbypassrls
  FROM configured_roles AS configured
  JOIN pg_catalog.pg_roles AS r ON pg_catalog.pg_has_role(configured.oid, r.oid, 'SET')
), served_rls_owners AS MATERIALIZED (
  SELECT DISTINCT relation.relowner
  FROM pg_catalog.pg_namespace AS namespace
  JOIN pg_catalog.pg_class AS relation ON relation.relnamespace = namespace.oid
  WHERE namespace.nspname = ANY($2::text[])
    AND relation.relrowsecurity AND NOT relation.relforcerowsecurity
), role_validation AS MATERIALIZED (
  SELECT configured.rolname,
    CASE
      WHEN configured.rolsuper OR configured.rolbypassrls
        THEN 'superuser or BYPASSRLS'
      WHEN EXISTS (
        SELECT 1 FROM settable_roles AS r
        WHERE r.configured_oid = configured.oid AND (r.rolsuper OR r.rolbypassrls)
      ) THEN 'member of privileged role'
      WHEN EXISTS (
        SELECT 1
        FROM settable_roles AS r
        JOIN served_rls_owners AS relation ON pg_catalog.pg_has_role(r.oid, relation.relowner, 'USAGE')
        WHERE r.configured_oid = configured.oid
      ) THEN 'owner of served RLS table'
    END AS reason
  FROM configured_roles AS configured
)
SELECT rolname, reason FROM role_validation WHERE reason IS NOT NULL`;

export const validateApiRoles = async (pool: Pool, api: ApiStructure): Promise<void> => {
  const { rows } = await pool.query<{ rolname: string; reason: string }>(
    API_ROLE_VALIDATION_SQL,
    [[api.roleName, api.anonRole], api.schema]
  );
  for (const column of ['role_name', 'anon_role'] as const) {
    const value = column === 'role_name' ? api.roleName : api.anonRole;
    const forbidden = rows.find((row) => row.rolname === value);
    if (!forbidden) continue;
    const error = new Error(
      `API ${api.apiId ?? '<unknown>'} ${column} can bypass RLS: ${forbidden.reason}.`
    ) as Error & { code: string; column: string; apiId?: string };
    error.code = 'API_ROLE_FORBIDDEN';
    error.column = column;
    error.apiId = api.apiId;
    throw error;
  }
};
