import { join } from 'node:path';

import { buildPgSettings } from '@constructive-io/express-context';
import { createI18nPlugin } from 'graphile-i18n';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';

import { PublicKeySignature } from '../src/plugins/PublicKeySignature';

const api = {
  apiId: 'api-1',
  databaseId: 'database-1',
  dbname: 'request_context_db',
  anonRole: 'anonymous',
  roleName: 'authenticated',
  schema: ['request_context_test'],
};

const settings = (userId: string | null, requestId: string) =>
  buildPgSettings({
    api,
    token: userId ? { id: 'token-1', user_id: userId } : null,
    requestId,
  });

describe('complete Graphile request context integration', () => {
  let db: any;
  let teardown: () => Promise<void>;
  let query: <T = unknown>(
    document: string,
    variables?: Record<string, unknown>,
    commit?: boolean,
    reqOptions?: Record<string, unknown>
  ) => Promise<GraphQLResponse<T>>;

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas: ['request_context_test'],
        authRole: 'authenticated',
        preset: {
          plugins: [
            createI18nPlugin({ defaultLanguages: ['en'] }),
            PublicKeySignature({
              schema: 'request_context_test',
              anonymousRole: 'anonymous',
              crypto_network: 'test',
              sign_up_with_key: 'sign_up_with_key',
              sign_in_request_challenge: 'sign_in_request_challenge',
              sign_in_record_failure: 'sign_in_record_failure',
              sign_in_with_challenge: 'sign_in_with_challenge',
            }),
          ],
        },
      },
      [
        seed.fn(async ({ admin, config, connect }) => {
          await admin.streamSql(
            `DO $roles$
             BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anonymous') THEN
                 EXECUTE 'CREATE ROLE anonymous';
               END IF;
               IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
                 EXECUTE 'CREATE ROLE authenticated';
               END IF;
             END
             $roles$;`,
            config.database
          );
          const appUser = connect.connections?.app?.user;
          if (!appUser)
            throw new Error('request-context test requires an app user');
          await admin.grantRole('anonymous', appUser, config.database);
          await admin.grantRole('authenticated', appUser, config.database);
        }),
        seed.sqlfile([join(__dirname, 'request-context.setup.sql')]),
      ]
    );
    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
  }, 30_000);

  afterAll(async () => {
    if (teardown) await teardown();
  });

  beforeEach(async () => {
    if (db) await db.beforeEach();
  });

  afterEach(async () => {
    if (db) await db.afterEach();
  });

  it('preserves the PublicKeySignature mutation schema contract', async () => {
    const result = await query<{
      mutationType: {
        fields: Array<{
          name: string;
          args: Array<{
            name: string;
            type: {
              kind: string;
              name: string | null;
              ofType: { kind: string; name: string | null } | null;
            };
          }>;
          type: { kind: string; name: string | null };
        }>;
      } | null;
    }>(
      `
      query PublicKeySchemaContract {
        mutationType: __type(name: "Mutation") {
          fields {
            name
            args {
              name
              type {
                kind
                name
                ofType { kind name }
              }
            }
            type { kind name }
          }
        }
      }
    `,
      undefined,
      false,
      { pgSettings: settings(null, 'schema-contract') }
    );

    expect(result.errors).toBeUndefined();
    const fields = result.data?.mutationType?.fields
      .filter((field) =>
        [
          'createUserAccountWithPublicKey',
          'getMessageForSigning',
          'verifyMessageForSigning',
        ].includes(field.name)
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    expect(fields).toEqual([
      {
        name: 'createUserAccountWithPublicKey',
        args: [
          {
            name: 'input',
            type: {
              kind: 'INPUT_OBJECT',
              name: 'CreateUserAccountWithPublicKeyInput',
              ofType: null,
            },
          },
        ],
        type: {
          kind: 'OBJECT',
          name: 'createUserAccountWithPublicKeyPayload',
        },
      },
      {
        name: 'getMessageForSigning',
        args: [
          {
            name: 'input',
            type: {
              kind: 'INPUT_OBJECT',
              name: 'GetMessageForSigningInput',
              ofType: null,
            },
          },
        ],
        type: {
          kind: 'OBJECT',
          name: 'getMessageForSigningPayload',
        },
      },
      {
        name: 'verifyMessageForSigning',
        args: [
          {
            name: 'input',
            type: {
              kind: 'INPUT_OBJECT',
              name: 'VerifyMessageForSigningInput',
              ofType: null,
            },
          },
        ],
        type: {
          kind: 'OBJECT',
          name: 'verifyMessageForSigningPayload',
        },
      },
    ]);
  });

  it('keeps normal, F13 and anonymous PublicKey lanes isolated', async () => {
    const authenticated = settings('user-1', 'authenticated-request');
    const authenticatedProbe = await query<{
      contextProbe: Record<string, string>;
    }>(
      `
      query AuthenticatedContext {
        contextProbe
      }
    `,
      undefined,
      false,
      { pgSettings: authenticated }
    );

    expect(authenticatedProbe.errors).toBeUndefined();
    expect(authenticatedProbe.data?.contextProbe).toMatchObject({
      currentUser: 'authenticated',
      userId: 'user-1',
      apiId: 'api-1',
      databaseId: 'database-1',
      requestId: 'authenticated-request',
      readOnly: 'off',
      rowSecurity: 'on',
      searchPath: 'pg_catalog, "request_context_test"',
    });

    const anonymous = settings(null, 'anonymous-request');
    const anonymousProbe = await query<{
      contextProbe: Record<string, string>;
    }>(
      `
      query AnonymousContext {
        contextProbe
      }
    `,
      undefined,
      false,
      { pgSettings: anonymous }
    );

    expect(anonymousProbe.errors).toBeUndefined();
    expect(anonymousProbe.data?.contextProbe).toMatchObject({
      currentUser: 'anonymous',
      userId: '',
      apiId: 'api-1',
      databaseId: 'database-1',
      requestId: 'anonymous-request',
    });

    const f13Settings = settings('user-1', 'f13-request');
    const i18nResult = await query<{
      postByRowId: { localeStrings: { title: string } } | null;
    }>(
      `
      query F13Context {
        postByRowId(rowId: 1) {
          localeStrings {
            title
          }
        }
      }
    `,
      undefined,
      false,
      { pgSettings: f13Settings }
    );

    expect(i18nResult.errors).toBeUndefined();
    expect(i18nResult.data?.postByRowId?.localeStrings.title).toBe(
      'Context-approved translation'
    );

    const publicKeyResult = await query<{
      getMessageForSigning: { message: string } | null;
    }>(
      `
      mutation PublicKeyAnonymousLane {
        getMessageForSigning(input: { publicKey: "public-key-1" }) {
          message
        }
      }
    `,
      undefined,
      false,
      { pgSettings: authenticated }
    );

    expect(publicKeyResult.errors).toBeUndefined();
    const publicKeyContext = JSON.parse(
      publicKeyResult.data?.getMessageForSigning?.message ?? '{}'
    );
    expect(publicKeyContext).toMatchObject({
      currentUser: 'anonymous',
      userId: 'user-1',
      apiId: 'api-1',
      databaseId: 'database-1',
      requestId: 'authenticated-request',
      readOnly: 'off',
      rowSecurity: 'on',
      searchPath: 'pg_catalog, "request_context_test"',
    });

    const rollbackResult = await query(
      `
      mutation PublicKeyRollback {
        createUserAccountWithPublicKey(input: { publicKey: "force-rollback" }) {
          message
        }
      }
    `,
      undefined,
      false,
      { pgSettings: authenticated }
    );
    expect(rollbackResult.errors?.[0]?.message).toContain(
      'forced public-key rollback'
    );

    const audit = await db.client.query(
      'SELECT count(*)::int AS count FROM request_context_test.public_key_audit'
    );
    expect(audit.rows[0].count).toBe(0);

    const afterRollback = await query<{ contextProbe: Record<string, string> }>(
      `
      query AfterRollback {
        contextProbe
      }
    `,
      undefined,
      false,
      { pgSettings: anonymous }
    );
    expect(afterRollback.errors).toBeUndefined();
    expect(afterRollback.data?.contextProbe).toMatchObject({
      currentUser: 'anonymous',
      userId: '',
      requestId: 'anonymous-request',
    });
  });
});
