import type { ConstructiveContext } from '@constructive-io/express-context';
import { context as grafastContext, lambda } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';

import { listDiscoverableOAuthProviders } from '../oauth-provider';

export const createOAuthProviderDiscoveryPlugin = (
  oauthEnabled: boolean
): GraphileConfig.Plugin =>
  extendSchema(
    () => ({
      typeDefs: gql`
        type OAuthProvider {
          slug: String!
          displayName: String!
        }

        extend type Query {
          oauthProviders: [OAuthProvider!]!
        }
      `,
      plans: {
        Query: {
          oauthProviders() {
            const $constructive = (grafastContext() as any).get('constructive');
            return lambda($constructive, async (value: unknown) => {
              const ctx = value as ConstructiveContext | undefined;
              if (!oauthEnabled || !ctx) return [];
              const providers = await ctx.useModule('identityProviders');
              return listDiscoverableOAuthProviders(providers);
            });
          },
        },
      },
    }),
    'OAuthProviderDiscoveryPlugin'
  );
