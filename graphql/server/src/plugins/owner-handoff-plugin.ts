import '../middleware/types';

import { QuoteUtils } from '@pgsql/quotes';
import { context as grafastContext, lambda, object, type Step } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';

/**
 * Passwordless owner hand-off (constructive-planning#2511).
 *
 * A platform account that signed in with Google, an emailed link, or a phone
 * code has no password, so it cannot satisfy the tenant's `sign_in`. The
 * platform realm's sign-in procedures already recorded what that sign-in
 * proved in `sign_in_evidence` (method + a proven identifier, bound to the
 * session and the credential it minted). This mutation turns that evidence
 * into the owner's tenant session:
 *
 *   1. the caller must own the target database (never a client-supplied id);
 *   2. the evidence row must belong to this caller and to the credential this
 *      request presented (`jwt.claims.token_id`), and be unexpired/unconsumed;
 *   3. the tenant's own `sign_in_platform_identity` resolves the owner from the
 *      identifier and applies the tenant's MFA / device policy;
 *   4. the tenant mints a one-time, PKCE-bound hand-off code that the desktop
 *      exchanges for the session.
 *
 * The row is consumed by the same statement that reads it, so a retry after a
 * crash cannot replay a proof.
 */

interface PgClient {
  query(opts: { text: string; values?: unknown[] }): Promise<{ rows: Array<Record<string, unknown>> }>;
}

type WithPgClient = <T>(
  pgSettings: Record<string, string> | null,
  cb: (client: PgClient) => Promise<T>
) => Promise<T>;

export interface OwnerHandoffInput {
  /** The signed-in platform user (jwt.claims.user_id). */
  userId: string;
  /** The credential this request presented (jwt.claims.token_id). */
  tokenId: string | null;
  /** The platform database serving the request (where evidence lives). */
  platformDatabaseId: string;
  /** The tenant database to sign the owner into. */
  databaseId: string;
  /** S256 challenge the desktop will present at the exchange. */
  codeChallenge: string;
}

export interface OwnerHandoffResult {
  code: string | null;
  userId: string;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  deviceApprovalRequired: boolean;
  mfaChallengeToken: string | null;
}

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// PKCE S256: 43 base64url characters (32 random bytes). The tenant's
// native_handoff_guard_stmts enforces the same shape when the code is minted.
const S256_CHALLENGE = /^[-_A-Za-z0-9]{43}$/;

function fail(code: string, message: string): never {
  const error = new Error(`${code}: ${message}`) as Error & { code: string };
  error.code = code;
  throw error;
}

const authPrivateSchemaSql = `
  SELECT auth_private.schema_name
    FROM metaschema_modules_public.identity_providers_module providers
    JOIN metaschema_public.schema auth_private ON auth_private.id = providers.private_schema_id
   WHERE providers.database_id = $1
   LIMIT 1
`;

const platformEvidenceSchemaSql = `
  SELECT auth_private.schema_name
    FROM metaschema_modules_public.user_auth_module uam
    JOIN metaschema_public.schema auth_private ON auth_private.id = uam.private_schema_id
   WHERE uam.database_id = $1
   LIMIT 1
`;

/**
 * The SQL half, kept separate from the GraphQL wiring so it can be exercised
 * against a real database. Runs as the request role, with the request's claims
 * already applied: the evidence policy scopes reads to the caller, and the
 * tenant procedures are granted to `authenticated`.
 */
export const mintTenantOwnerHandoff = async (
  tx: PgClient,
  input: OwnerHandoffInput
): Promise<OwnerHandoffResult> => {
  if (!isUuid(input.userId)) fail('UNAUTHENTICATED', 'a platform session is required');
  if (!isUuid(input.databaseId)) fail('BAD_REQUEST', 'databaseId must be a uuid');
  if (!S256_CHALLENGE.test(input.codeChallenge)) {
    fail('BAD_REQUEST', 'codeChallenge must be a 43-character base64url S256 challenge');
  }

  // Ownership is the platform's own row, not a client claim. A missing row and
  // someone else's row answer the same way: the caller may not learn which
  // database ids exist.
  const database = await tx.query({
    text: 'SELECT owner_id::text AS owner_id FROM metaschema_public.database WHERE id = $1',
    values: [input.databaseId]
  });
  const ownerId = database.rows[0]?.owner_id;
  if (typeof ownerId !== 'string') fail('DATABASE_NOT_FOUND', 'no such database');
  if (ownerId !== input.userId) fail('NOT_DATABASE_OWNER', 'only the database owner may hand off a session');

  const evidenceSchema = await tx.query({
    text: platformEvidenceSchemaSql,
    values: [input.platformDatabaseId]
  });
  const evidenceSchemaName = evidenceSchema.rows[0]?.schema_name;
  if (typeof evidenceSchemaName !== 'string') {
    fail('TENANT_AUTH_NOT_PROVISIONED', 'the platform realm has no auth module');
  }

  // Consume and read in one statement: the subselect locks the row, and the
  // outer UPDATE stamps it, so two concurrent calls cannot both spend it.
  const evidenceTable = QuoteUtils.quoteQualifiedIdentifier(evidenceSchemaName, 'sign_in_evidence');
  const evidence = await tx.query({
    text: `
      UPDATE ${evidenceTable} AS evidence
         SET consumed_at = now()
       WHERE evidence.id = (
               SELECT candidate.id
                 FROM ${evidenceTable} AS candidate
                WHERE candidate.user_id = $1
                  AND candidate.credential_id = jwt_private.current_token_id()
                  AND candidate.consumed_at IS NULL
                  AND candidate.expires_at > now()
                ORDER BY candidate.auth_time DESC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
             )
      RETURNING evidence.method, evidence.identifier, evidence.user_id::text AS user_id
    `,
    values: [input.userId]
  });

  const proven = evidence.rows[0];
  if (!proven || typeof proven.method !== 'string' || typeof proven.identifier !== 'string') {
    fail('STEP_UP_REQUIRED', 'sign in again to prove an identifier');
  }
  if (proven.user_id !== input.userId) {
    fail('OWNER_MISMATCH', 'the proved identity does not belong to the caller');
  }

  const tenant = await tx.query({
    text: authPrivateSchemaSql,
    values: [input.databaseId]
  });
  const tenantAuthSchema = tenant.rows[0]?.schema_name;
  if (typeof tenantAuthSchema !== 'string') {
    fail('TENANT_AUTH_NOT_PROVISIONED', 'the target database has no auth module');
  }

  const signIn = QuoteUtils.quoteQualifiedIdentifier(tenantAuthSchema, 'sign_in_platform_identity');
  const session = await tx.query({
    text: `SELECT * FROM ${signIn}($1, $2)`,
    values: [proven.method, proven.identifier]
  });
  const row = session.rows[0];
  if (!row) fail('TENANT_SIGN_IN_FAILED', 'sign_in_platform_identity returned no row');

  const result: OwnerHandoffResult = {
    code: null,
    userId: String(row.user_id ?? ''),
    mfaRequired: row.mfa_required === true,
    mfaSetupRequired: row.mfa_setup_required === true,
    deviceApprovalRequired: row.device_approval_required === true,
    mfaChallengeToken: typeof row.mfa_challenge_token === 'string' ? row.mfa_challenge_token : null
  };

  // A challenged owner finishes on the tenant's existing MFA/device path; no
  // hand-off code exists until the session does.
  if (result.mfaRequired || result.deviceApprovalRequired) return result;
  if (result.userId !== input.userId) {
    fail('OWNER_MISMATCH', 'the tenant session belongs to a different user');
  }

  const accessToken = row.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    fail('TENANT_SIGN_IN_FAILED', 'sign_in_platform_identity minted no access token');
  }

  // No redirect URI: the caller is the app, not a browser. challenge_only lets
  // the tenant mint the PKCE-bound code without one.
  const mint = QuoteUtils.quoteQualifiedIdentifier(tenantAuthSchema, 'mint_native_handoff');
  const handoff = await tx.query({
    text: `SELECT ${mint}($1, NULL, $2, true) AS code`,
    values: [accessToken, input.codeChallenge]
  });
  const code = handoff.rows[0]?.code;
  if (typeof code !== 'string' || !code) fail('TENANT_SIGN_IN_FAILED', 'mint_native_handoff returned no code');

  result.code = code;
  return result;
};

interface ResolvedArgs {
  input: { databaseId?: unknown; codeChallenge?: unknown } | null;
  withPgClient: WithPgClient;
  pgSettings: Record<string, string> | null;
}

const resolveArgs = (fieldArgs: any): Step<ResolvedArgs> =>
  object({
    input: fieldArgs.getRaw('input'),
    withPgClient: grafastContext().get('withPgClient'),
    pgSettings: grafastContext().get('pgSettings')
  }) as unknown as Step<ResolvedArgs>;

/**
 * Platform-only: a tenant must never author a session for another tenant, so
 * this plugin is registered only on the platform database's own APIs.
 */
export const OwnerHandoffPlugin: GraphileConfig.Plugin = {
  ...extendSchema(() => ({
    typeDefs: gql`
      input MintTenantOwnerHandoffInput {
        clientMutationId: String
        """The tenant database the caller owns."""
        databaseId: UUID!
        """S256 PKCE challenge the desktop will present at the exchange."""
        codeChallenge: String!
      }

      type MintTenantOwnerHandoffPayload {
        """One-time code to exchange for the tenant session; null when a challenge is pending."""
        code: String
        """The tenant user the session belongs to (the platform user's UUID)."""
        userId: UUID
        """An enrolled factor must be completed before a session exists."""
        mfaRequired: Boolean!
        """The tenant requires MFA but the owner has no factor enrolled yet."""
        mfaSetupRequired: Boolean!
        """A new device must be approved by email before a session exists."""
        deviceApprovalRequired: Boolean!
        """Token for the tenant's completeMfaChallenge path."""
        mfaChallengeToken: String
      }

      extend type Mutation {
        """
        Sign the owner of \`databaseId\` into that database's tenant without a
        password, using the platform sign-in this session already proved.
        """
        mintTenantOwnerHandoff(input: MintTenantOwnerHandoffInput!): MintTenantOwnerHandoffPayload
      }
    `,
    plans: {
      Mutation: {
        mintTenantOwnerHandoff(_$mutation: any, fieldArgs: any) {
          return lambda(resolveArgs(fieldArgs), async ({ input, withPgClient, pgSettings }: ResolvedArgs) => {
            const userId = pgSettings?.['jwt.claims.user_id'];
            const tokenId = pgSettings?.['jwt.claims.token_id'] ?? null;
            const platformDatabaseId = pgSettings?.['jwt.claims.database_id'];
            if (!userId) fail('UNAUTHENTICATED', 'a platform session is required');

            const databaseId = input?.databaseId;
            const codeChallenge = input?.codeChallenge;
            if (typeof databaseId !== 'string' || typeof codeChallenge !== 'string') {
              fail('BAD_REQUEST', 'databaseId and codeChallenge are required');
            }

            return withPgClient(pgSettings, (tx) =>
              mintTenantOwnerHandoff(tx, {
                userId,
                tokenId,
                platformDatabaseId: String(platformDatabaseId ?? ''),
                databaseId,
                codeChallenge
              })
            );
          });
        }
      }
    }
  })),
  name: 'OwnerHandoffPlugin'
};
