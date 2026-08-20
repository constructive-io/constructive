// import Networks from '@pyramation/crypto-networks';
// import { verifyMessage } from '@pyramation/crypto-keys';
import { QuoteUtils } from '@pgsql/quotes';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';
import pgQueryWithContext from 'pg-query-context';

export interface PublicKeyChallengeConfig {
  schema: string;
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
    throw new Error(
      `PublicKeySignature: invalid ${label} "${name}" — must match /^[a-z_][a-z0-9_]*$/`
    );
  }
}

function validateCryptoNetwork(name: string): void {
  if (!SAFE_CRYPTO_NETWORK.test(name)) {
    throw new Error(
      'PublicKeySignature: invalid crypto_network — must match /^[a-z0-9_-]{1,64}$/i'
    );
  }
}

const MAX_PUBLIC_KEY_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_SIGNATURE_LENGTH = 1024;

export const PublicKeySignature = (
  pubkey_challenge: PublicKeyChallengeConfig
): GraphileConfig.Plugin => {
  const {
    schema,
    crypto_network,
    sign_up_with_key,
    sign_in_request_challenge,
    sign_in_record_failure,
    sign_in_with_challenge,
  } = pubkey_challenge;

  validateIdentifier(schema, 'schema');
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
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
          });

          return lambda($combined, async ({ input, withPgClient }: any) => {
            if (
              !input.publicKey ||
              typeof input.publicKey !== 'string' ||
              input.publicKey.length > MAX_PUBLIC_KEY_LENGTH
            ) {
              throw new Error('INVALID_PUBLIC_KEY');
            }

            return withPgClient(null, async (pgClient: any) => {
              await pgClient.query('BEGIN');
              try {
                await pgQueryWithContext({
                  client: pgClient,
                  context: { role: 'anonymous' },
                  query: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_up_with_key)}($1)`,
                  variables: [input.publicKey],
                  skipTransaction: true,
                });

                const {
                  rows: [{ [sign_in_request_challenge]: message }],
                } = await pgQueryWithContext({
                  client: pgClient,
                  context: { role: 'anonymous' },
                  query: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_in_request_challenge)}($1)`,
                  variables: [input.publicKey],
                  skipTransaction: true,
                });

                await pgClient.query('COMMIT');
                return { message };
              } catch (err) {
                await pgClient.query('ROLLBACK');
                throw err;
              }
            });
          });
        },

        getMessageForSigning(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
          });

          return lambda($combined, async ({ input, withPgClient }: any) => {
            if (
              !input.publicKey ||
              typeof input.publicKey !== 'string' ||
              input.publicKey.length > MAX_PUBLIC_KEY_LENGTH
            ) {
              throw new Error('INVALID_PUBLIC_KEY');
            }

            return withPgClient(null, async (pgClient: any) => {
              const {
                rows: [{ [sign_in_request_challenge]: message }],
              } = await pgQueryWithContext({
                client: pgClient,
                context: { role: 'anonymous' },
                query: `SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(schema, sign_in_request_challenge)}($1)`,
                variables: [input.publicKey],
              });

              if (!message) throw new Error('NO_ACCOUNT_EXISTS');

              return { message };
            });
          });
        },

        // Signature verification must remain fail-closed until a cryptographic
        // verifier is implemented. A runtime flag cannot safely enable the old
        // path because that path never used the submitted signature.
        verifyMessageForSigning(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $combined = object({ input: $input });

          return lambda($combined, async ({ input }: any) => {
            const { publicKey, message, signature } = input;

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
              !signature ||
              typeof signature !== 'string' ||
              signature.length > MAX_SIGNATURE_LENGTH
            ) {
              throw new Error('INVALID_SIGNATURE');
            }

            throw new Error('FEATURE_DISABLED');
          });
        },
      },
    },
  }));
};

export default PublicKeySignature;
