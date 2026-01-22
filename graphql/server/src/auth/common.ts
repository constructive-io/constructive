import { Request, Response } from 'express';
import { PgpmOptions } from '@pgpmjs/types';
import { getPgPool } from 'pg-cache';
import { getSubdomain } from '../middleware/api';
import { Logger } from '@pgpmjs/logger';

const log = new Logger('oauth:common');

export type EmailInfo = { email: string; verified: boolean };

export type OAuthProvider = 'google' | 'github' | 'linkedin' | 'facebook';

export type UpsertResult = {
  id: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  email: string;
  createdAt: string;
};

export const getPool = (opts: PgpmOptions) => getPgPool(opts.pg);

/**
 * Get database name from request by looking up the domain
 * Returns the database name (e.g., "constructive", "peptide") or null if not found
 */
export const getDatabaseNameFromRequest = async (
  opts: PgpmOptions,
  req: Request
): Promise<string | null> => {
  try {
    const rootPgPool = getPgPool(opts.pg);
    // @ts-ignore
    const subdomain = getSubdomain(req.urlDomains?.subdomains || []);
    const domain: string = (req.urlDomains?.domain as string) || req.hostname || 'localhost';

    const apiOpts = (opts as any).api || {};
    const apiPublic = apiOpts.isPublic;

    // Log request details
    log.info('Getting database name from request', {
      hostname: req.hostname,
      urlDomains: req.urlDomains,
      subdomain,
      domain,
      isPublic: apiPublic,
      headers: {
        host: req.headers.host,
        'x-forwarded-host': req.headers['x-forwarded-host'],
      },
    });

    // Direct SQL query to find database name from domain
    const db = await rootPgPool.connect();
    try {
      const query = subdomain
        ? `
          SELECT DISTINCT db.name as database_name
          FROM services_public.domains d
          LEFT JOIN services_public.apis a ON a.id = d.api_id
          LEFT JOIN metaschema_public.database db ON db.id = a.database_id
          WHERE d.domain = $1 AND d.subdomain = $2 AND a.is_public = $3
          LIMIT 1
        `
        : `
          SELECT DISTINCT db.name as database_name
          FROM services_public.domains d
          LEFT JOIN services_public.apis a ON a.id = d.api_id
          LEFT JOIN metaschema_public.database db ON db.id = a.database_id
          WHERE d.domain = $1 AND d.subdomain IS NULL AND a.is_public = $2
          LIMIT 1
        `;

      const params = subdomain ? [domain, subdomain, apiPublic] : [domain, apiPublic];
      
      log.debug('Executing database lookup query', {
        query: query.trim(),
        params,
        hasSubdomain: !!subdomain,
      });

      const result = await db.query<{ database_name: string }>(query, params);

      log.debug('Database lookup query result', {
        rowCount: result.rows.length,
        rows: result.rows,
      });

      if (result.rows.length > 0 && result.rows[0].database_name) {
        log.info(`Found database name from domain lookup: ${result.rows[0].database_name}`);
        return result.rows[0].database_name;
      }

      // If no result found, query all domains to help debug
      const allDomainsQuery = `
        SELECT 
          d.domain,
          d.subdomain,
          a.is_public,
          db.name as database_name
        FROM services_public.domains d
        LEFT JOIN services_public.apis a ON a.id = d.api_id
        LEFT JOIN metaschema_public.database db ON db.id = a.database_id
        ORDER BY d.domain, d.subdomain
      `;
      const allDomainsResult = await db.query(allDomainsQuery);
      
      log.warn(`No database found for domain ${subdomain ? `${subdomain}.` : ''}${domain} with isPublic=${apiPublic}`, {
        searchedDomain: domain,
        searchedSubdomain: subdomain,
        searchedIsPublic: apiPublic,
        availableDomains: allDomainsResult.rows.map((r: any) => ({
          domain: r.domain,
          subdomain: r.subdomain,
          is_public: r.is_public,
          database_name: r.database_name,
        })),
      });
    } finally {
      db.release();
    }

    // Fallback: Try to determine database from subdomain if it contains database name
    // e.g., "public-peptide" -> "peptide", "app-constructive" -> "constructive"
    if (subdomain) {
      log.debug('Attempting fallback: extracting database name from subdomain', {
        subdomain,
        subdomainParts: subdomain.split('-'),
      });
      
      const subdomainParts = subdomain.split('-');
      for (const part of subdomainParts.reverse()) {
        if (part === 'peptide' || part === 'constructive') {
          log.info(`Fallback: Determined database from subdomain: ${part}`);
          return part;
        }
      }
      
      log.warn('Fallback failed: subdomain does not contain known database name', {
        subdomain,
        subdomainParts: subdomainParts,
      });
    } else {
      log.debug('No subdomain available for fallback');
    }

    log.error('Unable to determine database from request - all methods exhausted');
    return null;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    const errorName = e instanceof Error ? e.name : 'UnknownError';
    const errorCode = (e as any)?.code;
    const errorDetails = e instanceof Error ? {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      code: errorCode,
    } : { error: String(e) };
    
    log.error('Error getting database name from request', errorDetails);
    log.error(`Error details: ${errorName}: ${errorMessage}`, {
      code: errorCode,
      stack: errorStack,
      hostname: req.hostname,
      urlDomains: req.urlDomains,
    });
    return null;
  }
};

/**
 * Get schema names based on database name
 * Schema naming convention:
 * - constructive -> constructive_user_identifiers_public, constructive_users_public, constructive_auth_private
 * - others -> {dbname}-user-identifiers-public, {dbname}-users-public, {dbname}-auth-private
 */
export const getSchemaNames = (databaseName: string) => {
  if (databaseName === 'constructive') {
    return {
      userIdentifiersSchema: 'constructive_user_identifiers_public',
      usersSchema: 'constructive_users_public',
      authPrivateSchema: 'constructive_auth_private',
    };
  }
  // For other databases, use kebab-case with hyphens
  const dbPrefix = databaseName.toLowerCase().replace(/_/g, '-');
  return {
    userIdentifiersSchema: `${dbPrefix}-user-identifiers-public`,
    usersSchema: `${dbPrefix}-users-public`,
    authPrivateSchema: `${dbPrefix}-auth-private`,
  };
};

export const upsertAccountAndIssueToken = async ({
  pool,
  databaseName,
  provider,
  profileId,
  emailInfo,
  displayName,
  avatarUrl,
}: {
  pool: ReturnType<typeof getPgPool>;
  databaseName: string;
  provider: OAuthProvider;
  profileId: string;
  emailInfo: EmailInfo;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<UpsertResult> => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const schemas = getSchemaNames(databaseName);

    const details = {
      email: emailInfo.email,
      displayName,
      avatarUrl,
      provider,
      profileId,
    };

    const existingEmail = await db.query<{ owner_id: string }>(
      `SELECT owner_id FROM "${schemas.userIdentifiersSchema}".emails WHERE email = $1 LIMIT 1`,
      [emailInfo.email]
    );

    let userId: string;
    if (existingEmail.rowCount) {
      userId = existingEmail.rows[0].owner_id;
    } else {
      const newUser = await db.query<{ id: string }>(
        `INSERT INTO "${schemas.usersSchema}".users DEFAULT VALUES RETURNING id`
      );
      userId = newUser.rows[0].id;
      await db.query(
        `INSERT INTO "${schemas.userIdentifiersSchema}".emails (owner_id, email) VALUES ($1, $2)`,
        [userId, emailInfo.email]
      );
    }

    await db.query(
      `
      INSERT INTO "${schemas.userIdentifiersSchema}".connected_accounts
        (service, identifier, owner_id, details, is_verified)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (service, identifier) DO UPDATE
        SET owner_id = EXCLUDED.owner_id,
            details = EXCLUDED.details,
            is_verified = EXCLUDED.is_verified,
            updated_at = now()
      `,
      [provider, profileId, userId, JSON.stringify(details), emailInfo.verified]
    );

    // Insert token with 30 days expiration (matching default behavior)
    const tokenRes = await db.query<{
      id: string;
      access_token: string;
      access_token_expires_at: string;
      created_at: string;
    }>(
      `
      INSERT INTO "${schemas.authPrivateSchema}".api_tokens (user_id, is_verified, access_token_expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
      RETURNING id, access_token, access_token_expires_at, created_at
      `,
      [userId, emailInfo.verified]
    );

    await db.query('COMMIT');

    const token = tokenRes.rows[0];
    return {
      id: token.id,
      userId,
      accessToken: token.access_token,
      accessTokenExpiresAt: token.access_token_expires_at,
      email: emailInfo.email,
      createdAt: token.created_at,
    };
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally {
    db.release();
  }
};

export const getFrontendRedirect = (req: Request, frontendCallbackUrl?: string): string | null => {
  const redirectParam = req.query.redirect_uri || req.query.redirect;
  if (typeof redirectParam === 'string' && redirectParam.length) {
    log.debug('Using redirect URL from query parameter', { redirectUrl: redirectParam });
    return redirectParam;
  }
  if (frontendCallbackUrl) {
    log.debug('Using redirect URL from environment variable', { redirectUrl: frontendCallbackUrl });
    return frontendCallbackUrl;
  }
  // Default frontend callback URL for development
  // TODO: Remove this hardcoded value and require explicit configuration
  const defaultUrl = 'http://localhost:3001/auth/success';
  log.warn('Using default redirect URL (OAUTH_FRONTEND_CALLBACK_URL not set)', { defaultUrl });
  return defaultUrl;
};

