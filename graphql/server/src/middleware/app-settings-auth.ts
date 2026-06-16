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
import {
  updateAuthSettings,
  type AuthSettings,
  type ConstructiveContext,
  type UpdateAuthSettingsInput,
} from '@constructive-io/express-context';

import './types';

const log = new Logger('app-settings-auth');

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
