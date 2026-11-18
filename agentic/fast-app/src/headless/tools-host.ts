// The db tools' host for a run with no UI (@agentic-kit/db-tools ToolsHost).
// The control plane gets the account key, the app's realm gets the owner key,
// and the run's work tree gets its project values from here, never from a
// `.env`: the clone has none, because that file would hold a key.

import path from 'node:path';

import type { ContextSource, DataAuthBroker, ToolsHost } from '@agentic-kit/db-tools';

import type { RunIdentity } from './launch';

/** The db tools' advice for a database that is gone or another account's. */
export const REBUILD_FROM_DESKTOP =
  'A cloud run never makes or replaces a database: ask the user to rebuild the app from Constructive Desktop.';

const SIGN_IN_HINT =
  'This cloud run signs in with the keys that Set up Cloud stored. Ask the user to set up Cloud again from Constructive Desktop.';

/**
 * The run's project values, for its work tree only. `ACCESS_TOKEN` is the
 * data-plane key of a db-tools context; db-tools only checks it is there and
 * sends the control plane the account's own key, so the owner key goes in.
 */
export function runContext(run: RunIdentity): Record<string, string | undefined> {
  return {
    DATABASE_ID: run.databaseId,
    DATABASE_NAME: run.databaseName ?? undefined,
    OWNER_ID: run.userId,
    API_ENDPOINT: run.endpoints.api,
    MODULES_ENDPOINT: run.endpoints.modules,
    ACCESS_TOKEN: run.ownerKey
  };
}

// The owner key is the run database's one data-plane session; it never expires here.
function ownerKeyBroker(run: RunIdentity): DataAuthBroker {
  return {
    getActiveToken: (databaseId) =>
      databaseId === run.databaseId
        ? { token: run.ownerKey, userId: run.userId, expiresAt: Number.MAX_SAFE_INTEGER, origin: 'cloud' }
        : null,
    isInvalidToken: () => false,
    adoptToken: () => {}
  };
}

export function headlessToolsHost(run: RunIdentity): ToolsHost {
  const tree = path.resolve(run.cwd);
  return {
    account: () => ({ userId: run.userId, accessToken: run.accountKey, apiKey: run.accountKey }),
    backendConfig: () => ({ apiEndpoint: run.endpoints.api, modulesEndpoint: run.endpoints.modules }),
    // Another folder gets no values, never its own .env: only the run's tree has a database.
    contextSource: (cwd): ContextSource => (path.resolve(cwd) === tree ? runContext(run) : {}),
    dataAuthBroker: ownerKeyBroker(run),
    signInHint: SIGN_IN_HINT,
    toolReprovision: false,
    reprovisionHint: REBUILD_FROM_DESKTOP
  };
}
