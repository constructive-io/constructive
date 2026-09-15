/**
 * The push wakeup, when the app has one.
 *
 * A run surface is correct without this: `follow` polls, and every read is a
 * cursor read, so nothing is missed by a reader that woke late. What realtime
 * buys is latency, and it costs nothing in correctness — which is why it is a
 * wakeup here rather than a delivery mechanism. Records are never taken from a
 * subscription payload: the notification says *something changed*, the cursor
 * read says *what*, so a dropped, duplicated or out-of-order notification cannot
 * corrupt a transcript, and a reconnecting client catches up by reading rather
 * than by replaying a socket.
 *
 * This is the platform's existing DataRealtime lane (statement-level triggers →
 * `change_log` → the `on<Table>Changed` subscription field), not a new transport.
 * The event table only carries it when the app declares DataRealtime on it, so
 * the subscription is optional everywhere in this package.
 */

import type { RunLogNames } from './names';

interface WsSink {
  next(value: { data?: unknown; errors?: readonly { message: string }[] }): void;
  error(error: unknown): void;
  complete(): void;
}

/** The graphql-ws surface this package uses — supplied by the host, never imported. */
export interface RunLogWsClient {
  subscribe(
    payload: { query: string; variables?: Record<string, unknown> },
    sink: WsSink
  ): () => void;
}

/**
 * `on<Type>Changed`, the name the platform's codegen gives a DataRealtime table's
 * subscription field. A host that reads the field out of `_meta`
 * (`MetaRealtime.subscriptionFieldName`) can pass it instead.
 */
export const changedSubscriptionField = (names: RunLogNames): string =>
  `on${names.eventType}Changed`;

/**
 * The generated subscription takes no arguments and is per-table, not per-run, so
 * a wakeup may be for somebody else's run — harmless, because the follower's
 * cursor read is what decides whether there is anything new for *this* one.
 */
export const changedSubscriptionDocument = (
  names: RunLogNames,
  field: string = changedSubscriptionField(names)
): string => `
subscription RunEventChanged {
  ${field} {
    event
    ${names.event} { __typename }
    timestamp
  }
}`;

export interface RealtimeWakeupOptions {
  client: RunLogWsClient;
  names: RunLogNames;
  /** Override when the host resolves the field name from `_meta` instead. */
  subscriptionField?: string;
  /** Surfaced to the caller; a failed socket must not silently become silence. */
  onError?: (error: Error) => void;
}

export interface RealtimeWakeup {
  /** Passed to `follow` as `waitForChange`. */
  waitForChange: (signal?: AbortSignal) => Promise<void>;
  close: () => void;
}

/**
 * One subscription, many waits: the socket stays open across follow iterations
 * and each `waitForChange` resolves on the next notification (or immediately, if
 * one arrived while the follower was busy reading — otherwise a change landing
 * mid-read would leave the follower asleep until the poll timer).
 */
export function createRealtimeWakeup(
  options: RealtimeWakeupOptions
): RealtimeWakeup {
  let pendingChange = false;
  let wake: (() => void) | null = null;
  let closed = false;

  const signalChange = () => {
    pendingChange = true;
    const resume = wake;
    wake = null;
    if (resume) resume();
  };

  const unsubscribe = options.client.subscribe(
    {
      query: changedSubscriptionDocument(
        options.names,
        options.subscriptionField
      ),
    },
    {
      next: (result) => {
        if (result.errors && result.errors.length > 0) {
          options.onError?.(
            new Error(result.errors.map((e) => e.message).join('; '))
          );
          return;
        }
        signalChange();
      },
      error: (error) => {
        options.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
        // Wake the follower so it falls back to polling instead of waiting on a
        // socket that is gone.
        signalChange();
      },
      complete: () => signalChange(),
    }
  );

  return {
    waitForChange: (signal?: AbortSignal) => {
      if (pendingChange || closed) {
        pendingChange = false;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        wake = resolve;
        signal?.addEventListener('abort', () => resolve(), { once: true });
      });
    },
    close: () => {
      closed = true;
      unsubscribe();
      signalChange();
    },
  };
}
