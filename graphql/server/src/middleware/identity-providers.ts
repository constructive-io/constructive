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

import express, { Router, Request, Response } from 'express';
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

async function isAppMember(ctx: ConstructiveContext): Promise<boolean> {
  const userId = ctx.userId;
  if (!userId) return false;

  // Check if user is an app member (has a record in app_memberships_sprt)
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

// ─── Router ─────────────────────────────────────────────────────────────────

export function createIdentityProvidersRouter(): Router {
  const router = Router();

  // Parse JSON body for PATCH/POST requests
  router.use(express.json());

  /**
   * GET /identity-providers
   * List all identity providers (including disabled ones)
   */
  router.get('/identity-providers', async (req: Request, res: Response) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.status(500).json({ error: 'Missing context' });
    }

    if (!(await requireAppMember(ctx, res))) return;

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName } = identityProviders;

      const sql = `
        SELECT
          id, slug, kind, display_name, enabled, is_built_in,
          client_id, client_secret_id,
          authorization_url, token_url, userinfo_url,
          scopes, pkce_enabled
        FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
        ORDER BY is_built_in DESC, slug ASC
      `;
      const result = await ctx.pool.query<ProviderRow>(sql);
      const providers = result.rows;

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

    if (!(await requireAppMember(ctx, res))) return;

    const { slug } = req.params;

    try {
      const identityProviders = await ctx.useModule('identityProviders');
      if (!identityProviders) {
        return res.status(404).json({ error: 'Identity providers module not configured' });
      }

      const { privateSchemaName, tableName } = identityProviders;

      const sql = `
        SELECT
          id, slug, kind, display_name, enabled, is_built_in,
          client_id, client_secret_id,
          authorization_url, token_url, userinfo_url,
          scopes, pkce_enabled
        FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
        WHERE slug = $1
      `;
      const result = await ctx.pool.query<ProviderRow>(sql, [slug]);
      const provider = result.rows[0];

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

    if (!(await requireAppMember(ctx, res))) return;

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

      const sql = `
        UPDATE ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
        SET ${setClauses.join(', ')}
        WHERE slug = $${paramIndex}
      `;
      const result = await ctx.pool.query(sql, values);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Provider not found' });
      }

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

    if (!(await requireAppMember(ctx, res))) return;

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

      const { privateSchemaName, tableName } = identityProviders;
      const databaseId = ctx.databaseId;
      if (!databaseId) {
        return res.status(500).json({ error: 'Database context not available' });
      }

      // Get provider info
      const lookupSql = `
        SELECT id, client_secret_id FROM ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
        WHERE slug = $1
      `;
      const lookupResult = await ctx.pool.query<{ id: string; client_secret_id: string | null }>(lookupSql, [slug]);
      if (lookupResult.rows.length === 0) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      const provider = lookupResult.rows[0];

      // Ensure default namespace exists
      const namespaceSql = `
        INSERT INTO constructive_infra_public.platform_namespaces (database_id, name)
        VALUES ($1, 'default')
        ON CONFLICT (database_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      const namespaceResult = await ctx.pool.query<{ id: string }>(namespaceSql, [databaseId]);
      const namespaceId = namespaceResult.rows[0].id;

      let secretId = provider.client_secret_id;

      if (secretId) {
        // Update existing secret
        const updateSecretSql = `
          UPDATE constructive_store_private.platform_secrets
          SET value = $1::bytea, algo = 'plain', updated_at = now()
          WHERE id = $2
        `;
        await ctx.pool.query(updateSecretSql, [body.clientSecret, secretId]);
      } else {
        // Insert new secret
        const insertSecretSql = `
          INSERT INTO constructive_store_private.platform_secrets (database_id, namespace_id, name, value, algo)
          VALUES ($1, $2, $3, $4::bytea, 'plain')
          RETURNING id
        `;
        const secretResult = await ctx.pool.query<{ id: string }>(insertSecretSql, [
          databaseId,
          namespaceId,
          `${slug}/client-secret`,
          body.clientSecret,
        ]);
        secretId = secretResult.rows[0].id;

        // Link secret to provider
        const linkSql = `
          UPDATE ${QuoteUtils.quoteQualifiedIdentifier(privateSchemaName, tableName)}
          SET client_secret_id = $1
          WHERE id = $2
        `;
        await ctx.pool.query(linkSql, [secretId, provider.id]);
      }

      log.info(`[admin-identity-providers] Set secret for provider ${slug}`);
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
