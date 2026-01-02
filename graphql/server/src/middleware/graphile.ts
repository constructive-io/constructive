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

      const options = getSettings({
        ...opts,
        graphile: {
          ...opts.graphile,
          schema: schema,
        },
      });

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

      // Always include the internal SecretsManagement plugin so that
      // GraphQL can manage secret metadata and delegate values to
      // external providers such as OpenBao. The plugin code is
      // responsible for enforcing that values are never exposed via
      // public queries.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SecretsManagement = require('../plugins/SecretsManagement').default;
        if (SecretsManagement) {
          options.appendPlugins.push(SecretsManagement);
        }
      } catch {
        // If the plugin cannot be loaded for some reason, continue
        // without it; this preserves server startup in environments
        // that do not yet include the plugin.
      }


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

      const pgPool = getPgPool({
        ...opts.pg,
        database: dbname,
      });
      const handler = postgraphile(pgPool, schema, graphileOpts);

      graphileCache.set(key, {
        pgPool,
        pgPoolKey: dbname,
        handler,
      });

      return handler(req, res, next);
    } catch (e: any) {
      return res.status(500).send(e.message);
    }
  };
};
