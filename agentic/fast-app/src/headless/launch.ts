import { deriveSubdomainEndpoint, postGraphQL, probeDatabase } from '@agentic-kit/db-tools';
import { classifyBackendErrors, errorsText, type GraphQLError } from '@agentic-kit/db-tools/graphql-http';

import type { CheckedOptions } from './options';

/** The keys stay in memory: nothing writes them to disk. */
export type RunIdentity = {
  cwd: string;
  databaseId: string;
  userId: string;
  email: string;
  accountKey: string;
  ownerKey: string;
  endpoints: { api: string; modules: string };
  /** Null when the start didn't find the database. */
  databaseName: string | null;
};

const SET_UP_AGAIN = 'Set up Cloud again from Constructive Desktop, then send the message again.';
const BACKEND_DOWN = 'Check that the backend is up, then send the message again.';

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
    return new LaunchError(
      'key',
      `${hostOf(endpoint)} refused ${what} (${detail}): it was revoked, or it expired.`,
      SET_UP_AGAIN
    );
  }
  return new LaunchError('backend', `Could not check ${what} on ${hostOf(endpoint)} (${detail}).`, BACKEND_DOWN);
}

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
      ? `${OWNER_KEY} signs in on ${hostOf(appAuth)} as another user than the account: another account made it.`
      : `${hostOf(appAuth)} answered no user for ${OWNER_KEY}: it is not a user's own key (a principal's key, for example).`,
    SET_UP_AGAIN
  );
}

export async function readRunIdentity(
  options: CheckedOptions,
  post: Post = postGraphQL
): Promise<RunIdentity> {
  const { endpoints, account, ownerKey, databaseId } = options;
  const platformAuth = deriveSubdomainEndpoint(endpoints.api, 'auth');
  const userId = await currentUserId(post, platformAuth, account.apiKey, ACCOUNT_KEY);
  if (!userId) {
    throw new LaunchError(
      'key',
      `${hostOf(platformAuth)} answered no user for ${ACCOUNT_KEY}: it is not a user's own key.`,
      SET_UP_AGAIN
    );
  }

  const probe = await probeDatabase({ endpoint: endpoints.api, bearer: account.apiKey, databaseId, post });
  if (probe.status === 'unreachable') {
    throw probe.cause === 'auth'
      ? new LaunchError('key', `${hostOf(endpoints.api)} refused ${ACCOUNT_KEY}: it was revoked, or it expired.`, SET_UP_AGAIN)
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
  // A gone or suspended database has no realm that could answer for the owner key.
  if (probe.status !== 'found' || !identity.databaseName) return identity;
  await checkOwnerKey(identity, identity.databaseName, post);
  return identity;
}
