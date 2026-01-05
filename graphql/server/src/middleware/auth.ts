import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import './types'; // for Request type
import { createRequestScopedLogger } from './request-logger';

const log = createRequestScopedLogger('auth');

export const createAuthenticateMiddleware = (
  opts: PgpmOptions
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    log.debug(req, 'Auth middleware started');

    const api = req.api;
    if (!api) {
      log.error(req, 'Missing API info in auth middleware');
      res.status(500).send('Missing API info');
      return;
    }

    const pool = getPgPool({
      ...opts.pg,
      database: api.dbname,
    });
    const rlsModule = api.rlsModule;

    if (!rlsModule) {
      log.debug(req, 'No RLS module configured, skipping authentication');
      return next();
    }

    const authFn = opts.server.strictAuth
      ? rlsModule.authenticateStrict
      : rlsModule.authenticate;

    log.debug(
      req,
      `Using auth function: ${authFn} (strictAuth=${opts.server.strictAuth})`
    );

    if (authFn && rlsModule.privateSchema.schemaName) {
      const { authorization = '' } = req.headers;
      const [authType, authToken] = authorization.split(' ');
      let token: any = {};

      const hasToken = authType?.toLowerCase() === 'bearer' && authToken;
      log.debug(
        req,
        `Authorization header: type=${authType || 'none'}, hasToken=${!!hasToken}, tokenLength=${authToken?.length || 0}`
      );

      if (hasToken) {
        const context: Record<string, any> = {
          'jwt.claims.ip_address': req.clientIp,
        };

        if (req.get('origin')) {
          context['jwt.claims.origin'] = req.get('origin');
        }
        if (req.get('User-Agent')) {
          context['jwt.claims.user_agent'] = req.get('User-Agent');
        }

        log.debug(
          req,
          `Validating token via ${rlsModule.privateSchema.schemaName}.${authFn}()`
        );

        try {
          const result = await pgQueryContext({
            client: pool,
            context,
            query: `SELECT * FROM "${rlsModule.privateSchema.schemaName}"."${authFn}"($1)`,
            variables: [authToken],
          });

          if (result?.rowCount === 0) {
            log.warn(
              req,
              'Token validation returned no rows - UNAUTHENTICATED'
            );
            res.status(200).json({
              errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
            });
            return;
          }

          token = result.rows[0];
          log.debug(
            req,
            `Token validated successfully: user_id=${token.user_id}, token_id=${token.id}`
          );
        } catch (e: any) {
          log.error(req, `Token validation error: ${e.message}`, e);
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
        log.debug(req, 'No bearer token provided, proceeding as anonymous');
      }

      req.token = token;

      if (token.user_id) {
        log.debug(req, `Request authenticated: user_id=${token.user_id}`);
      }
    }

    next();
  };
};
