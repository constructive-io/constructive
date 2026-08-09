import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';

import { createUnifiedAuthService } from './service';
import type {
  ContinueUnifiedLoginInput,
  StartProviderAuthenticationInput,
  StartUnifiedLoginInput,
  UnifiedAuthGraphQLContext,
  UnifiedPasswordInput
} from './types';

interface InputArguments<T> {
  input: T;
}

export const createUnifiedAuthPlugin = (
  oauthEnabled: boolean
): GraphileConfig.Plugin => {
  const service = createUnifiedAuthService(oauthEnabled);

  return extendSchema({
    typeDefs: gql`
      enum UnifiedAuthSignInMode {
        CONFIRM_BEFORE_SIGN_IN
        SILENT
      }

      type UnifiedAuthProvider {
        key: String!
        displayName: String!
      }

      type UnifiedAuthSite {
        id: UUID!
        displayName: String!
        iconUrl: String
        themeColor: String
      }

      type UnifiedAuthAccount {
        id: UUID!
        displayName: String!
        avatarUrl: String
      }

      type StartProviderAuthenticationPayload {
        authorizationUrl: String!
      }

      type StartUnifiedLoginPayload {
        transactionId: String!
        site: UnifiedAuthSite!
        signInMode: UnifiedAuthSignInMode!
        reusableAuthentication: Boolean!
        currentAccount: UnifiedAuthAccount
        providers: [UnifiedAuthProvider!]!
      }

      type UnifiedLoginContinuationPayload {
        transactionId: String!
        authenticated: Boolean!
        continuationUrl: String
      }

      type UnifiedLoginCredentialPayload {
        transactionId: String!
        authenticated: Boolean!
        credentialId: UUID!
        userId: UUID!
        accessToken: String!
        accessTokenExpiresAt: Datetime!
        isVerified: Boolean!
        totpEnabled: Boolean!
        continuationUrl: String
      }

      input StartUnifiedLoginInput {
        siteId: UUID!
        callbackUrl: String
        returnTo: String
        siteState: String!
      }

      input ContinueUnifiedLoginInput {
        transactionId: String!
      }

      input UnifiedPasswordInput {
        transactionId: String!
        email: String!
        password: String!
        rememberMe: Boolean = false
        deviceToken: String
      }

      input StartProviderAuthenticationInput {
        transactionId: String!
        providerKey: String!
      }

      extend type Query {
        unifiedAuthProviders: [UnifiedAuthProvider!]!
      }

      extend type Mutation {
        startUnifiedLogin(input: StartUnifiedLoginInput!): StartUnifiedLoginPayload!
        confirmUnifiedLogin(input: ContinueUnifiedLoginInput!): UnifiedLoginContinuationPayload!
        signInUnifiedLogin(input: UnifiedPasswordInput!): UnifiedLoginCredentialPayload!
        signUpUnifiedLogin(input: UnifiedPasswordInput!): UnifiedLoginCredentialPayload!
        startProviderAuthentication(input: StartProviderAuthenticationInput!): StartProviderAuthenticationPayload!
      }
    `,
    resolvers: {
      Query: {
        unifiedAuthProviders: (
          _source: unknown,
          _args: Record<string, never>,
          context: UnifiedAuthGraphQLContext
        ) => service.providers(context)
      },
      Mutation: {
        startUnifiedLogin: (
          _source: unknown,
          args: InputArguments<StartUnifiedLoginInput>,
          context: UnifiedAuthGraphQLContext
        ) => service.start(context, args.input),
        confirmUnifiedLogin: (
          _source: unknown,
          args: InputArguments<ContinueUnifiedLoginInput>,
          context: UnifiedAuthGraphQLContext
        ) => service.confirm(context, args.input),
        signInUnifiedLogin: (
          _source: unknown,
          args: InputArguments<UnifiedPasswordInput>,
          context: UnifiedAuthGraphQLContext
        ) => service.signIn(context, args.input),
        signUpUnifiedLogin: (
          _source: unknown,
          args: InputArguments<UnifiedPasswordInput>,
          context: UnifiedAuthGraphQLContext
        ) => service.signUp(context, args.input),
        startProviderAuthentication: (
          _source: unknown,
          args: InputArguments<StartProviderAuthenticationInput>,
          context: UnifiedAuthGraphQLContext
        ) => service.startProvider(context, args.input)
      }
    }
  }, 'UnifiedAuthPlugin');
};
