import { createServer, Server as HttpServer } from 'node:http';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import { graphileCache, GraphileCacheEntry } from 'graphile-cache';
import { getGraphilePreset, makePgService } from 'graphile-settings';
import type { GraphileConfig } from 'graphile-config';
import { postgraphile } from 'postgraphile';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { grafserv } from 'grafserv/express/v4';
import { getPgEnvOptions } from 'pg-env';
import { HandlerCreationError } from '../errors/api-errors';
import './types'; // for Request type

const log = new Logger('graphile');
const reqLabel = (req: Request): string =>
  req.requestId ? `[${req.requestId}]` : '[req]';

/**
 * Tracks in-flight handler creation promises.
 * Implements single-flight pattern to prevent duplicate handler creation
 * when concurrent requests arrive for the same cache key.
 */
const creating = new Map<string, Promise<GraphileCacheEntry>>();

/**
 * Returns the number of currently in-flight handler creation operations.
 * Useful for monitoring and debugging.
 */
export function getInFlightCount(): number {
  return creating.size;
}

/**
 * Returns the cache keys for all currently in-flight handler creation operations.
 * Useful for monitoring and debugging.
 */
export function getInFlightKeys(): string[] {
  return [...creating.keys()];
}

/**
 * Clears the in-flight map. Used for testing purposes.
 */
export function clearInFlightMap(): void {
  creating.clear();
}

/**
 * Build connection string from pg config
 */
const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string => `postgres://${user}:${password}@${host}:${port}/${database}`;

/**
 * Create a PostGraphile v5 instance for a tenant
 */
const createGraphileInstance = async (
  opts: ConstructiveOptions,
  connectionString: string,
  schemas: string[],
  anonRole: string,
  roleName: string,
  cacheKey: string
): Promise<GraphileCacheEntry> => {
  const basePreset = getGraphilePreset(opts);

  const preset: GraphileConfig.Preset = {
    extends: [basePreset],
    pgServices: [
      makePgService({
        connectionString,
        schemas,
      }),
    ],
    grafast: {
      explain: process.env.NODE_ENV === 'development',
      context: (ctx: unknown) => {
        const req = (ctx as { node?: { req?: Request } } | undefined)?.node?.req;
        const context: Record<string, string> = {};

        if (req) {
          if (req.databaseId) {
            context['jwt.claims.database_id'] = req.databaseId;
          }
          if (req.clientIp) {
            context['jwt.claims.ip_address'] = req.clientIp;
          }
          if (req.get('origin')) {
            context['jwt.claims.origin'] = req.get('origin') as string;
          }
          if (req.get('User-Agent')) {
            context['jwt.claims.user_agent'] = req.get('User-Agent') as string;
          }

          if (req.token?.user_id) {
            return {
              pgSettings: {
                role: roleName,
                'jwt.claims.token_id': req.token.id,
                'jwt.claims.user_id': req.token.user_id,
                ...context,
              },
            };
          }
        }

        return {
          pgSettings: {
            role: anonRole,
            ...context,
          },
        };
      },
    },
  };

  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  const handler = express();
  const httpServer = createServer(handler);
  await serv.addTo(handler, httpServer);

  return {
    pgl,
    serv,
    handler,
    httpServer,
    cacheKey,
    createdAt: Date.now(),
  };
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
      const schemaLabel = schema?.join(',') || 'unknown';

      // Check cache first
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

      // Single-flight: Check if creation is already in progress for this key
      const inFlight = creating.get(key);
      if (inFlight) {
        log.debug(
          `${label} Coalescing request for PostGraphile[${key}] - waiting for in-flight creation`
        );
        try {
          const instance = await inFlight;
          return instance.handler(req, res, next);
        } catch (error) {
          // Re-throw to be caught by outer try-catch
          throw error;
        }
      }

      // We're the first request for this key - start creation
      log.info(
        `${label} Building PostGraphile v5 handler key=${key} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`
      );

      const pgConfig = getPgEnvOptions({
        ...opts.pg,
        database: dbname,
      });
      const connectionString = buildConnectionString(
        pgConfig.user,
        pgConfig.password,
        pgConfig.host,
        pgConfig.port,
        pgConfig.database
      );

      // Create promise and store in in-flight map
      const creationPromise = createGraphileInstance(
        opts,
        connectionString,
        schema || [],
        anonRole,
        roleName,
        key
      );
      creating.set(key, creationPromise);

      try {
        const instance = await creationPromise;
        graphileCache.set(key, instance);
        log.info(`${label} Cached PostGraphile v5 handler key=${key} db=${dbname}`);
        return instance.handler(req, res, next);
      } catch (error) {
        log.error(`${label} Failed to create PostGraphile[${key}]:`, error);
        throw new HandlerCreationError(
          `Failed to create handler for ${key}: ${error instanceof Error ? error.message : String(error)}`,
          { cacheKey: key, cause: error instanceof Error ? error.message : String(error) }
        );
      } finally {
        // Always clean up in-flight tracker
        creating.delete(key);
      }
    } catch (e: any) {
      log.error(`${label} PostGraphile middleware error`, e);
      return res.status(500).send(e.message);
    }
  };
};
