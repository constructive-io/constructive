/**
 * Admin Identity Providers API
 *
 * Express router for managing OAuth/OIDC identity provider configurations.
 * Requires administrator role. Uses module loaders from @constructive-io/express-context
 * to discover schemas and function names at runtime.
 *
 * Routes:
 *   GET    /identity-providers           → list all providers
 *   GET    /identity-providers/:slug     → get provider details
 *   PATCH  /identity-providers/:slug     → update provider config
 *   POST   /identity-providers/:slug/secret → rotate client secret
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import type { ConstructiveContext } from '@constructive-io/express-context';

import './types';

const log = new Logger('admin-identity-providers');

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderRow {
  id: string;
  slug: string;
  kind: 'oauth2' | 'oidc';
  display_name: string;
  enabled: boolean;
  is_built_in: boolean;
  client_id: string | null;
  client_secret_id: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  scopes: string[] | null;
  pkce_enabled: boolean | null;
}

interface UpdateProviderBody {
  clientId?: string;
  enabled?: boolean;
  scopes?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  pkceEnabled?: boolean;
}

interface RotateSecretBody {
  clientSecret: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireAdmin(ctx: ConstructiveContext, res: Response): boolean {
  if (ctx.token?.role !== 'administrator') {
    res.status(403).json({ error: 'ADMIN_REQUIRED' });
    return false;
  }
  return true;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function createIdentityProvidersRouter(): Router {
  const router = Router();

  /**
   * GET /identity-providers
   * List all identity providers (including disabled ones)
   */
  router.get('/identity-providers', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!requireAdmin(ctx, res)) return;

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName } = identityProviders;

      const providers = await ctx.withPgClient(async (client) => {
        const sql = `
          SELECT
            id, slug, kind, display_name, enabled, is_built_in,
            client_id, client_secret_id,
            authorization_url, token_url, userinfo_url,
            scopes, pkce_enabled
          FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
          ORDER BY is_built_in DESC, slug ASC
        `;
        const result = await client.query<ProviderRow>(sql);
        return result.rows;
      });

      res.json({
        providers: providers.map((p) => ({
          id: p.id,
          slug: p.slug,
          kind: p.kind,
          displayName: p.display_name,
          enabled: p.enabled,
          isBuiltIn: p.is_built_in,
          clientId: p.client_id,
          hasSecret: !!p.client_secret_id,
          authorizationUrl: p.authorization_url,
          tokenUrl: p.token_url,
          userinfoUrl: p.userinfo_url,
          scopes: p.scopes || [],
          pkceEnabled: p.pkce_enabled ?? true,
        })),
      });
    } catch (error) {
      log.error('[admin-identity-providers] Failed to list providers:', error);
      res.status(500).json({ error: 'Failed to list providers' });
    }
  });

  /**
   * GET /identity-providers/:slug
   * Get a single provider's details
   */
  router.get('/identity-providers/:slug', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!requireAdmin(ctx, res)) return;

    const { slug } = req.params;

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName } = identityProviders;

      const provider = await ctx.withPgClient(async (client) => {
        const sql = `
          SELECT
            id, slug, kind, display_name, enabled, is_built_in,
            client_id, client_secret_id,
            authorization_url, token_url, userinfo_url,
            scopes, pkce_enabled
          FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
          WHERE slug = $1
        `;
        const result = await client.query<ProviderRow>(sql, [slug]);
        return result.rows[0];
      });

      if (!provider) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      res.json({
        id: provider.id,
        slug: provider.slug,
        kind: provider.kind,
        displayName: provider.display_name,
        enabled: provider.enabled,
        isBuiltIn: provider.is_built_in,
        clientId: provider.client_id,
        hasSecret: !!provider.client_secret_id,
        authorizationUrl: provider.authorization_url,
        tokenUrl: provider.token_url,
        userinfoUrl: provider.userinfo_url,
        scopes: provider.scopes || [],
        pkceEnabled: provider.pkce_enabled ?? true,
      });
    } catch (error) {
      log.error(`[admin-identity-providers] Failed to get provider ${slug}:`, error);
      res.status(500).json({ error: 'Failed to get provider' });
    }
  });

  /**
   * PATCH /identity-providers/:slug
   * Update provider configuration (client_id, enabled, scopes, urls)
   */
  router.patch('/identity-providers/:slug', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!requireAdmin(ctx, res)) return;

    const { slug } = req.params;
    const body = req.body as UpdateProviderBody;

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName } = identityProviders;

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.clientId !== undefined) {
        setClauses.push(`client_id = $${paramIndex++}`);
        values.push(body.clientId);
      }
      if (body.enabled !== undefined) {
        setClauses.push(`enabled = $${paramIndex++}`);
        values.push(body.enabled);
      }
      if (body.scopes !== undefined) {
        setClauses.push(`scopes = $${paramIndex++}`);
        values.push(body.scopes);
      }
      if (body.authorizationUrl !== undefined) {
        setClauses.push(`authorization_url = $${paramIndex++}`);
        values.push(body.authorizationUrl);
      }
      if (body.tokenUrl !== undefined) {
        setClauses.push(`token_url = $${paramIndex++}`);
        values.push(body.tokenUrl);
      }
      if (body.userinfoUrl !== undefined) {
        setClauses.push(`userinfo_url = $${paramIndex++}`);
        values.push(body.userinfoUrl);
      }
      if (body.pkceEnabled !== undefined) {
        setClauses.push(`pkce_enabled = $${paramIndex++}`);
        values.push(body.pkceEnabled);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(slug);

      await ctx.withPgClient(async (client) => {
        const sql = `
          UPDATE ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
          SET ${setClauses.join(', ')}
          WHERE slug = $${paramIndex}
        `;
        const result = await client.query(sql, values);
        if (result.rowCount === 0) {
          throw new Error('PROVIDER_NOT_FOUND');
        }
      });

      log.info(`[admin-identity-providers] Updated provider ${slug}`);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'PROVIDER_NOT_FOUND') {
        return res.status(404).json({ error: 'Provider not found' });
      }
      log.error(`[admin-identity-providers] Failed to update provider ${slug}:`, error);
      res.status(500).json({ error: 'Failed to update provider' });
    }
  });

  /**
   * POST /identity-providers/:slug/secret
   * Set or rotate the client secret for a provider
   */
  router.post('/identity-providers/:slug/secret', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!requireAdmin(ctx, res)) return;

    const { slug } = req.params;
    const body = req.body as RotateSecretBody;

    if (!body.clientSecret) {
      return res.status(400).json({ error: 'clientSecret is required' });
    }

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName, rotateSecretFunction } = identityProviders;

      await ctx.withPgClient(async (client) => {
        // First get the provider ID
        const lookupSql = `
          SELECT id FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
          WHERE slug = $1
        `;
        const lookupResult = await client.query<{ id: string }>(lookupSql, [slug]);
        if (lookupResult.rows.length === 0) {
          throw new Error('PROVIDER_NOT_FOUND');
        }

        const providerId = lookupResult.rows[0].id;

        // Call the rotate secret procedure
        const rotateSql = `CALL ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, rotateSecretFunction)}($1, $2)`;
        await client.query(rotateSql, [providerId, body.clientSecret]);
      });

      log.info(`[admin-identity-providers] Rotated secret for provider ${slug}`);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'PROVIDER_NOT_FOUND') {
        return res.status(404).json({ error: 'Provider not found' });
      }
      if (message.includes('IDENTITY_PROVIDER_NOT_FOUND')) {
        return res.status(404).json({ error: 'Provider not found' });
      }
      log.error(`[admin-identity-providers] Failed to rotate secret for ${slug}:`, error);
      res.status(500).json({ error: 'Failed to rotate secret' });
    }
  });

  return router;
}
