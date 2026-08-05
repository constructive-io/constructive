// import Networks from '@pyramation/crypto-networks';
// import { verifyMessage } from '@pyramation/crypto-keys';
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
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`PublicKeySignature: invalid ${label} "${name}" — must match /^[a-z_][a-z0-9_]*$/`);
  }
}

function validateCryptoNetwork(name: string): void {
  if (!SAFE_CRYPTO_NETWORK.test(name)) {
    throw new Error(
      'PublicKeySignature: invalid crypto_network — must match /^[a-z0-9_-]{1,64}$/i',
    );
  }
}

const MAX_PUBLIC_KEY_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_SIGNATURE_LENGTH = 1024;
const ENABLE_SIGNATURE_VERIFICATION = process.env.ENABLE_SIGNATURE_VERIFICATION === 'true';

type PublicKeyPgSettings = Record<string, string | undefined>;

export type PublicKeyPgClient = {
  query<TData = Record<string, unknown>>(opts: {
    text: string;
    values?: unknown[];
  }): Promise<{ rows: TData[] }>;
};

export type PublicKeyWithPgClient = <T>(
  pgSettings: PublicKeyPgSettings,
  callback: (pgClient: PublicKeyPgClient) => Promise<T> | T,
) => Promise<T>;

/**
 * Run a public-key authentication operation in the request's complete GUC
 * context while retaining the plugin's deliberately anonymous database role.
 *
 * The copy is important: Grafast's request context remains immutable, and the
 * role override cannot leak back into other plans sharing that context.
 */
export async function withAnonymousPublicKeyClient<T>(
  withPgClient: PublicKeyWithPgClient | null | undefined,
  pgSettings: unknown,
  anonymousRole: string,
  callback: (pgClient: PublicKeyPgClient) => Promise<T> | T,
): Promise<T> {
  if (typeof withPgClient !== 'function') {
    throw new Error('PG_CLIENT_CONTEXT_UNAVAILABLE');
  }
  if (typeof pgSettings !== 'object' || pgSettings === null || Array.isArray(pgSettings)) {
    throw new Error('PG_SETTINGS_UNAVAILABLE');
  }
  validateIdentifier(anonymousRole, 'anonymousRole');

  return withPgClient(
    {
      ...(pgSettings as PublicKeyPgSettings),
      role: anonymousRole,
    },
    callback,
  );
}

export const PublicKeySignature = (pubkey_challenge: PublicKeyChallengeConfig): GraphileConfig.Plugin => {
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

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            if (!input.publicKey || typeof input.publicKey !== 'string' || input.publicKey.length > MAX_PUBLIC_KEY_LENGTH) {
              throw new Error('INVALID_PUBLIC_KEY');
            }

            return withAnonymousPublicKeyClient(withPgClient, pgSettings, anonymousRole, async (pgClient) => {
              await pgClient.query({
                text: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_up_with_key)}($1)`,
                values: [input.publicKey],
              });

              const {
                rows: [{ [sign_in_request_challenge]: message }]
              } = await pgClient.query<Record<string, unknown>>({
                text: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_in_request_challenge)}($1)`,
                values: [input.publicKey],
              });

              return { message };
            });
          });
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

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            if (!input.publicKey || typeof input.publicKey !== 'string' || input.publicKey.length > MAX_PUBLIC_KEY_LENGTH) {
              throw new Error('INVALID_PUBLIC_KEY');
            }

            return withAnonymousPublicKeyClient(withPgClient, pgSettings, anonymousRole, async (pgClient) => {
              const {
                rows: [{ [sign_in_request_challenge]: message }]
              } = await pgClient.query<Record<string, unknown>>({
                text: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_in_request_challenge)}($1)`,
                values: [input.publicKey],
              });

              if (!message) throw new Error('NO_ACCOUNT_EXISTS');

              return { message };
            });
          });
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

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const { publicKey, message, signature: _signature } = input;

            if (!publicKey || typeof publicKey !== 'string' || publicKey.length > MAX_PUBLIC_KEY_LENGTH) {
              throw new Error('INVALID_PUBLIC_KEY');
            }
            if (!message || typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
              throw new Error('INVALID_MESSAGE');
            }
            if (!_signature || typeof _signature !== 'string' || _signature.length > MAX_SIGNATURE_LENGTH) {
              throw new Error('INVALID_SIGNATURE');
            }

            if (!ENABLE_SIGNATURE_VERIFICATION) {
              // Fail closed without mutating lockout counters while verification
              // is disabled.
              throw new Error('FEATURE_DISABLED');
            }

            return withAnonymousPublicKeyClient(withPgClient, pgSettings, anonymousRole, async (pgClient) => {
              const {
                rows: [token]
              } = await pgClient.query<Record<string, unknown>>({
                text: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_in_with_challenge)}($1, $2)`,
                values: [publicKey, message],
              });

              if (!token?.access_token) throw new Error('BAD_SIGNIN');

              return {
                access_token: token.access_token,
                access_token_expires_at: token.access_token_expires_at
              };
            });
          });
        }
      }
    }
  }));
};

export default PublicKeySignature;
