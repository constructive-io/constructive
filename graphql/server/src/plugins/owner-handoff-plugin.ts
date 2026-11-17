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
 * session). This mutation turns that evidence into the owner's tenant session:
 *
 *   1. the caller must own the target database (never a client-supplied id);
 *   2. the evidence row must belong to this caller and to the platform session
 *      this request belongs to (`jwt.claims.session_id`), and be unexpired. The
 *      browser hand-off rotates the credential, so the session is what survives
 *      to bind the proof;
 *   3. the tenant's own `sign_in_platform_identity` resolves the owner from the
 *      identifier and applies the tenant's MFA / device policy;
 *   4. the tenant mints a one-time, PKCE-bound hand-off code that the desktop
 *      exchanges for the session.
 *
 * The statement that reads the proof also deletes it, so a retry after a crash
 * cannot replay it.
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
  /**
   * The platform realm's private auth schema (where `sign_in_evidence` lives),
   * resolved by the wiring on the server lane — see `platformAuthSchemaSql`.
   */
  platformAuthSchema: string;
  /** The tenant database to sign the owner into. */
  databaseId: string;
  /** S256 challenge the desktop will present at the exchange. */
  codeChallenge: string;
  /** Token for a device awaiting approval, so a retry finds the approved row. */
  deviceToken?: string;
}

export interface OwnerHandoffResult {
  code: string | null;
  userId: string;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  deviceApprovalRequired: boolean;
  mfaChallengeToken: string | null;
  deviceToken: string | null;
}

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// PKCE S256: 43 base64url characters (32 random bytes). The tenant's
// native_handoff_guard_stmts enforces the same shape when the code is minted.
const S256_CHALLENGE = /^[-_A-Za-z0-9]{43}$/;

function fail(code: string, message: string): never {
  // `extensions.code` is what formatError lifts onto the response; without it
  // the refusal reads as INTERNAL_SERVER_ERROR.
  const error = new Error(`${code}: ${message}`) as Error & { extensions?: Record<string, unknown> };
  error.extensions = { code };
  throw error;
}

// The auth module's own row names the private schema, so this works for a
// tenant that enabled auth but no identity provider — `identity_providers_module`
// is optional in a few presets, `user_auth_module` is not. Only the tenant row
// is read here: it belongs to the caller's org, so the request role sees it.
const authPrivateSchemaSql = `
  SELECT auth_private.schema_name
    FROM metaschema_modules_public.user_auth_module uam
    JOIN metaschema_public.schema auth_private ON auth_private.id = uam.private_schema_id
   WHERE uam.database_id = $1
   LIMIT 1
`;

// The platform realm's row is owned by the platform actor, not by the caller's
// org, so RLS hides it from the request role — and `metaschema_modules_public`
// hides it from table reads by the serving login too (NOBYPASSRLS). The
// platform login is granted EXECUTE on this SECURITY DEFINER reader instead
// (constructive-db `function_resolution`), the same reader the module loaders
// use; it projects the schema name and nothing else.
const platformAuthSchemaSql = `
  SELECT private_schema AS schema_name
    FROM function_resolution.user_auth_module_registrations($1::uuid)
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
  // someone else's row answer the same way, so the caller cannot probe which
  // database ids exist.
  const database = await tx.query({
    text: 'SELECT owner_id::text AS owner_id FROM metaschema_public.database WHERE id = $1',
    values: [input.databaseId]
  });
  const ownerId = database.rows[0]?.owner_id;
  if (ownerId !== input.userId) {
    fail('NOT_DATABASE_OWNER', 'only the database owner may hand off a session');
  }

  // Resolved on the server lane before this transaction: the request role
  // cannot see the platform realm's module row (see `platformAuthSchemaSql`).
  const evidenceSchemaName = input.platformAuthSchema;
  if (typeof evidenceSchemaName !== 'string' || !evidenceSchemaName) {
    fail('PLATFORM_AUTH_NOT_PROVISIONED', 'the platform realm has no auth module');
  }

  // Delete-on-consume: one DELETE spends the newest proof for this session, so
  // a retry deletes nothing and is refused. No row lock is taken; it would
  // require an UPDATE grant that this table deliberately does not have. The
  // row is bound to the session, not the credential that recorded it, because
  // the browser hand-off rotates that credential in place and only the session
  // id survives.
  const evidenceTable = QuoteUtils.quoteQualifiedIdentifier(evidenceSchemaName, 'sign_in_evidence');
  const evidence = await tx.query({
    text: `
      DELETE FROM ${evidenceTable} AS evidence
       WHERE evidence.id = (
               SELECT candidate.id
                 FROM ${evidenceTable} AS candidate
                WHERE candidate.user_id = $1
                  AND candidate.session_id = jwt_private.current_session_id()
                  AND candidate.expires_at > now()
                ORDER BY candidate.auth_time DESC
                LIMIT 1
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

  // Co-location assumption: the evidence read and the tenant session share one
  // transaction, so the tenant auth schema has to live in this server's
  // database. A tenant on its own physical database would otherwise fail with
  // 42883 deep inside the procedure call.
  const served = await tx.query({
    text: 'SELECT 1 FROM pg_namespace WHERE nspname = $1',
    values: [tenantAuthSchema]
  });
  if (served.rows.length === 0) {
    fail('TENANT_AUTH_NOT_IN_SERVED_DATABASE', 'the tenant auth schema is not in this server\'s database');
  }

  const signIn = QuoteUtils.quoteQualifiedIdentifier(tenantAuthSchema, 'sign_in_platform_identity');
  // The tenant procedure defaults credential_kind to 'bearer' and remember_me to
  // false. Both are spelled out only to reach the device token in fifth place:
  // a retry after the user approves the device must find the approved row
  // instead of minting a new device.
  const session = await tx.query({
    text: `SELECT * FROM ${signIn}($1, $2, 'bearer', false, $3)`,
    values: [proven.method, proven.identifier, input.deviceToken ?? null]
  });
  const row = session.rows[0];
  if (!row) fail('TENANT_SIGN_IN_FAILED', 'sign_in_platform_identity returned no row');

  const result: OwnerHandoffResult = {
    code: null,
    userId: String(row.user_id ?? ''),
    mfaRequired: row.mfa_required === true,
    mfaSetupRequired: row.mfa_setup_required === true,
    deviceApprovalRequired: row.device_approval_required === true,
    mfaChallengeToken: typeof row.mfa_challenge_token === 'string' ? row.mfa_challenge_token : null,
    // Pending device approval finishes on the tenant's existing approve_device
    // path, which needs this token; without it the desktop cannot continue.
    deviceToken: typeof row.out_device_token === 'string' ? row.out_device_token : null
  };

  // The check runs before the challenge early return: a challenge minted for
  // another tenant user must not hand back that user's tokens.
  if (result.userId !== input.userId) {
    fail('OWNER_MISMATCH', 'the tenant session belongs to a different user');
  }

  // A challenged owner finishes on the tenant's existing MFA/device path; no
  // hand-off code exists until the session does.
  if (result.mfaRequired || result.deviceApprovalRequired) return result;

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
  input: { databaseId?: unknown; codeChallenge?: unknown; deviceToken?: unknown } | null;
  withPgClient: WithPgClient;
  pgSettings: Record<string, string> | null;
}

const resolveArgs = (fieldArgs: any): Step<ResolvedArgs> =>
  object({
    input: fieldArgs.getRaw('input'),
    withPgClient: (grafastContext() as any).get('withPgClient'),
    pgSettings: (grafastContext() as any).get('pgSettings')
  }) as unknown as Step<ResolvedArgs>;

/**
 * The connection's own login, no request role. It is the only lane that holds
 * EXECUTE on the privileged module readers (the webauthn plugin uses the same
 * lane for the same reason), so a request role can never widen it.
 */
export const resolvePlatformAuthSchema = async (
  withPgClient: WithPgClient,
  platformDatabaseId: string
): Promise<string | undefined> =>
  withPgClient(null, async (client) => {
    const { rows } = await client.query({
      text: platformAuthSchemaSql,
      values: [platformDatabaseId]
    });
    const name = rows[0]?.schema_name;
    return typeof name === 'string' && name ? name : undefined;
  });

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
        """Device token from a pending-approval result, so the retry finds the approved device."""
        deviceToken: String
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
        """Device token for the tenant's device-approval path."""
        deviceToken: String
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
            const platformDatabaseId = pgSettings?.['jwt.claims.database_id'];
            if (!userId) fail('UNAUTHENTICATED', 'a platform session is required');
            // The API resolved this request's database id; without it there is
            // no platform realm to read and no evidence to consume.
            if (!isUuid(platformDatabaseId)) {
              fail('UNAUTHENTICATED', 'a platform session is required');
            }

            const databaseId = input?.databaseId;
            const codeChallenge = input?.codeChallenge;
            const deviceToken = input?.deviceToken;
            if (typeof databaseId !== 'string' || typeof codeChallenge !== 'string') {
              fail('BAD_REQUEST', 'databaseId and codeChallenge are required');
            }

            // The platform realm's auth schema is registry knowledge, hidden
            // from the request role; resolve it on the server lane, then run
            // every caller-scoped read and the tenant procedures on the request
            // lane.
            const platformAuthSchema = await resolvePlatformAuthSchema(
              withPgClient,
              platformDatabaseId
            );
            if (!platformAuthSchema) {
              fail('PLATFORM_AUTH_NOT_PROVISIONED', 'the platform realm has no auth module');
            }

            return withPgClient(pgSettings, (tx) =>
              mintTenantOwnerHandoff(tx, {
                userId,
                platformAuthSchema,
                databaseId,
                codeChallenge,
                deviceToken: typeof deviceToken === 'string' && deviceToken ? deviceToken : undefined
              })
            );
          });
        }
      }
    }
  })),
  name: 'OwnerHandoffPlugin'
};
