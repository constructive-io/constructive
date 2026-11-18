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

/** Why the run can't start app building. */
export class LaunchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LaunchError';
  }
}

const hostOf = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};

type Post = typeof postGraphQL;

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
    return new LaunchError(`${hostOf(endpoint)} refused ${what} (${detail}). ${SET_UP_AGAIN}`);
  }
  return new LaunchError(
    `Could not check ${what} on ${hostOf(endpoint)} (${detail}). Check that the backend is up, then send the message again.`
  );
}

/** Reads the run's identity; throws a LaunchError when a key is refused or can't be checked. */
export async function readRunIdentity(
  options: CheckedOptions,
  post: Post = postGraphQL
): Promise<RunIdentity> {
  const { endpoints, account, ownerKey, databaseId } = options;
  const accountWhat = 'the account key (APP_BUILD_ACCOUNT_KEY)';
  const platformAuth = deriveSubdomainEndpoint(endpoints.api, 'auth');
  const userId = await currentUserId(post, platformAuth, account.apiKey, accountWhat);
  if (!userId) {
    throw new LaunchError(`${hostOf(platformAuth)} answered no user for ${accountWhat}. ${SET_UP_AGAIN}`);
  }

  const probe = await probeDatabase({ endpoint: endpoints.api, bearer: account.apiKey, databaseId, post });
  if (probe.status === 'unreachable') {
    throw new LaunchError(
      probe.cause === 'auth'
        ? `${hostOf(endpoints.api)} refused ${accountWhat}. ${SET_UP_AGAIN}`
        : `Could not check the run's database on ${hostOf(endpoints.api)} (${probe.detail}). Check that the backend is up, then send the message again.`
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

  const ownerWhat = 'the owner key (APP_BUILD_OWNER_KEY)';
  const appAuth = deriveSubdomainEndpoint(endpoints.api, `auth-${identity.databaseName}`);
  const ownerId = await currentUserId(post, appAuth, ownerKey, ownerWhat);
  if (ownerId !== userId) {
    throw new LaunchError(
      ownerId
        ? `${ownerWhat} signs in on ${hostOf(appAuth)} as another user than the account. ${SET_UP_AGAIN}`
        : `${hostOf(appAuth)} answered no user for ${ownerWhat}. ${SET_UP_AGAIN}`
    );
  }
  return identity;
}
