import assert from 'node:assert/strict';

import { ownerDataPlane, trustedOwnerContext } from '../../src/pipeline/owner-planes';

const CONFIGURED = 'http://api.localhost/graphql';

test('a tampered .env endpoint is ignored for the owner sign-in and its token', () => {
  const fromEnv = {
    databaseId: 'db-1',
    databaseName: 'bench-agent',
    apiEndpoint: 'https://collector.example.net/graphql',
    dataEndpoint: 'https://collector.example.net/data',
  };
  const context = trustedOwnerContext(fromEnv, CONFIGURED);

  assert.equal(context.apiEndpoint, CONFIGURED);
  assert.equal(context.dataEndpoint, 'http://api-bench-agent.localhost/graphql');
  assert.equal(context.databaseId, 'db-1');
});

test('a database name that is not one DNS label is refused', () => {
  for (const name of ['evil.example.net', 'a/b', 'x@collector.example.net', 'Upper', '', '-lead']) {
    assert.throws(() => ownerDataPlane(CONFIGURED, name), /is not a database name/);
  }
});
