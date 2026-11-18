// The project's values as the pipeline reads them without a request: the
// database name, the secrets the build details redact, a pending provision.
// A host with no .env in the project (the cloud Job) gives them instead.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { configureHost, type ToolsHost } from '@agentic-kit/db-tools';
import { PENDING_PROVISION_KEYS } from '@agentic-kit/db-tools/provision-database/env-file';

import {
  boundDatabaseName,
  envSecrets,
  pendingDatabaseName,
  pendingTicket,
  projectDatabaseName
} from '../../src/pipeline/project-env';

const hostAnswering = (contextSource?: ToolsHost['contextSource']) =>
  configureHost({ account: () => null, backendConfig: () => null, contextSource });

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'project-env-'));
  // A .env as provisioning writes it, with a provision still pending.
  writeFileSync(
    path.join(dir, '.env'),
    [
      'DATABASE_NAME=from-file',
      'ACCESS_TOKEN=file-secret-1234',
      `${PENDING_PROVISION_KEYS.ticketId}=ticket-1`,
      `${PENDING_PROVISION_KEYS.databaseName}=pending-from-file`
    ].join('\n')
  );
});

afterEach(() => {
  hostAnswering();
  rmSync(dir, { recursive: true, force: true });
});

test('the pending database request comes whole from the .env, for the step that resumes it', async () => {
  hostAnswering();

  assert.deepEqual(await pendingTicket(dir), {
    ticketId: 'ticket-1',
    databaseName: 'pending-from-file',
    apiEndpoint: '',
    userId: '',
    attempts: 0
  });
});

test("the host's values for the folder stand in for its .env, which is not read", async () => {
  const contextSource = jest.fn((_cwd: string) => ({
    CONSTRUCTIVE_DATABASE_NAME: 'job-db',
    CONSTRUCTIVE_ACCESS_TOKEN: 'job-secret-5678'
  }));
  hostAnswering(contextSource);

  assert.equal(await boundDatabaseName(dir), 'job-db');
  assert.deepEqual(await projectDatabaseName(dir), { name: 'job-db', bound: true });
  // Only the host's secrets: the .env's are not the run's.
  assert.deepEqual(await envSecrets(dir), ['job-secret-5678']);
  // The host records no pending provision, whatever the .env says.
  assert.equal(await pendingDatabaseName(dir), null);
  assert.equal(await pendingTicket(dir), null);
  // Every read asked the host about this folder.
  assert.ok(contextSource.mock.calls.every(([cwd]) => cwd === dir));
});

test('a host that gives a lookup function is read the same way, a pending provision included', async () => {
  const values: Record<string, string> = {
    DATABASE_NAME: 'job-db',
    [PENDING_PROVISION_KEYS.ticketId]: 'ticket-2',
    [PENDING_PROVISION_KEYS.databaseName]: 'pending-in-host'
  };
  hostAnswering(async () => (name: string) => values[name]);

  assert.equal(await boundDatabaseName(dir), 'job-db');
  assert.equal(await pendingDatabaseName(dir), 'pending-in-host');
  assert.equal((await pendingTicket(dir))?.ticketId, 'ticket-2');
  // A lookup can't be listed, so its keys aren't redacted.
  assert.deepEqual(await envSecrets(dir), []);
});
