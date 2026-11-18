// Tests for run_codegen endpoint derivation. Run with:
//   pnpm test -- __tests__/extensions/db-tools/run-codegen-endpoints.test.ts

import assert from 'node:assert/strict';

import {
  codegenEndpointEnv,
  derivePlaneEndpoints,
  envLocalContent,
} from '@agentic-kit/db-tools/run-codegen/endpoints';

test('derivePlaneEndpoints swaps the first host label per plane (remote backend)', () => {
  const planes = derivePlaneEndpoints('https://api.launchql.dev/graphql', 'contacts-book');
  assert.deepEqual(planes, {
    admin: 'https://admin-contacts-book.launchql.dev/graphql',
    auth: 'https://auth-contacts-book.launchql.dev/graphql',
    app: 'https://api-contacts-book.launchql.dev/graphql',
  });
});

test('derivePlaneEndpoints preserves port and scheme on localhost', () => {
  const planes = derivePlaneEndpoints('http://api.localhost:3000/graphql', 'myapp');
  assert.deepEqual(planes, {
    admin: 'http://admin-myapp.localhost:3000/graphql',
    auth: 'http://auth-myapp.localhost:3000/graphql',
    app: 'http://api-myapp.localhost:3000/graphql',
  });
});

test('derivePlaneEndpoints returns undefined for an unparsable endpoint', () => {
  assert.equal(derivePlaneEndpoints('not a url', 'myapp'), undefined);
});

test('codegenEndpointEnv sets endpoint + Host pairs that stay in sync', () => {
  const planes = derivePlaneEndpoints('http://api.localhost:3000/graphql', 'myapp');
  assert.ok(planes);
  const env = codegenEndpointEnv(planes);
  assert.deepEqual(env, {
    CODEGEN_ADMIN_ENDPOINT: 'http://admin-myapp.localhost:3000/graphql',
    CODEGEN_ADMIN_HOST: 'admin-myapp.localhost:3000',
    CODEGEN_AUTH_ENDPOINT: 'http://auth-myapp.localhost:3000/graphql',
    CODEGEN_AUTH_HOST: 'auth-myapp.localhost:3000',
    CODEGEN_APP_ENDPOINT: 'http://api-myapp.localhost:3000/graphql',
    CODEGEN_APP_HOST: 'api-myapp.localhost:3000',
  });
});

test('codegenEndpointEnv omits the port from Host on default-port https', () => {
  const planes = derivePlaneEndpoints('https://api.launchql.dev/graphql', 'contacts-book');
  assert.ok(planes);
  const env = codegenEndpointEnv(planes);
  assert.equal(env.CODEGEN_APP_HOST, 'api-contacts-book.launchql.dev');
});

test('envLocalContent writes db name plus the three endpoint overrides', () => {
  const planes = derivePlaneEndpoints('https://api.launchql.dev/graphql', 'contacts-book');
  assert.equal(
    envLocalContent('contacts-book', planes),
    'NEXT_PUBLIC_DB_NAME=contacts-book\n' +
      'NEXT_PUBLIC_ADMIN_ENDPOINT=https://admin-contacts-book.launchql.dev/graphql\n' +
      'NEXT_PUBLIC_AUTH_ENDPOINT=https://auth-contacts-book.launchql.dev/graphql\n' +
      'NEXT_PUBLIC_APP_ENDPOINT=https://api-contacts-book.launchql.dev/graphql\n',
  );
});

test('envLocalContent degrades to db name only when derivation failed', () => {
  assert.equal(envLocalContent('myapp', undefined), 'NEXT_PUBLIC_DB_NAME=myapp\n');
});
