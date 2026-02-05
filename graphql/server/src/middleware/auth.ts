import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import './types'; // for Request type

const log = new Logger('auth');
const isDev = () => getNodeEnv() === 'development';

export const createAuthenticateMiddleware = (
  opts: PgpmOptions
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const api = req.api;
    log.info(`[auth] middleware called, api=${api ? 'present' : 'missing'}`);
    if (!api) {
      res.status(500).send('Missing API info');
      return;
    }

    const pool = getPgPool({
      ...opts.pg,
      database: api.dbname,
    });
    const rlsModule = api.rlsModule;

    log.info(
      `[auth] rlsModule=${rlsModule ? 'present' : 'missing'}, ` +
        `authenticate=${rlsModule?.authenticate ?? 'none'}, ` +
        `authenticateStrict=${rlsModule?.authenticateStrict ?? 'none'}, ` +
        `privateSchema=${rlsModule?.privateSchema?.schemaName ?? 'none'}`
    );

    if (!rlsModule) {
      log.info('[auth] No RLS module configured, skipping auth');
      return next();
    }

    const authFn = opts.server?.strictAuth
      ? rlsModule.authenticateStrict
      : rlsModule.authenticate;

    log.info(
      `[auth] strictAuth=${opts.server?.strictAuth ?? false}, authFn=${authFn ?? 'none'}`
    );

    if (authFn && rlsModule.privateSchema.schemaName) {
      const { authorization = '' } = req.headers;
      const [authType, authToken] = authorization.split(' ');
      let token: any = {};

      log.info(
        `[auth] authorization header present=${!!authorization}, ` +
          `authType=${authType ?? 'none'}, hasToken=${!!authToken}`
      );

      if (authType?.toLowerCase() === 'bearer' && authToken) {
        log.info('[auth] Processing bearer token authentication');
        const context: Record<string, any> = {
          'jwt.claims.ip_address': req.clientIp,
        };

        if (req.get('origin')) {
          context['jwt.claims.origin'] = req.get('origin');
        }
        if (req.get('User-Agent')) {
          context['jwt.claims.user_agent'] = req.get('User-Agent');
        }

        const authQuery = `SELECT * FROM "${rlsModule.privateSchema.schemaName}"."${authFn}"($1)`;
        log.info(`[auth] Executing auth query: ${authQuery}`);

        try {
          const result = await pgQueryContext({
            client: pool,
            context,
            query: authQuery,
            variables: [authToken],
          });

          log.info(`[auth] Query result: rowCount=${result?.rowCount}`);

          if (result?.rowCount === 0) {
            log.info('[auth] No rows returned, returning UNAUTHENTICATED');
            res.status(200).json({
              errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
            });
            return;
          }

          token = result.rows[0];
          log.info(`[auth] Auth success: role=${token.role}, user_id=${token.user_id}`);
        } catch (e: any) {
          log.error('[auth] Auth error:', e.message);
          res.status(200).json({
            errors: [
              {
                extensions: {
                  code: 'BAD_TOKEN_DEFINITION',
                  message: e.message,
                },
              },
            ],
          });
          return;
        }
      } else {
        log.info('[auth] No bearer token provided, using anonymous auth');
      }

      req.token = token;
    } else {
      log.info(
        `[auth] Skipping auth: authFn=${authFn ?? 'none'}, ` +
          `privateSchema=${rlsModule.privateSchema?.schemaName ?? 'none'}`
      );
    }

    next();
  };
};
