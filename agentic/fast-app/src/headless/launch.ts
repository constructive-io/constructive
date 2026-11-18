// What the run acts as, read once at start: the account's user id (it owns
// the database and the app's rows), the database's name, and a check that
// the owner key signs in as that user on the app's own realm. A key the
// backend refuses fails the start with what to do, so a run never starts
// app building that can't sign in.

import { deriveSubdomainEndpoint, postGraphQL, probeDatabase } from '@agentic-kit/db-tools';
import { classifyBackendErrors, errorsText, type GraphQLError } from '@agentic-kit/db-tools/graphql-http';

import type { CheckedOptions } from './options';

/** What every part of the headless host reads; the keys stay in memory. */
export type RunIdentity = {
  cwd: string;
  databaseId: string;
  /** The account's user id: the owner of the database and of the app's rows. */
  userId: string;
  email: string;
  accountKey: string;
  ownerKey: string;
  endpoints: { api: string; modules: string };
  /** The database's name as the start found it; null when it was not found. */
  databaseName: string | null;
};

const SET_UP_AGAIN = 'Set up Cloud again from Constructive Desktop, then send the message again.';
const BACKEND_DOWN = 'Check that the backend is up, then send the message again.';

/**
 * Why the run can't use a key: the backend refused it (`key`), or couldn't
 * be asked (`backend`). `reason` says what happened and `fix` what to do.
 */
export class LaunchError extends Error {
  readonly kind: 'key' | 'backend';
  readonly reason: string;
  readonly fix: string;

  constructor(kind: 'key' | 'backend', reason: string, fix: string) {
    super(`${reason} ${fix}`);
    this.name = 'LaunchError';
    this.kind = kind;
    this.reason = reason;
    this.fix = fix;
  }
}

const hostOf = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};

export type Post = typeof postGraphQL;

const ACCOUNT_KEY = 'the account key (APP_BUILD_ACCOUNT_KEY)';
const OWNER_KEY = 'the owner key (APP_BUILD_OWNER_KEY)';

// `currentUserId` on an auth realm: the platform's for the account key, the
// app database's for the owner key. Null when the realm answers no user.
async function currentUserId(
  post: Post,
  endpoint: string,
  key: string,
  what: string
): Promise<string | null> {
  const result = await post<{ currentUserId: string | null }>({
    endpoint,
    headers: { Authorization: `Bearer ${key}` },
    query: 'query HeadlessWhoAmI { currentUserId }'
  });
  if (result.errors.length) throw keyError(result.errors, endpoint, what);
  return result.data?.currentUserId ?? null;
}

function keyError(errors: GraphQLError[], endpoint: string, what: string): LaunchError {
  const detail = errorsText(errors);
  const kind = classifyBackendErrors(errors);
  if (kind === 'auth' || kind === 'forbidden') {
    return new LaunchError('key', `${hostOf(endpoint)} refused ${what} (${detail}).`, SET_UP_AGAIN);
  }
  return new LaunchError('backend', `Could not check ${what} on ${hostOf(endpoint)} (${detail}).`, BACKEND_DOWN);
}

/**
 * Checks that the owner key signs in as the account on the app database's
 * own realm (`auth-<db>`); throws a LaunchError when it doesn't.
 */
export async function checkOwnerKey(
  run: Pick<RunIdentity, 'endpoints' | 'ownerKey' | 'userId'>,
  databaseName: string,
  post: Post = postGraphQL
): Promise<void> {
  const appAuth = deriveSubdomainEndpoint(run.endpoints.api, `auth-${databaseName}`);
  const ownerId = await currentUserId(post, appAuth, run.ownerKey, OWNER_KEY);
  if (ownerId === run.userId) return;
  throw new LaunchError(
    'key',
    ownerId
      ? `${OWNER_KEY} signs in on ${hostOf(appAuth)} as another user than the account.`
      : `${hostOf(appAuth)} answered no user for ${OWNER_KEY}.`,
    SET_UP_AGAIN
  );
}

/** Reads the run's identity; throws a LaunchError when a key is refused or can't be checked. */
export async function readRunIdentity(
  options: CheckedOptions,
  post: Post = postGraphQL
): Promise<RunIdentity> {
  const { endpoints, account, ownerKey, databaseId } = options;
  const platformAuth = deriveSubdomainEndpoint(endpoints.api, 'auth');
  const userId = await currentUserId(post, platformAuth, account.apiKey, ACCOUNT_KEY);
  if (!userId) {
    throw new LaunchError('key', `${hostOf(platformAuth)} answered no user for ${ACCOUNT_KEY}.`, SET_UP_AGAIN);
  }

  const probe = await probeDatabase({ endpoint: endpoints.api, bearer: account.apiKey, databaseId, post });
  if (probe.status === 'unreachable') {
    throw probe.cause === 'auth'
      ? new LaunchError('key', `${hostOf(endpoints.api)} refused ${ACCOUNT_KEY}.`, SET_UP_AGAIN)
      : new LaunchError(
        'backend',
        `Could not check the run's database on ${hostOf(endpoints.api)} (${probe.detail}).`,
        BACKEND_DOWN
      );
  }
  const identity: RunIdentity = {
    cwd: options.cwd,
    databaseId,
    userId,
    email: account.email,
    accountKey: account.apiKey,
    ownerKey,
    endpoints,
    databaseName: probe.status === 'missing' ? null : (probe.name ?? null)
  };
  // A gone or suspended database has no realm that answers; the build says why.
  if (probe.status !== 'found' || !identity.databaseName) return identity;
  await checkOwnerKey(identity, identity.databaseName, post);
  return identity;
}
