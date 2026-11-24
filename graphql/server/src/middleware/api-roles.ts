import type { Pool } from 'pg';

import type { ApiStructure } from '../types';

export const API_ROLE_VALIDATION_SQL = `
WITH privileged_roles AS MATERIALIZED (
  SELECT oid FROM pg_catalog.pg_roles WHERE rolsuper OR rolbypassrls
), served_rls_owners AS MATERIALIZED (
  SELECT DISTINCT relation.relowner
  FROM pg_catalog.pg_namespace AS namespace
  JOIN pg_catalog.pg_class AS relation ON relation.relnamespace = namespace.oid
  WHERE namespace.nspname = ANY($2::text[])
    AND relation.relrowsecurity AND NOT relation.relforcerowsecurity
), configured_roles AS MATERIALIZED (
  SELECT configured.rolname,
    CASE
      WHEN configured.rolsuper OR configured.rolbypassrls
        THEN 'superuser or BYPASSRLS'
      WHEN EXISTS (
        SELECT 1 FROM privileged_roles AS r
        WHERE pg_catalog.pg_has_role(configured.oid, r.oid, 'SET')
      ) THEN 'member of privileged role'
      WHEN EXISTS (
        SELECT 1
        FROM served_rls_owners AS relation
        WHERE pg_catalog.pg_has_role(configured.oid, relation.relowner, 'USAGE')
          OR pg_catalog.pg_has_role(configured.oid, relation.relowner, 'SET')
      ) THEN 'owner of served RLS table'
    END AS reason
  FROM pg_catalog.pg_roles AS configured
  WHERE configured.rolname = ANY($1::text[])
)
SELECT rolname, reason FROM configured_roles WHERE reason IS NOT NULL`;

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
