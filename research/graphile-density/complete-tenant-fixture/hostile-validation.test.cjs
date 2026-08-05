'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TENANTS } = require('./lib.cjs');
const {
  assertCustomerPathPrefix,
  assertIdentity,
  assertPhysicalDatabaseIdentity,
  postGraphql,
  requestJson,
  runHostileValidation,
} = require('./hostile-validation.cjs');

const response = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
});

test('GraphQL helper rejects transport, GraphQL, and malformed success responses', async () => {
  let requestOptions;
  await requestJson('http://127.0.0.1/no-redirect', {
    fetchImpl: async (_url, options) => {
      requestOptions = options;
      return response({ ok: true });
    },
  });
  assert.equal(requestOptions.redirect, 'error');
  await assert.rejects(
    () => requestJson('http://127.0.0.1/failure', {
      fetchImpl: async () => response({ error: { code: 'DENIED' } }, { ok: false, status: 403 }),
    }),
    /CTF_HTTP_FAILURE:DENIED/,
  );
  await assert.rejects(
    () => postGraphql('http://127.0.0.1', '', 'a', { query: 'query Test { x }' }, async () =>
      response({ errors: [{ message: 'unsupported field' }] })
    ),
    /CTF_GRAPHQL_FAILURE:a:GRAPHQL_ERROR:operation=Test:path=none:location=none:errors=1:message=unsupported field/,
  );
  await assert.rejects(
    () => postGraphql('http://127.0.0.1', '', 'a', { query: 'query Test { x }' }, async () =>
      response({ ok: true })
    ),
    /CTF_GRAPHQL_RESPONSE_INVALID:a/,
  );
});

test('failure diagnostics identify the operation and redact request secrets', async () => {
  const variableSecret = 'fixture-variable-secret-value';
  const bearerSecret = 'fixture-bearer-credential-value';
  const databaseSecret = 'fixture-database-password';
  let graphQlError;
  try {
    await postGraphql('http://127.0.0.1', '', 'a', {
      name: 'localized-post-read',
      query: 'query LocalizedPostRead($value: String!) { x(value: $value) }',
      variables: { value: variableSecret },
    }, async () => response({
      errors: [{
        message: `invalid ${variableSecret}; Bearer ${bearerSecret}; postgresql://runtime:${databaseSecret}@127.0.0.1/db`,
        path: ['posts', 'nodes', 0, 'localeStrings'],
        locations: [{ line: 2, column: 7 }],
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      }],
    }));
  } catch (error) {
    graphQlError = error;
  }
  assert.ok(graphQlError instanceof Error);
  assert.match(
    graphQlError.message,
    /operation=localized-post-read:path=posts\.nodes\.0\.localeStrings:location=2:7/,
  );
  assert.match(graphQlError.message, /\[REDACTED\]/);
  assert.doesNotMatch(
    graphQlError.message,
    new RegExp([variableSecret, bearerSecret, databaseSecret].join('|')),
  );

  const controlSecret = 'fixture-control-token-value';
  let httpError;
  try {
    await requestJson(
      'http://runtime:fixture-url-password@127.0.0.1/failure?token=fixture-query-token',
      {
        token: controlSecret,
        fetchImpl: async () => response({
          error: { code: 'DENIED', message: `authorization=${controlSecret}` },
        }, { ok: false, status: 403 }),
      },
    );
  } catch (error) {
    httpError = error;
  }
  assert.ok(httpError instanceof Error);
  assert.match(httpError.message, /CTF_HTTP_FAILURE:DENIED:status=403:target=http:\/\/127\.0\.0\.1\/failure/);
  assert.doesNotMatch(
    httpError.message,
    /fixture-control-token-value|fixture-url-password|fixture-query-token/,
  );
});

test('identity oracle detects wrong identities and any foreign tenant token', () => {
  const tenant = TENANTS[0];
  const physicalDatabaseIdentity = 'fixture_database_a';
  assert.doesNotThrow(() => assertIdentity(tenant, {
    data: {
      tenantIdentity: tenant.token,
      requestIdentity: `${tenant.token}:${tenant.databaseId}`,
      physicalDatabaseIdentity,
    },
  }, physicalDatabaseIdentity));
  assert.throws(
    () => assertIdentity(tenant, {
      data: {
        tenantIdentity: tenant.token,
        requestIdentity: `${tenant.token}:${tenant.databaseId}`,
        physicalDatabaseIdentity,
        unexpected: TENANTS[1].token,
      },
    }, physicalDatabaseIdentity),
    /CTF_CROSS_TENANT_TOKEN:a:b/,
  );
  assert.throws(
    () => assertIdentity(tenant, {
      data: {
        tenantIdentity: 'guc-mismatch',
        requestIdentity: null,
        physicalDatabaseIdentity,
      },
    }, physicalDatabaseIdentity),
    /CTF_TENANT_IDENTITY_MISMATCH:a/,
  );
  assert.throws(
    () => assertIdentity(tenant, {
      data: {
        tenantIdentity: tenant.token,
        requestIdentity: `${tenant.token}:${tenant.databaseId}`,
        physicalDatabaseIdentity: 'fixture_database_b',
      },
    }, physicalDatabaseIdentity),
    /CTF_PHYSICAL_DATABASE_IDENTITY_MISMATCH:graphql-identity_a/,
  );
});

test('mounted hostile routes require the exact manifest customer path', () => {
  assert.equal(
    assertCustomerPathPrefix(
      '/customer/physical-customer-0001',
      'physical-customer-0001',
    ),
    '/customer/physical-customer-0001',
  );
  for (const value of [
    '/customer/physical-customer-0002',
    '/customer/physical-customer-0001/',
    '/customer/%70hysical-customer-0001',
    '/customer/physical-customer-0001?tenant=other',
  ]) {
    assert.throws(
      () => assertCustomerPathPrefix(value, 'physical-customer-0001'),
      /CTF_CUSTOMER_PATH_PREFIX_MISMATCH/,
    );
  }
});

test('physical identity is mandatory before hostile validation performs I/O', async () => {
  assert.throws(
    () => assertPhysicalDatabaseIdentity('database-a', undefined, 'probe'),
    /CTF_EXPECTED_PHYSICAL_DATABASE_IDENTITY_REQUIRED/,
  );
  let requested = false;
  await assert.rejects(() => runHostileValidation({
    baseUrl: 'http://127.0.0.1:3391',
    pathPrefix: '/customer/physical-customer-0001',
    expectedCustomerId: 'physical-customer-0001',
    controlToken: 'c'.repeat(32),
    fetchImpl: async () => {
      requested = true;
      return response({});
    },
  }), /CTF_EXPECTED_PHYSICAL_DATABASE_IDENTITY_REQUIRED/);
  assert.equal(requested, false);
});
