/**
 * App Settings Auth API
 *
 * Express router for managing auth settings (cookie config, captcha, OAuth settings).
 * Requires administrator role. Reads/writes to app_settings_auth table via
 * the authSettings loader discovery.
 *
 * Routes:
 *   GET   /app-settings-auth  → get current settings
 *   PATCH /app-settings-auth  → update settings
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import type { ConstructiveContext } from '@constructive-io/express-context';

import './types';

const log = new Logger('app-settings-auth');

// ─── SQL ────────────────────────────────────────────────────────────────────

const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT s.schema_name, sm.auth_settings_table AS table_name
  FROM metaschema_modules_public.sessions_module sm
  JOIN metaschema_public.schema s ON s.id = sm.schema_id
  LIMIT 1
`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthSettingsRow {
  cookie_secure: boolean;
  cookie_samesite: string;
  cookie_domain: string | null;
  cookie_httponly: boolean;
  cookie_max_age: string | null;
  cookie_path: string;
  remember_me_duration: string | null;
  enable_captcha: boolean;
  captcha_site_key: string | null;
  oauth_state_max_age: string | null;
  oauth_require_verified_email: boolean;
  oauth_error_redirect_path: string | null;
}

interface UpdateAuthSettingsBody {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireAdmin(ctx: ConstructiveContext, res: Response): boolean {
  if (ctx.token?.role !== 'administrator') {
    res.status(403).json({ error: 'ADMIN_REQUIRED' });
    return false;
  }
  return true;
}

async function discoverAuthSettingsTable(
  ctx: ConstructiveContext,
): Promise<{ schemaName: string; tableName: string } | null> {
  return await ctx.withPgClient(async (client) => {
    const result = await client.query<{ schema_name: string; table_name: string }>(
      AUTH_SETTINGS_DISCOVERY_SQL,
    );
    const row = result.rows[0];
    if (!row) return null;
    return { schemaName: row.schema_name, tableName: row.table_name };
  });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function createAppSettingsAuthRouter(): Router {
  const router = Router();

  /**
   * GET /app-settings-auth
   * Get current auth settings
   */
  router.get('/app-settings-auth', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!requireAdmin(ctx, res)) return;

    try {
      const table = await discoverAuthSettingsTable(ctx);
      if (!table) {
        return res.status(404).json({ error: 'Auth settings module not configured' });
      }

      const settings = await ctx.withPgClient(async (client) => {
        const sql = `
          SELECT
            cookie_secure,
            cookie_samesite,
            cookie_domain,
            cookie_httponly,
            cookie_max_age::text,
            cookie_path,
            remember_me_duration::text,
            enable_captcha,
            captcha_site_key,
            oauth_state_max_age::text,
            oauth_require_verified_email,
            oauth_error_redirect_path
          FROM ${QuoteUtils.quoteQualifiedIdentifier(table.schemaName, table.tableName)}
          LIMIT 1
        `;
        const result = await client.query<AuthSettingsRow>(sql);
        return result.rows[0];
      });

      if (!settings) {
        return res.status(404).json({ error: 'Auth settings not found' });
      }

      res.json({
        cookieSecure: settings.cookie_secure,
        cookieSamesite: settings.cookie_samesite,
        cookieDomain: settings.cookie_domain,
        cookieHttponly: settings.cookie_httponly,
        cookieMaxAge: settings.cookie_max_age,
        cookiePath: settings.cookie_path,
        rememberMeDuration: settings.remember_me_duration,
        enableCaptcha: settings.enable_captcha,
        captchaSiteKey: settings.captcha_site_key,
        oauthStateMaxAge: settings.oauth_state_max_age,
        oauthRequireVerifiedEmail: settings.oauth_require_verified_email,
        oauthErrorRedirectPath: settings.oauth_error_redirect_path,
      });
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

    if (!requireAdmin(ctx, res)) return;

    const body = req.body as UpdateAuthSettingsBody;

    try {
      const table = await discoverAuthSettingsTable(ctx);
      if (!table) {
        return res.status(404).json({ error: 'Auth settings module not configured' });
      }

      const fieldMap: Record<string, string> = {
        cookieSecure: 'cookie_secure',
        cookieSamesite: 'cookie_samesite',
        cookieDomain: 'cookie_domain',
        cookieHttponly: 'cookie_httponly',
        cookieMaxAge: 'cookie_max_age',
        cookiePath: 'cookie_path',
        rememberMeDuration: 'remember_me_duration',
        enableCaptcha: 'enable_captcha',
        captchaSiteKey: 'captcha_site_key',
        oauthStateMaxAge: 'oauth_state_max_age',
        oauthRequireVerifiedEmail: 'oauth_require_verified_email',
        oauthErrorRedirectPath: 'oauth_error_redirect_path',
      };

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
        if (camelKey in body) {
          const value = (body as Record<string, unknown>)[camelKey];
          if (snakeKey.includes('_age') || snakeKey.includes('_duration')) {
            setClauses.push(`${snakeKey} = $${paramIndex++}::interval`);
          } else {
            setClauses.push(`${snakeKey} = $${paramIndex++}`);
          }
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      await ctx.withPgClient(async (client) => {
        const sql = `
          UPDATE ${QuoteUtils.quoteQualifiedIdentifier(table.schemaName, table.tableName)}
          SET ${setClauses.join(', ')}
        `;
        await client.query(sql, values);
      });

      log.info('[app-settings-auth] Updated settings');
      res.json({ success: true });
    } catch (error) {
      log.error('[app-settings-auth] Failed to update settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  return router;
}
