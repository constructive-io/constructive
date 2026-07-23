/**
 * User Auth Module Loader
 *
 * Resolves the user_auth_module config from metaschema_modules_public.
 * Provides schema name and function names for sign-in/sign-up operations
 * including identity-based OAuth/SSO auth functions.
 */

import type { UserAuthModuleConfig, UserAuthModuleRow } from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const USER_AUTH_MODULE_SQL = `
  SELECT
    s.schema_name,
    sc_schema.schema_name AS session_credentials_schema_name,
    uam.sign_in_function,
    uam.sign_up_function,
    uam.sign_out_function,
    uam.sign_in_cross_origin_function,
    uam.request_cross_origin_token_function,
    uam.extend_token_expires
  FROM metaschema_modules_public.user_auth_module uam
  JOIN metaschema_public.schema s ON s.id = uam.schema_id
  LEFT JOIN metaschema_public.table sc_table ON sc_table.id = uam.session_credentials_table_id
  LEFT JOIN metaschema_public.schema sc_schema ON sc_schema.id = sc_table.schema_id
  WHERE uam.database_id = $1
  LIMIT 1
`;

const IDENTITY_FUNCTION_SCHEMA_SQL = `
  SELECT n.nspname AS schema_name
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = $1
    AND p.pronargs = 7
  ORDER BY CASE WHEN n.nspname = $2 THEN 0 ELSE 1 END, n.nspname
  LIMIT 1
`;

const SIGN_IN_IDENTITY_FUNCTION = 'sign_in_identity';
const SIGN_UP_IDENTITY_FUNCTION = 'sign_up_identity';

interface FunctionSchemaRow {
  schema_name: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const userAuthModuleLoader: ModuleLoader<UserAuthModuleConfig> =
  createModuleLoader<UserAuthModuleConfig>({
    name: 'userAuthModule',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const result = await tenantPool.query<UserAuthModuleRow>(
        USER_AUTH_MODULE_SQL,
        [databaseId],
      );
      const row = result.rows[0];
      if (!row) return undefined;

      const identitySchemaResult = await tenantPool.query<FunctionSchemaRow>(
        IDENTITY_FUNCTION_SCHEMA_SQL,
        [SIGN_IN_IDENTITY_FUNCTION, row.schema_name],
      );
      const identityFunctionSchemaName =
        identitySchemaResult.rows[0]?.schema_name || row.schema_name;

      return {
        schemaName: row.schema_name,
        identityFunctionSchemaName,
        sessionCredentialsSchemaName:
          row.session_credentials_schema_name || row.schema_name,
        signInFunction: row.sign_in_function,
        signUpFunction: row.sign_up_function,
        signInIdentityFunction: SIGN_IN_IDENTITY_FUNCTION,
        signUpIdentityFunction: SIGN_UP_IDENTITY_FUNCTION,
        signOutFunction: row.sign_out_function,
        signInCrossOriginFunction: row.sign_in_cross_origin_function,
        requestCrossOriginTokenFunction: row.request_cross_origin_token_function,
        extendTokenExpires: row.extend_token_expires,
      };
    },
  });
