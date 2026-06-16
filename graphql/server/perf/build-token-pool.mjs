#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  makeRunId,
  postJson,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId());
const runDir = path.resolve(
  getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)),
);
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);
const credentialsPath = path.resolve(
  getArgValue(args, '--credentials', path.join(runDir, 'data', 'tenant-credentials.json')),
);
const outputPath = path.resolve(
  getArgValue(args, '--output', path.join(runDir, 'data', 'tokens.json')),
);

const signInMutation = `
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    result {
      id
      userId
      accessToken
      accessTokenExpiresAt
    }
  }
}
`;

const toRouteHeaders = (row) => {
  if (row.apiName && row.databaseId) {
    return {
      Host: row.host || 'localhost',
      'X-Api-Name': row.apiName,
      'X-Database-Id': row.databaseId,
    };
  }

  if (row.host) {
    return { Host: row.host };
  }

  throw new Error(
    `credential row requires either {apiName,databaseId} or {host}; row=${JSON.stringify({
      tenantKey: row.tenantKey ?? null,
      email: row.email ?? null,
    })}`,
  );
};

const main = async () => {
  await ensureRunDirs(runDir);

  const raw = await fs.readFile(credentialsPath, 'utf8');
  const credentials = JSON.parse(raw);

  if (!Array.isArray(credentials) || credentials.length === 0) {
    throw new Error(`No credential rows found in ${credentialsPath}`);
  }

  const results = [];
  const failures = [];

  for (const row of credentials) {
    const headers = toRouteHeaders(row);
    const response = await postJson({
      url: `${baseUrl}/graphql`,
      headers,
      payload: {
        query: signInMutation,
        variables: {
          input: {
            email: row.email,
            password: row.password,
            rememberMe: true,
          },
        },
      },
      timeoutMs: 20000,
    });

    const signInResult = response.json?.data?.signIn?.result;
    const accessToken = signInResult?.accessToken;

    if (!response.ok || !accessToken) {
      failures.push({
        tenantKey: row.tenantKey ?? null,
        email: row.email ?? null,
        status: response.status,
        error:
          response.error ??
          response.json?.errors?.[0]?.message ??
          'signIn did not return accessToken',
      });
      continue;
    }

    results.push({
      key: `token:${row.tenantKey ?? row.email}`,
      mode: 'auth-token',
      tenantKey: row.tenantKey ?? null,
      email: row.email,
      userId: signInResult.userId ?? null,
      tokenId: signInResult.id ?? null,
      accessTokenExpiresAt: signInResult.accessTokenExpiresAt ?? null,
      graphqlUrl: '/graphql',
      headers: {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  const payload = {
    createdAt: new Date().toISOString(),
    baseUrl,
    credentialsPath,
    totalInput: credentials.length,
    successCount: results.length,
    failureCount: failures.length,
    failures,
    profiles: results,
  };

  await writeJson(outputPath, payload);

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalInput: credentials.length,
        successCount: results.length,
        failureCount: failures.length,
      },
      null,
      2,
    ),
  );

  if (failures.length > 0 && results.length === 0) {
    process.exit(2);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
