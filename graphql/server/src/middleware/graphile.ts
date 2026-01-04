import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { graphileCache } from 'graphile-cache';
import { getGraphileSettings as getSettings } from 'graphile-settings';
import type { IncomingMessage } from 'http';
import { getPgPool } from 'pg-cache';
import { postgraphile, PostGraphileOptions } from 'postgraphile';
import './types'; // for Request type

import PublicKeySignature, {
  PublicKeyChallengeConfig,
} from '../plugins/PublicKeySignature';

const resolveSchemas = async (
  pgPool: ReturnType<typeof getPgPool>,
  schemata: string[]
): Promise<string[]> => {
  if (!schemata.length) {
    return [];
  }

  const result = await pgPool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemata]
  );
  const names = result.rows.map((row: { schema_name: string }) => row.schema_name);
  return names;
};

const isConnectionError = (err: any): boolean => {
  const code = err?.code;
  return [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    '3D000',
  ].includes(code);
};

export const graphile = (opts: ConstructiveOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const api = req.api;
      if (!api) {
        return res.status(500).send('Missing API info');
      }
      const key = req.svc_key;
      if (!key) {
        return res.status(500).send('Missing service cache key');
      }
      const { dbname, anonRole, roleName, schema } = api;

      if (graphileCache.has(key)) {
        const { handler } = graphileCache.get(key)!;
        return handler(req, res, next);
      }

      const pgPool = getPgPool({
        ...opts.pg,
        database: dbname,
      });

      const schemaList = Array.isArray(schema) ? schema.filter(Boolean) : [];
      const validSchemas = await resolveSchemas(pgPool, schemaList);
      if (!validSchemas.length) {
        return res
          .status(404)
          .send('No valid schemas configured for this API.');
      }

      const options = getSettings({
        ...opts,
        graphile: {
          ...opts.graphile,
          schema: validSchemas,
        },
      });

      options.handleErrors = (errors, _req, res) => {
        const hasInternal = errors.some((error: any) => {
          const code = error?.originalError?.code;
          return typeof code === 'string' && code.startsWith('XX');
        });

        if (hasInternal) {
          res.statusCode = 500;
        }

        return errors;
      };

      const pubkey_challenge = api.apiModules.find(
        (mod: any) => mod.name === 'pubkey_challenge'
      );

      if (pubkey_challenge && pubkey_challenge.data) {
        options.appendPlugins.push(
          PublicKeySignature(pubkey_challenge.data as PublicKeyChallengeConfig)
        );
      }

      options.appendPlugins = options.appendPlugins ?? [];
      options.appendPlugins.push(...opts.graphile.appendPlugins);

      options.pgSettings = async function pgSettings(request: IncomingMessage) {
        const gqlReq = request as Request;
        const context: Record<string, any> = {
          [`jwt.claims.database_id`]: gqlReq.databaseId,
          [`jwt.claims.ip_address`]: gqlReq.clientIp,
        };

        if (gqlReq.get('origin')) {
          context['jwt.claims.origin'] = gqlReq.get('origin');
        }
        if (gqlReq.get('User-Agent')) {
          context['jwt.claims.user_agent'] = gqlReq.get('User-Agent');
        }

        if (gqlReq?.token?.user_id) {
          return {
            role: roleName,
            [`jwt.claims.token_id`]: gqlReq.token.id,
            [`jwt.claims.user_id`]: gqlReq.token.user_id,
            ...context,
          };
        }

        return { role: anonRole, ...context };
      };

      options.graphqlRoute = '/graphql';
      options.graphiqlRoute = '/graphiql';

      options.graphileBuildOptions = {
        ...options.graphileBuildOptions,
        ...opts.graphile.graphileBuildOptions,
      };

      const graphileOpts: PostGraphileOptions = {
        ...options,
        ...opts.graphile.overrideSettings,
      };

      const handler = postgraphile(pgPool, validSchemas, graphileOpts);

      graphileCache.set(key, {
        pgPool,
        pgPoolKey: dbname,
        handler,
      });

      return handler(req, res, next);
    } catch (e: any) {
      if (isConnectionError(e)) {
        return res.status(503).send('Database unavailable');
      }
      return res.status(500).send(e.message);
    }
  };
};
