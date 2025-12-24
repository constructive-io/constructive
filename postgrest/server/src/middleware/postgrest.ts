import { Logger } from '@pgpmjs/logger';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { LRUCache } from 'lru-cache';
import { getPgPool } from 'pg-cache';
import postgrest from 'postgrest';
import './types';

const log = new Logger('postgrest');

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR_IN_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

export const postgrestCache = new LRUCache<string, { server: any; pgPoolKey: string }>({
  max: 25,
  ttl: ONE_YEAR,
  updateAgeOnGet: true,
  dispose: (value, key) => {
    log.debug(`Disposing PostgREST server[${key}]`);
    if (value?.server?.stop) {
      value.server.stop();
    }
  }
});

export interface PostgRESTMiddlewareOptions extends PgpmOptions {
  postgrest?: {
    maxRows?: number;
    preRequest?: string;
  };
}

export const createPostgrestMiddleware = (opts: PostgRESTMiddlewareOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const api = req.api;
      if (!api) {
        return res.status(500).json({ error: 'Missing API info' });
      }
      const key = req.svc_key;
      if (!key) {
        return res.status(500).json({ error: 'Missing service cache key' });
      }
      const { dbname, anonRole, roleName, schema } = api;

      if (postgrestCache.has(key)) {
        const { server } = postgrestCache.get(key)!;
        return proxyToPostgrest(req, res, server, opts);
      }

      const pgPool = getPgPool({
        ...opts.pg,
        database: dbname,
      });

      const dbUri = buildDbUri(opts.pg, dbname);
      const dbSchema = schema.join(',');

      const serverConfig: any = {
        dbUri,
        dbSchema,
        dbAnonRole: anonRole,
        serverPort: 0,
      };

      if (opts.postgrest?.maxRows) {
        serverConfig.maxRows = opts.postgrest.maxRows;
      }

      if (opts.postgrest?.preRequest) {
        serverConfig.preRequest = opts.postgrest.preRequest;
      }

      const server = postgrest.startServer(serverConfig);

      postgrestCache.set(key, {
        server,
        pgPoolKey: dbname,
      });

      return proxyToPostgrest(req, res, server, opts);
    } catch (e: any) {
      log.error('PostgREST middleware error', e);
      return res.status(500).json({ error: e.message });
    }
  };
};

const buildDbUri = (pgConfig: any, database: string): string => {
  const user = pgConfig.user || 'postgres';
  const password = pgConfig.password || '';
  const host = pgConfig.host || 'localhost';
  const port = pgConfig.port || 5432;
  
  if (password) {
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }
  return `postgres://${user}@${host}:${port}/${database}`;
};

const proxyToPostgrest = async (
  req: Request,
  res: Response,
  server: any,
  opts: PostgRESTMiddlewareOptions
): Promise<void> => {
  const api = req.api!;
  const { anonRole, roleName } = api;

  const role = req.token?.user_id ? roleName : anonRole;

  const context: Record<string, string> = {
    role,
  };

  if (req.databaseId) {
    context['request.jwt.claims.database_id'] = req.databaseId;
  }
  if (req.clientIp) {
    context['request.jwt.claims.ip_address'] = req.clientIp;
  }
  if (req.get('origin')) {
    context['request.jwt.claims.origin'] = req.get('origin') as string;
  }
  if (req.get('User-Agent')) {
    context['request.jwt.claims.user_agent'] = req.get('User-Agent') as string;
  }
  if (req.token?.user_id) {
    context['request.jwt.claims.user_id'] = req.token.user_id;
  }
  if (req.token?.id) {
    context['request.jwt.claims.token_id'] = req.token.id;
  }

  try {
    const response = await server.handle(req, context);
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
    }
    
    res.status(response.status || 200);
    
    if (response.body) {
      res.json(response.body);
    } else {
      res.end();
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
