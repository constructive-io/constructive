// import Networks from '@pyramation/crypto-networks';
// import { verifyMessage } from '@pyramation/crypto-keys';
import {
  assertCompletePgSettings,
  type PgSettings,
  withPgSettingsRole,
} from '@constructive-io/express-context';
import type { PgClient, PgClientResult, WithPgClient } from '@dataplan/pg';
import { QuoteUtils } from '@pgsql/quotes';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';

export interface PublicKeyChallengeConfig {
  schema: string;
  /** Exact anonymous role configured for this Graphile API surface. */
  anonymousRole: string;
  crypto_network: string;
  // crypto_network: keyof typeof Networks;
  sign_up_with_key: string;
  sign_in_request_challenge: string;
  sign_in_record_failure: string;
  sign_in_with_challenge: string;
}

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const SAFE_CRYPTO_NETWORK = /^[a-z0-9_-]{1,64}$/i;

function validateIdentifier(name: string, label: string): void {
  if (typeof name !== 'string' || !SAFE_IDENTIFIER.test(name)) {
    throw new Error(
      `PublicKeySignature: invalid ${label} "${name}" — must match /^[a-z_][a-z0-9_]*$/`
    );
  }
}

function validateCryptoNetwork(name: string): void {
  if (typeof name !== 'string' || !SAFE_CRYPTO_NETWORK.test(name)) {
    throw new Error(
      'PublicKeySignature: invalid crypto_network — must match /^[a-z0-9_-]{1,64}$/i',
    );
  }
}

const MAX_PUBLIC_KEY_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_SIGNATURE_LENGTH = 1024;
const ENABLE_SIGNATURE_VERIFICATION = process.env.ENABLE_SIGNATURE_VERIFICATION === 'true';

/**
 * Run a public-key authentication operation with the request's complete GUC
 * context while retaining the deliberately anonymous database role.
 */
export async function withAnonymousPublicKeyClient<T>(
  withPgClient: unknown,
  pgSettings: unknown,
  anonymousRole: string,
  callback: (pgClient: PgClient) => T | Promise<T>
): Promise<T> {
  if (typeof withPgClient !== 'function') {
    throw new Error('PUBLIC_KEY_PG_CLIENT_CONTEXT_UNAVAILABLE');
  }
  assertCompletePgSettings(pgSettings, 'PublicKeySignature pgSettings');
  validateIdentifier(anonymousRole, 'anonymousRole');

  const anonymousSettings: PgSettings = withPgSettingsRole(
    pgSettings,
    anonymousRole
  );
  return (withPgClient as WithPgClient)(anonymousSettings, callback);
}

/** Use @dataplan/pg's native query-config contract for every public-key call. */
export function queryPublicKeyFunction<TData>(
  pgClient: Pick<PgClient, 'query'>,
  schema: string,
  functionName: string,
  values: any[]
): Promise<PgClientResult<TData>> {
  validateIdentifier(schema, 'schema');
  validateIdentifier(functionName, 'function');
  return pgClient.query<TData>({
    text: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, functionName)}(${values.map((_, index) => `$${index + 1}`).join(', ')})`,
    values,
  });
}

export const PublicKeySignature = (
  pubkey_challenge: PublicKeyChallengeConfig
): GraphileConfig.Plugin => {
  const {
    schema,
    anonymousRole,
    crypto_network,
    sign_up_with_key,
    sign_in_request_challenge,
    sign_in_record_failure,
    sign_in_with_challenge
  } = pubkey_challenge;

  validateIdentifier(schema, 'schema');
  validateIdentifier(anonymousRole, 'anonymousRole');
  validateIdentifier(sign_up_with_key, 'sign_up_with_key');
  validateIdentifier(sign_in_request_challenge, 'sign_in_request_challenge');
  validateIdentifier(sign_in_record_failure, 'sign_in_record_failure');
  validateIdentifier(sign_in_with_challenge, 'sign_in_with_challenge');
  validateCryptoNetwork(crypto_network);

  return extendSchema(() => ({
    typeDefs: gql`
      input CreateUserAccountWithPublicKeyInput {
        publicKey: String!
      }

      input GetMessageForSigningInput {
        publicKey: String!
      }

      input VerifyMessageForSigningInput {
        publicKey: String!
        message: String!
        signature: String!
      }

      type createUserAccountWithPublicKeyPayload {
        message: String!
      }

      type getMessageForSigningPayload {
        message: String!
      }

      type verifyMessageForSigningPayload {
        access_token: String!
        access_token_expires_at: Datetime!
      }

      extend type Mutation {
        createUserAccountWithPublicKey(
          input: CreateUserAccountWithPublicKeyInput
        ): createUserAccountWithPublicKeyPayload

        getMessageForSigning(
          input: GetMessageForSigningInput
        ): getMessageForSigningPayload

        verifyMessageForSigning(
          input: VerifyMessageForSigningInput
        ): verifyMessageForSigningPayload
      }
    `,
    plans: {
      Mutation: {
        createUserAccountWithPublicKey(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda(
            $combined,
            async ({ input, withPgClient, pgSettings }: any) => {
              if (
                !input.publicKey ||
                typeof input.publicKey !== 'string' ||
                input.publicKey.length > MAX_PUBLIC_KEY_LENGTH
              ) {
                throw new Error('INVALID_PUBLIC_KEY');
              }

              return withAnonymousPublicKeyClient(
                withPgClient,
                pgSettings,
                anonymousRole,
                async (pgClient) => {
                  await queryPublicKeyFunction(
                    pgClient,
                    schema,
                    sign_up_with_key,
                    [input.publicKey]
                  );

                  const {
                    rows: [{ [sign_in_request_challenge]: message }],
                  } = await queryPublicKeyFunction<Record<string, unknown>>(
                    pgClient,
                    schema,
                    sign_in_request_challenge,
                    [input.publicKey]
                  );

                  return { message };
                }
              );
            }
          );
        },

        getMessageForSigning(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda(
            $combined,
            async ({ input, withPgClient, pgSettings }: any) => {
              if (
                !input.publicKey ||
                typeof input.publicKey !== 'string' ||
                input.publicKey.length > MAX_PUBLIC_KEY_LENGTH
              ) {
                throw new Error('INVALID_PUBLIC_KEY');
              }

              return withAnonymousPublicKeyClient(
                withPgClient,
                pgSettings,
                anonymousRole,
                async (pgClient) => {
                  const {
                    rows: [{ [sign_in_request_challenge]: message }],
                  } = await queryPublicKeyFunction<Record<string, unknown>>(
                    pgClient,
                    schema,
                    sign_in_request_challenge,
                    [input.publicKey]
                  );

                  if (!message) throw new Error('NO_ACCOUNT_EXISTS');

                  return { message };
                }
              );
            }
          );
        },

        // NOTE: Verification remains behind a feature flag until crypto
        // verification is re-implemented.
        verifyMessageForSigning(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda(
            $combined,
            async ({ input, withPgClient, pgSettings }: any) => {
              const { publicKey, message, signature: _signature } = input;

              if (
                !publicKey ||
                typeof publicKey !== 'string' ||
                publicKey.length > MAX_PUBLIC_KEY_LENGTH
              ) {
                throw new Error('INVALID_PUBLIC_KEY');
              }
              if (
                !message ||
                typeof message !== 'string' ||
                message.length > MAX_MESSAGE_LENGTH
              ) {
                throw new Error('INVALID_MESSAGE');
              }
              if (
                !_signature ||
                typeof _signature !== 'string' ||
                _signature.length > MAX_SIGNATURE_LENGTH
              ) {
                throw new Error('INVALID_SIGNATURE');
              }

              if (!ENABLE_SIGNATURE_VERIFICATION) {
                // Fail closed without mutating lockout counters while verification
                // is disabled.
                throw new Error('FEATURE_DISABLED');
              }

              return withAnonymousPublicKeyClient(
                withPgClient,
                pgSettings,
                anonymousRole,
                async (pgClient) => {
                  const {
                    rows: [token],
                  } = await queryPublicKeyFunction<Record<string, unknown>>(
                    pgClient,
                    schema,
                    sign_in_with_challenge,
                    [publicKey, message]
                  );

                  if (!token?.access_token) throw new Error('BAD_SIGNIN');

                  return {
                    access_token: token.access_token,
                    access_token_expires_at: token.access_token_expires_at,
                  };
                }
              );
            }
          );
        },
      },
    },
  }));
};

export default PublicKeySignature;
