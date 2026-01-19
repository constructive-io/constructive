import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
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

const log = new Logger('graphile');
const reqLabel = (req: Request): string =>
  req.requestId ? `[${req.requestId}]` : '[req]';

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
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
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
    const label = reqLabel(req);
    try {
      const api = req.api;
      if (!api) {
        log.error(`${label} Missing API info`);
        return res.status(500).send('Missing API info');
      }
      const key = req.svc_key;
      if (!key) {
        log.error(`${label} Missing service cache key`);
        return res.status(500).send('Missing service cache key');
      }
      const { dbname, anonRole, roleName, schema } = api;
      const schemaList = Array.isArray(schema) ? schema.filter(Boolean) : [];
      const schemaLabel = schemaList.join(',') || 'unknown';

      const cached = graphileCache.get(key);
      if (cached) {
        log.debug(
          `${label} PostGraphile cache hit key=${key} db=${dbname} schemas=${schemaLabel}`
        );
        return cached.handler(req, res, next);
      }

      log.debug(
        `${label} PostGraphile cache miss key=${key} db=${dbname} schemas=${schemaLabel}`
      );

      const pgPool = getPgPool({
        ...opts.pg,
        database: dbname,
      });

      const validSchemas = await resolveSchemas(pgPool, schemaList);
      if (!validSchemas.length) {
        log.warn(`${label} No valid schemas for key=${key} db=${dbname}`);
        return res.status(404).send('No valid schemas configured for this API.');
      }
      const validSchemaLabel = validSchemas.join(',') || 'unknown';

      const options = getSettings({
        ...opts,
        graphile: {
          ...opts.graphile,
          schema: validSchemas,
        },
      });

      const previousHandleErrors = options.handleErrors;
      options.handleErrors = (errors, req, res) => {
        const hasInternal = errors.some((error: any) => {
          const code = error?.originalError?.code;
          return typeof code === 'string' && code.startsWith('XX');
        });

        if (hasInternal) {
          res.statusCode = 500;
        }

        return previousHandleErrors ? previousHandleErrors(errors, req, res) : errors;
      };

      options.appendPlugins = options.appendPlugins ?? [];

      const pubkey_challenge = api.apiModules.find(
        (mod: any) => mod.name === 'pubkey_challenge'
      );

      if (pubkey_challenge && pubkey_challenge.data) {
        log.info(`${label} Enabling PublicKeySignature plugin for ${dbname}`);
        options.appendPlugins.push(
          PublicKeySignature(pubkey_challenge.data as PublicKeyChallengeConfig)
        );
      }

      if (opts.graphile?.appendPlugins) {
        options.appendPlugins.push(...opts.graphile.appendPlugins);
      }

      options.pgSettings = async function pgSettings(request: IncomingMessage) {
        const gqlReq = request as Request;
        const settingsLabel = reqLabel(gqlReq);
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
          log.debug(
            `${settingsLabel} pgSettings role=${roleName} db=${gqlReq.databaseId} ip=${gqlReq.clientIp}`
          );
          return {
            role: roleName,
            [`jwt.claims.token_id`]: gqlReq.token.id,
            [`jwt.claims.user_id`]: gqlReq.token.user_id,
            ...context,
          };
        }

        log.debug(
          `${settingsLabel} pgSettings role=${anonRole} db=${gqlReq.databaseId} ip=${gqlReq.clientIp}`
        );
        return { role: anonRole, ...context };
      };

      options.graphqlRoute = '/graphql';
      options.graphiqlRoute = '/graphiql';

      options.graphileBuildOptions = {
        ...options.graphileBuildOptions,
        ...opts.graphile?.graphileBuildOptions,
      };

      const graphileOpts: PostGraphileOptions = {
        ...options,
        ...opts.graphile?.overrideSettings,
      };

      log.info(
        `${label} Building PostGraphile handler key=${key} db=${dbname} schemas=${validSchemaLabel} role=${roleName} anon=${anonRole}`
      );
      const handler = postgraphile(pgPool, validSchemas, graphileOpts);

      graphileCache.set(key, {
        pgPool,
        pgPoolKey: dbname,
        handler,
      });

      log.info(`${label} Cached PostGraphile handler key=${key} db=${dbname}`);

      return handler(req, res, next);
    } catch (e: any) {
      if (isConnectionError(e)) {
        log.error(`${label} Database unavailable`, e);
        return res.status(503).send('Database unavailable');
      }
      log.error(`${label} PostGraphile middleware error`, e);
      return res.status(500).send(e.message);
    }
  };
};
