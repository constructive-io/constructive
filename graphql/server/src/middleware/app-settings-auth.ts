/**
 * App Settings Auth API
 *
 * Express router for managing auth settings (cookie config, captcha, OAuth settings).
 * Requires administrator role. Reads/writes to app_settings_auth table via
 * the authSettings loader.
 *
 * Routes:
 *   GET   /app-settings-auth  → get current settings
 *   PATCH /app-settings-auth  → update settings
 */

import express, { Router, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import {
  authSettingsLoader,
  type AuthSettings,
  type ConstructiveContext,
} from '@constructive-io/express-context';

import './types';

const log = new Logger('app-settings-auth');

// ─── SQL ────────────────────────────────────────────────────────────────────

const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT s.schema_name, sm.auth_settings_table AS table_name
  FROM metaschema_modules_public.sessions_module sm
  JOIN metaschema_public.schema s ON s.id = sm.schema_id
  WHERE sm.database_id = $1
  LIMIT 1
`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthSettingsTableRef {
  schemaName: string;
  tableName: string;
}

interface UpdateAuthSettingsInput {
  allowIdentitySignIn?: boolean;
  allowIdentitySignUp?: boolean;
  cookieSecure?: boolean;
  cookieSamesite?: string;
  cookieDomain?: string | null;
  cookieHttponly?: boolean;
  cookieMaxAge?: string | null;
  cookiePath?: string;
  rememberMeDuration?: string | null;
  enableCaptcha?: boolean;
  captchaSiteKey?: string | null;
  oauthStateMaxAge?: string | null;
  oauthRequireVerifiedEmail?: boolean;
  oauthErrorRedirectPath?: string | null;
}

type UpdateAuthSettingsResult =
  | 'updated'
  | 'not_configured'
  | 'no_fields';

const UPDATE_FIELD_MAP: Record<
  keyof UpdateAuthSettingsInput,
  { column: string; castInterval?: boolean }
> = {
  allowIdentitySignIn: { column: 'allow_identity_sign_in' },
  allowIdentitySignUp: { column: 'allow_identity_sign_up' },
  cookieSecure: { column: 'cookie_secure' },
  cookieSamesite: { column: 'cookie_samesite' },
  cookieDomain: { column: 'cookie_domain' },
  cookieHttponly: { column: 'cookie_httponly' },
  cookieMaxAge: { column: 'cookie_max_age', castInterval: true },
  cookiePath: { column: 'cookie_path' },
  rememberMeDuration: { column: 'remember_me_duration', castInterval: true },
  enableCaptcha: { column: 'enable_captcha' },
  captchaSiteKey: { column: 'captcha_site_key' },
  oauthStateMaxAge: { column: 'oauth_state_max_age', castInterval: true },
  oauthRequireVerifiedEmail: { column: 'oauth_require_verified_email' },
  oauthErrorRedirectPath: { column: 'oauth_error_redirect_path' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function isAppMember(ctx: ConstructiveContext): Promise<boolean> {
  const userId = ctx.userId;
  if (!userId) return false;

  const sql = `
    SELECT 1 FROM constructive_memberships_private.app_memberships_sprt
    WHERE actor_id = $1
    LIMIT 1
  `;
  const result = await ctx.pool.query(sql, [userId]);
  return result.rows.length > 0;
}

async function requireAppMember(ctx: ConstructiveContext, res: Response): Promise<boolean> {
  if (!(await isAppMember(ctx))) {
    res.status(403).json({ error: 'MEMBERSHIP_REQUIRED' });
    return false;
  }
  return true;
}

function sendAuthSettings(res: Response, settings: AuthSettings): void {
  res.json({
    allowIdentitySignIn: settings.allowIdentitySignIn,
    allowIdentitySignUp: settings.allowIdentitySignUp,
    cookieSecure: settings.cookieSecure,
    cookieSamesite: settings.cookieSamesite,
    cookieDomain: settings.cookieDomain,
    cookieHttponly: settings.cookieHttponly,
    cookieMaxAge: settings.cookieMaxAge,
    cookiePath: settings.cookiePath,
    rememberMeDuration: settings.rememberMeDuration,
    enableCaptcha: settings.enableCaptcha,
    captchaSiteKey: settings.captchaSiteKey,
    oauthStateMaxAge: settings.oauthStateMaxAge,
    oauthRequireVerifiedEmail: settings.oauthRequireVerifiedEmail,
    oauthErrorRedirectPath: settings.oauthErrorRedirectPath,
  });
}

async function discoverAuthSettingsTable(
  ctx: ConstructiveContext,
): Promise<AuthSettingsTableRef | null> {
  if (!ctx.databaseId) return null;

  const discovery = await ctx.pool.query<{ schema_name: string; table_name: string }>(
    AUTH_SETTINGS_DISCOVERY_SQL,
    [ctx.databaseId],
  );
  const resolved = discovery.rows[0];
  if (!resolved) return null;

  return {
    schemaName: resolved.schema_name,
    tableName: resolved.table_name,
  };
}

function buildUpdateAuthSettingsQuery(
  schemaName: string,
  tableName: string,
  patch: UpdateAuthSettingsInput,
): { sql: string; values: unknown[] } | null {
  const authSettingsTable = QuoteUtils.quoteQualifiedIdentifier(
    schemaName,
    tableName,
  );
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [field, config] of Object.entries(UPDATE_FIELD_MAP) as Array<
    [keyof UpdateAuthSettingsInput, { column: string; castInterval?: boolean }]
  >) {
    if (field in patch) {
      const cast = config.castInterval ? '::interval' : '';
      setClauses.push(
        `${QuoteUtils.quoteIdentifier(config.column)} = $${paramIndex++}${cast}`,
      );
      values.push(patch[field]);
    }
  }

  if (setClauses.length === 0) return null;

  return {
    sql: `
      UPDATE ${authSettingsTable}
      SET ${setClauses.join(', ')}
    `,
    values,
  };
}

async function updateAuthSettings(
  ctx: ConstructiveContext,
  patch: UpdateAuthSettingsInput,
): Promise<UpdateAuthSettingsResult> {
  const table = await discoverAuthSettingsTable(ctx);
  if (!table) return 'not_configured';

  const update = buildUpdateAuthSettingsQuery(
    table.schemaName,
    table.tableName,
    patch,
  );
  if (!update) return 'no_fields';

  await ctx.pool.query(update.sql, update.values);
  if (ctx.databaseId) {
    authSettingsLoader.invalidate(ctx.databaseId);
  }

  return 'updated';
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function createAppSettingsAuthRouter(): Router {
  const router = Router();

  // Parse JSON body for PATCH requests
  router.use(express.json());

  /**
   * GET /app-settings-auth
   * Get current auth settings
   */
  router.get('/app-settings-auth', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!(await requireAppMember(ctx, res))) return;

    try {
      const settings = await ctx.useModule('authSettings');
      if (!settings) {
        return res.status(404).json({ error: 'Auth settings not found' });
      }

      sendAuthSettings(res, settings);
    } catch (error) {
      log.error('[app-settings-auth] Failed to get settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  /**
   * PATCH /app-settings-auth
   * Update auth settings
   */
  router.patch('/app-settings-auth', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!(await requireAppMember(ctx, res))) return;

    const body = req.body as UpdateAuthSettingsInput;

    try {
      const result = await updateAuthSettings(ctx, body);
      if (result === 'not_configured') {
        return res.status(404).json({ error: 'Auth settings module not configured' });
      }
      if (result === 'no_fields') {
        return res.status(400).json({ error: 'No fields to update' });
      }

      log.info('[app-settings-auth] Updated settings');
      res.json({ success: true });
    } catch (error) {
      log.error('[app-settings-auth] Failed to update settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  return router;
}
