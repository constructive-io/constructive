import type { Request } from 'express';
import type { Plugin } from 'graphile-build';
import { gql, makeExtendSchemaPlugin } from 'graphile-utils';
import { getPgPool } from 'pg-cache';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';

interface Context {
  req: Request;
}

export type OAuthProvider = 'google' | 'github' | 'linkedin' | 'facebook';

/**
 * Get schema names based on database name
 * Schema naming convention:
 * - constructive -> constructive_user_identifiers_public, constructive_users_public, constructive_auth_private
 * - others -> {dbname}-user-identifiers-public, {dbname}-users-public, {dbname}-auth-private
 */
const getSchemaNames = (databaseName: string) => {
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

export const OAuthAccount = (opts: ConstructiveOptions): Plugin => {
  return makeExtendSchemaPlugin(() => ({
    typeDefs: gql`
      input UpsertOAuthAccountInput {
        provider: String!
        profileId: String!
        email: String!
        emailVerified: Boolean!
        displayName: String
        avatarUrl: String
      }

      type UpsertOAuthAccountPayload {
        id: String!
        userId: String!
        accessToken: String!
        accessTokenExpiresAt: String!
        email: String!
        createdAt: String!
      }

      extend type Mutation {
        upsertOAuthAccount(input: UpsertOAuthAccountInput!): UpsertOAuthAccountPayload!
      }
    `,
    resolvers: {
      Mutation: {
        async upsertOAuthAccount(
          _parent: any,
          args: {
            input: {
              provider: string;
              profileId: string;
              email: string;
              emailVerified: boolean;
              displayName?: string | null;
              avatarUrl?: string | null;
            };
          },
          context: Context
        ) {
          const { req } = context;
          const {
            provider, profileId, email, emailVerified, displayName, avatarUrl,
          } = args.input;

          // Get database name from request context (set by api middleware based on subdomain)
          const api = req.api;
          if (!api || !api.dbname) {
            throw new Error('Database name not found in request context. Ensure API middleware runs before GraphQL handler.');
          }

          const dbName = api.dbname;
          const schemas = getSchemaNames(dbName);

          // Use getPgPool to get a connection with full permissions (like common.ts does)
          // This uses the configured PostgreSQL user (e.g., postgres or app_user) with full database access
          const pool = getPgPool({
            ...opts.pg,
            database: dbName,
          });

          const db = await pool.connect();
          try {
            await db.query('BEGIN');

            const details = {
              email,
              displayName: displayName || null,
              avatarUrl: avatarUrl || null,
              provider,
              profileId,
            };

            // Check if email exists
            const existingEmail = await db.query<{ owner_id: string }>(
              `SELECT owner_id FROM "${schemas.userIdentifiersSchema}".emails WHERE email = $1 LIMIT 1`,
              [email]
            );

            let userId: string;
            if (existingEmail.rowCount && existingEmail.rowCount > 0) {
              userId = existingEmail.rows[0].owner_id;
            } else {
              // Create new user
              const newUser = await db.query<{ id: string }>(
                `INSERT INTO "${schemas.usersSchema}".users DEFAULT VALUES RETURNING id`
              );
              userId = newUser.rows[0].id;
              
              // Create email
              await db.query(
                `INSERT INTO "${schemas.userIdentifiersSchema}".emails (owner_id, email, is_verified, is_primary) VALUES ($1, $2, $3, $4)`,
                [userId, email, emailVerified, true]
              );
            }

            // Upsert connected_accounts
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
              [provider, profileId, userId, JSON.stringify(details), emailVerified]
            );

            // Create API token with 30 days expiration
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
              [userId, emailVerified]
            );

            await db.query('COMMIT');

            const token = tokenRes.rows[0];
            return {
              id: token.id,
              userId,
              accessToken: token.access_token,
              accessTokenExpiresAt: token.access_token_expires_at,
              email,
              createdAt: token.created_at,
            };
          } catch (e) {
            await db.query('ROLLBACK');
            throw e;
          } finally {
            db.release();
          }
        },
      },
    },
  }));
};
