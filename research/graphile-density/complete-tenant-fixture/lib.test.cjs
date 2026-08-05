'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_CANARIES,
  REQUIRED_CAPABILITIES,
  TENANTS,
  assertLoopbackBaseUrl,
  assertProviderGates,
  evaluateCanaryResponse,
  jsonPointerValues,
  makeFleet,
  makePlan,
  operationsFor,
  readManifest,
} = require('./lib.cjs');

test('manifest is complete and production provider gates fail closed', () => {
  const manifest = readManifest();
  assert.throws(
    () => assertProviderGates(manifest, 'production', {}),
    /CTF_EXTERNAL_PROVIDER_GATES_UNSATISFIED/,
  );
  assert.deepEqual(assertProviderGates(manifest, 'offline-research', {}), {
    customerQualified: false,
    unresolved: ['ollama-real-semantic', 'object-storage-byte-roundtrip'],
  });
});

test('each A/B/C fleet member covers every capability and hostile canary', () => {
  const fleet = makeFleet({ arm: 'test-arm', port: 3391 });
  assert.equal(fleet.tenants.length, TENANTS.length);

  const contracts = new Set();
  for (const tenant of fleet.tenants) {
    assert.equal(tenant.databases.length, 1);
    assert.equal(tenant.databases[0].apis.length, 1);
    assert.deepEqual(tenant.databases[0].apis[0].surfaces, ['api']);
    assert.equal(tenant.surfaces.length, 1);
    const surface = tenant.surfaces[0];
    assert.equal(contracts.has(surface.buildContract), false);
    contracts.add(surface.buildContract);
    assert.deepEqual(
      [...new Set(surface.operations.map((entry) => entry.capability))].sort(),
      [...REQUIRED_CAPABILITIES].sort(),
    );
    assert.deepEqual(
      surface.canaries.map((entry) => entry.name).sort(),
      [...REQUIRED_CANARIES].sort(),
    );
    for (const entry of surface.canaries) {
      assert.ok(entry.requiredMatches.length > 0, `${entry.name} has a positive oracle`);
      assert.ok(entry.forbiddenMatches.length > 0, `${entry.name} has a negative oracle`);
    }
  }
});

test('fixture operations match the NoUniqueLookup GraphQL surface', () => {
  const tenant = TENANTS[0];
  const operations = operationsFor(tenant);
  const localizedRead = operations.find((entry) => entry.name === 'localized-post-read');
  const realtimeUpdate = operations.find((entry) => entry.name === 'realtime-tagged-update');
  const rawSqlCanary = makeFleet().tenants[0].surfaces[0].canaries
    .find((entry) => entry.name === 'plugin-raw-sql');

  assert.match(localizedRead.query, /posts\(first: 1, where: \{ id: \{ equalTo: 1 \} \}\)/);
  assert.match(realtimeUpdate.query, /updateRealtimeItem\(input:/);
  assert.doesNotMatch(
    JSON.stringify({ operations, rawSqlCanary }),
    /postById|updateRealtimeItemById/,
  );
  assert.deepEqual(rawSqlCanary.requiredMatches, [{
    path: '/data/posts/nodes/0/localeStrings/title',
    value: `${tenant.token} español`,
  }]);
});

test('generated fleet is credential-free and does not call offline surrogates production', () => {
  const serialized = JSON.stringify(makeFleet({ arm: 'test-arm', port: 3391 }));
  assert.doesNotMatch(serialized, /password|secretAccessKey|authorization|bearer/i);
  assert.match(serialized, /llm-deterministic/);
  assert.match(serialized, /uploads-storage-presign-only/);
});

test('exact server build contracts replace unresolved fixture placeholders', () => {
  const contracts = Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    `graphile:v1:${tenant.id.repeat(64)}`,
  ]));
  const fleet = makeFleet({ arm: 'exact-arm', port: 3391, buildContracts: contracts });
  for (const tenant of fleet.tenants) {
    const tenantId = tenant.id.slice('complete-tenant-'.length);
    const surface = tenant.surfaces[0];
    assert.equal(surface.buildContract, contracts[tenantId]);
    assert.equal(surface.buildContracts['exact-arm'], contracts[tenantId]);
    assert.doesNotMatch(surface.buildContract, /^ctf:unresolved:/);
  }
});

test('canary pointer matching is positive, negative, and wildcard aware', () => {
  const response = {
    data: {
      values: [{ name: 'metadataA' }, { name: 'safe' }],
    },
  };
  assert.deepEqual(jsonPointerValues(response, '/data/values/*/name'), ['metadataA', 'safe']);
  assert.deepEqual(evaluateCanaryResponse({
    requiredMatches: [{ path: '/data/values/*/name', value: 'metadataA' }],
    forbiddenMatches: [{ path: '/data/values/*/name', value: 'metadataB' }],
  }, response), { conclusive: true, violation: false });
  assert.deepEqual(evaluateCanaryResponse({
    requiredMatches: [{ path: '/data/values/*/name', value: 'missing' }],
    forbiddenMatches: [],
  }, response), {
    conclusive: false,
    violation: false,
    detail: "required match at '/data/values/*/name' was absent",
  });
});

test('plan carries non-secret role names and no runtime credentials', () => {
  const runtimeRoles = { a: 'ctf_runtime_a', b: 'ctf_runtime_b', c: 'ctf_runtime_c' };
  const plan = makePlan({
    arm: 'exact-arm',
    postgresContainer: 'ctf-postgres',
    commit: '0123456789abcdef',
    durationSec: 60,
    runtimeRoles,
  });
  const command = plan.arms[0].command;
  for (const tenant of TENANTS) {
    assert.ok(command.includes(`--${tenant.runtimeRoleArgument}`));
    assert.ok(command.includes(runtimeRoles[tenant.id]));
  }
  const releaseModeIndex = command.indexOf('--introspection-client-release-mode');
  assert.ok(releaseModeIndex >= 0);
  assert.equal(command[releaseModeIndex + 1], 'destroy');
  assert.throws(() => makePlan({
    arm: 'invalid-release-arm',
    postgresContainer: 'ctf-postgres',
    commit: '0123456789abcdef',
    introspectionClientReleaseMode: 'best-effort',
    runtimeRoles,
  }), /CTF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:best-effort/);
  assert.doesNotMatch(JSON.stringify(plan), /password|secretAccessKey|authorization|bearer/i);
});

test('control-bearing fixture URLs are restricted to credential-free loopback HTTP', () => {
  assert.equal(assertLoopbackBaseUrl('http://127.0.0.1:3391'), 'http://127.0.0.1:3391');
  assert.equal(assertLoopbackBaseUrl('http://[::1]:3391'), 'http://[::1]:3391');
  assert.throws(
    () => assertLoopbackBaseUrl('https://example.com'),
    /CTF_LOOPBACK_BASE_URL_REQUIRED/,
  );
  assert.throws(
    () => assertLoopbackBaseUrl('http://user:credential@127.0.0.1:3391'),
    /CTF_LOOPBACK_BASE_URL_REQUIRED/,
  );
  assert.throws(
    () => assertLoopbackBaseUrl('http://127.0.0.1:3391/prefix'),
    /CTF_LOOPBACK_BASE_URL_REQUIRED/,
  );
});
