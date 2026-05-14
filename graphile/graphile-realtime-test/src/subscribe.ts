import { subscribe as grafastSubscribe } from 'grafast';
import { parse } from 'graphql';
import type { GraphQLSchema, DocumentNode, ExecutionResult } from 'graphql';
import type { GraphileConfig } from 'graphile-config';

/**
 * A single event yielded by a subscription iterator.
 */
export interface SubscriptionEvent<TData = Record<string, unknown>> {
  data?: TData | null;
  errors?: readonly { message: string }[];
}

/**
 * Options for `subscribe()`.
 */
export interface SubscribeOptions {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  query: string | DocumentNode;
  variables?: Record<string, unknown>;
  contextValue?: Record<string, unknown>;
}

/**
 * Call grafast.subscribe() and return the raw async iterator.
 *
 * The caller is responsible for iterating the result and calling `.return()`
 * when done.
 *
 * @returns An AsyncIterableIterator that yields ExecutionResult events,
 *          or an ExecutionResult if subscription setup failed.
 */
export async function subscribe(
  opts: SubscribeOptions
): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
  const document =
    typeof opts.query === 'string' ? parse(opts.query) : opts.query;

  const result = await grafastSubscribe({
    schema: opts.schema,
    document,
    variableValues: opts.variables ?? undefined,
    contextValue: opts.contextValue ?? {},
    resolvedPreset: opts.resolvedPreset,
  });

  return result as AsyncIterableIterator<ExecutionResult> | ExecutionResult;
}

/**
 * Wait for the next event from a subscription iterator, with a timeout.
 *
 * @param iterator - The async iterator returned by `subscribe()`
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @returns The next subscription event
 * @throws If the timeout is exceeded or the iterator completes without a value
 */
export async function waitForEvent<TData = Record<string, unknown>>(
  iterator: AsyncIterableIterator<ExecutionResult>,
  timeoutMs = 5000
): Promise<SubscriptionEvent<TData>> {
  return new Promise<SubscriptionEvent<TData>>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`waitForEvent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    iterator
      .next()
      .then((result) => {
        clearTimeout(timer);
        if (result.done) {
          reject(new Error('Subscription iterator completed without yielding a value'));
        } else {
          resolve(result.value as SubscriptionEvent<TData>);
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Collect multiple events from a subscription iterator.
 *
 * @param iterator - The async iterator returned by `subscribe()`
 * @param count - Number of events to collect
 * @param timeoutMs - Maximum time to wait for all events (default: 10000ms)
 * @returns Array of collected events
 */
export async function collectEvents<TData = Record<string, unknown>>(
  iterator: AsyncIterableIterator<ExecutionResult>,
  count: number,
  timeoutMs = 10000
): Promise<SubscriptionEvent<TData>[]> {
  const events: SubscriptionEvent<TData>[] = [];
  const deadline = Date.now() + timeoutMs;

  for (let i = 0; i < count; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        `collectEvents timed out after ${timeoutMs}ms (collected ${events.length}/${count})`
      );
    }
    const event = await waitForEvent<TData>(iterator, remaining);
    events.push(event);
  }

  return events;
}
