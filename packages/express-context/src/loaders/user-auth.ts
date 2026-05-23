/**
 * User Auth Module Loader
 *
 * Resolves the user_auth_module config from metaschema_modules_public.
 * Provides schema name and function names for sign-in/sign-up operations
 * including identity-based (OAuth/SSO) auth functions.
 */

import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserAuthConfig {
  schemaName: string;
  signInFunction: string;
  signUpFunction: string;
  signOutFunction: string;
  signInCrossOriginFunction: string | null;
  requestCrossOriginTokenFunction: string | null;
  extendTokenExpires: string;
}

// ─── SQL ────────────────────────────────────────────────────────────────────

const USER_AUTH_MODULE_SQL = `
  SELECT
    s.schema_name,
    uam.sign_in_function,
    uam.sign_up_function,
    uam.sign_out_function,
    uam.sign_in_cross_origin_function,
    uam.request_cross_origin_token_function,
    uam.extend_token_expires
  FROM metaschema_modules_public.user_auth_module uam
  JOIN metaschema_public.schema s ON s.id = uam.schema_id
  WHERE uam.database_id = $1
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface UserAuthModuleRow {
  schema_name: string;
  sign_in_function: string;
  sign_up_function: string;
  sign_out_function: string;
  sign_in_cross_origin_function: string | null;
  request_cross_origin_token_function: string | null;
  extend_token_expires: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const userAuthLoader: ModuleLoader<UserAuthConfig> =
  createModuleLoader<UserAuthConfig>({
    name: 'userAuth',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const result = await tenantPool.query<UserAuthModuleRow>(
        USER_AUTH_MODULE_SQL,
        [databaseId],
      );
      const row = result.rows[0];
      if (!row) return undefined;

      return {
        schemaName: row.schema_name,
        signInFunction: row.sign_in_function,
        signUpFunction: row.sign_up_function,
        signOutFunction: row.sign_out_function,
        signInCrossOriginFunction: row.sign_in_cross_origin_function,
        requestCrossOriginTokenFunction: row.request_cross_origin_token_function,
        extendTokenExpires: row.extend_token_expires,
      };
    },
  });
