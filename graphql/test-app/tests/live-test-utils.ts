import assert from 'node:assert/strict';

import { QueryClient } from '@tanstack/react-query';

import { configure } from '../src/generated/hooks/client';
import { createClient } from '../src/generated/orm';

export interface LiveTestEnv {
  endpoint: string;
  email: string;
  password: string;
}

const DEFAULT_ENDPOINT = 'https://api.launchql.dev/graphql';

export function getLiveTestEnv(): LiveTestEnv | null {
  const email = process.env.GRAPHQL_TEST_EMAIL;
  const password = process.env.GRAPHQL_TEST_PASSWORD;
  const endpoint = process.env.GRAPHQL_TEST_ENDPOINT ?? DEFAULT_ENDPOINT;

  if (!email || !password) {
    return null;
  }

  return {
    endpoint,
    email,
    password,
  };
}

export function getLiveEnvHelpMessage(): string {
  return (
    'Live tests require GRAPHQL_TEST_EMAIL and GRAPHQL_TEST_PASSWORD. ' +
    `Optional GRAPHQL_TEST_ENDPOINT (default: ${DEFAULT_ENDPOINT}).`
  );
}

export function assertLiveEnvConfigured(
  env: LiveTestEnv | null
): asserts env is LiveTestEnv {
  if (!env) {
    if (process.env.GRAPHQL_TEST_LIVE_REQUIRED === '1') {
      throw new Error(getLiveEnvHelpMessage());
    }
  }
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function configureHooks(env: LiveTestEnv, token?: string): void {
  configure({
    endpoint: env.endpoint,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export interface AuthSession {
  token: string;
  userId: string;
}

export async function signIn(env: LiveTestEnv): Promise<AuthSession> {
  const client = createClient({ endpoint: env.endpoint });
  const result = await client.mutation
    .signIn(
      {
        input: {
          email: env.email,
          password: env.password,
          rememberMe: true,
        },
      },
      {
        select: {
          result: {
            select: {
              accessToken: true,
              userId: true,
              isVerified: true,
              totpEnabled: true,
            },
          },
        },
      }
    )
    .unwrap();

  const token = result.signIn.result?.accessToken ?? null;
  const userId = result.signIn.result?.userId ?? null;

  assert.ok(token, 'signIn did not return accessToken');
  assert.ok(userId, 'signIn did not return userId');

  return { token, userId };
}

export async function signOut(env: LiveTestEnv, token: string): Promise<void> {
  const client = createClient({
    endpoint: env.endpoint,
    headers: { Authorization: `Bearer ${token}` },
  });

  try {
    await client.mutation
      .signOut(
        { input: {} },
        {
          select: {
            clientMutationId: true,
          },
        }
      )
      .unwrap();
  } catch {
    // Best-effort cleanup: token might already be invalidated.
  }
}
