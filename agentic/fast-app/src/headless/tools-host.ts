import path from 'node:path';

import type { ContextSource, DataAuthBroker, ToolsHost } from '@agentic-kit/db-tools';

import type { RunIdentity } from './launch';

export const REBUILD_FROM_DESKTOP =
  'A cloud run never makes or replaces a database: ask the user to rebuild the app from Constructive Desktop.';

const SIGN_IN_HINT =
  'This cloud run signs in with the keys that Set up Cloud stored. Ask the user to set up Cloud again from Constructive Desktop.';

/**
 * `ACCESS_TOKEN` is the owner key: db-tools only checks that it is there, and
 * gives the control plane the host's account key. `ACCOUNT_API_KEY` is no
 * project value; it is here so the pipeline's `envSecrets` redacts it.
 */
export function runContext(run: RunIdentity): Record<string, string | undefined> {
  return {
    DATABASE_ID: run.databaseId,
    DATABASE_NAME: run.databaseName ?? undefined,
    OWNER_ID: run.userId,
    API_ENDPOINT: run.endpoints.api,
    MODULES_ENDPOINT: run.endpoints.modules,
    ACCESS_TOKEN: run.ownerKey,
    ACCOUNT_API_KEY: run.accountKey
  };
}

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
    // `{}`, not null: null would make db-tools read the folder's .env.
    contextSource: (cwd): ContextSource => (path.resolve(cwd) === tree ? runContext(run) : {}),
    dataAuthBroker: ownerKeyBroker(run),
    signInHint: SIGN_IN_HINT,
    toolReprovision: false,
    reprovisionHint: REBUILD_FROM_DESKTOP
  };
}
