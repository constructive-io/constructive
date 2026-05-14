import type { Client as GqlWsClient } from 'graphql-ws';

/**
 * Subscribe via a graphql-ws WebSocket client and wait for the first event.
 *
 * Creates a subscription, resolves with the first `next` payload's `data`,
 * then automatically unsubscribes. Rejects on error or timeout.
 *
 * @param client - A graphql-ws Client instance
 * @param query - The GraphQL subscription query string
 * @param variables - Optional variables for the subscription
 * @param timeoutMs - Maximum time to wait (default: 15000ms)
 * @returns The `data` field of the first subscription event
 */
export function nextWsEvent<T = Record<string, unknown>>(
  client: GqlWsClient,
  query: string,
  variables?: Record<string, unknown>,
  timeoutMs = 15000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`nextWsEvent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const unsubscribe = client.subscribe(
      { query, variables },
      {
        next(value) {
          clearTimeout(timer);
          unsubscribe();
          resolve(value.data as T);
        },
        error(err) {
          clearTimeout(timer);
          unsubscribe();
          reject(Array.isArray(err) ? err[0] : err);
        },
        complete() {
          clearTimeout(timer);
          reject(new Error('Subscription completed without yielding a value'));
        },
      },
    );
  });
}

/**
 * Subscribe via a graphql-ws WebSocket client and collect events into an array.
 *
 * Events are pushed into the returned `events` array as they arrive.
 * Call `unsubscribe()` when done collecting.
 *
 * @param client - A graphql-ws Client instance
 * @param query - The GraphQL subscription query string
 * @param variables - Optional variables for the subscription
 * @returns An object with `events` array and `unsubscribe` function
 */
export function collectWsEvents<T = Record<string, unknown>>(
  client: GqlWsClient,
  query: string,
  variables?: Record<string, unknown>,
): { events: T[]; unsubscribe: () => void } {
  const events: T[] = [];
  const unsubscribe = client.subscribe(
    { query, variables },
    {
      next(value) {
        events.push(value.data as T);
      },
      error() { /* swallow */ },
      complete() { /* done */ },
    },
  );
  return { events, unsubscribe };
}
