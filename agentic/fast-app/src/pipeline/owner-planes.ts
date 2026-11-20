// Where the owner's password and token may go. The project .env is agent-
// editable, so its API_ENDPOINT can't decide the host: a tampered one would
// receive the password the plan card took or verify_app replays. The planes
// come from the backend the desktop is configured for, and only the database
// name comes from .env, as one DNS label.

import { deriveSubdomainEndpoint } from '@agentic-kit/db-tools/context';

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** The app database's data plane, `api-<db>`, on the configured backend. */
export function ownerDataPlane(apiEndpoint: string, databaseName: string): string {
  if (!DNS_LABEL.test(databaseName)) {
    throw new Error(
      `DATABASE_NAME "${databaseName}" in the project .env is not a database name; reconnect the database.`,
    );
  }
  const data = deriveSubdomainEndpoint(apiEndpoint, `api-${databaseName}`);
  if (!data) throw new Error(`The configured API endpoint "${apiEndpoint}" is not a URL.`);
  return data;
}

/**
 * A project context whose endpoints point at the configured backend, never at
 * .env's. The sign-in derives `auth-<db>` from the same `apiEndpoint`.
 */
export function trustedOwnerContext<
  T extends { apiEndpoint: string; dataEndpoint: string; databaseName: string },
>(context: T, configuredApiEndpoint: string): T {
  return {
    ...context,
    apiEndpoint: configuredApiEndpoint,
    dataEndpoint: ownerDataPlane(configuredApiEndpoint, context.databaseName),
  };
}
