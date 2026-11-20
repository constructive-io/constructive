// The local stack answers "Schema isn't ready" for a minute or two after a
// restart, and a new database's endpoints can lag its provisioning by a few
// seconds. Those are worth one retry; anything else fails at once.

// The backend's own words, not any "not ready": the dev server's timeout says
// "was not ready after 90 s", and that is the app's error, not the backend's.
const NOT_READY = /schema (?:is not|isn't) (?:yet )?ready|isn't ready|not (?:yet ready|ready yet)/i;
const NETWORK =
  /ECONNRESET|socket hang up|fetch failed|HTTP 50[23]\b|\b50[23] (?:Bad Gateway|Service Unavailable)/i;

export const TRANSIENT_RETRY_MS = 5_000;

/** The backend's "not ready" answer, from a thrown error or a tool result's message. */
export function isNotReady(message: string): boolean {
  return NOT_READY.test(message);
}

export function isTransientError(message: string): boolean {
  return isNotReady(message) || NETWORK.test(message);
}

/**
 * A read of a schema this build just changed: while the API builds the new
 * handler it answers 500 too. Only a read may take this, since a write that
 * failed with a 500 may have run.
 */
export function isRebuildAnswer(message: string): boolean {
  return isTransientError(message) || /\bHTTP 500\b/.test(message);
}

/**
 * A provision_blueprint call that failed after the backend queued its build.
 * The build carries on without the call, so it is never retried: a second
 * build of the same tables fails on the ones the first made.
 */
export class QueuedBuildError extends Error {
  readonly constructionId: string;

  constructor(message: string, constructionId: string) {
    super(message);
    this.name = 'QueuedBuildError';
    this.constructionId = constructionId;
  }
}

/** The error a failed provision_blueprint call throws, by whether a build was queued. */
export function blueprintCallError(message: string, constructionId: string | null): Error {
  return constructionId ? new QueuedBuildError(message, constructionId) : new Error(message);
}

export const STILL_STARTING =
  'The backend still answers "Schema isn\'t ready" (the local stack restarted recently, or the new database is still coming up).';

/** Waits `ms`, or rejects with the signal's reason as soon as it aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type RetryOptions = {
  /** Says on the card that the backend isn't ready and when the retry runs. */
  note: (text: string) => void;
  signal?: AbortSignal;
  delayMs?: number;
  /** The failures worth another try; `isTransientError` unless the work is a read that may take more. */
  transient?: (message: string) => boolean;
};

export async function retryTransientOnce<T>(
  work: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  return retryTransient(work, { ...options, retries: 1 });
}

/**
 * A read, which is safe to repeat: `retries` more tries, each waiting twice
 * as long as the one before. The API answers 502 while it rebuilds a schema
 * that another build just changed, which can outlast one retry.
 */
export async function retryTransient<T>(
  work: () => Promise<T>,
  {
    note,
    signal,
    delayMs = TRANSIENT_RETRY_MS,
    retries,
    transient: worthRetry = isTransientError,
  }: RetryOptions & { retries: number },
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      const transient = !(err instanceof QueuedBuildError) && worthRetry(message);
      if (!transient || attempt >= retries || signal?.aborted) throw err;
      const wait = delayMs * 2 ** attempt;
      note(
        retries === 1
          ? `The backend is not ready yet (${message.slice(0, 120)}); retrying once in ${wait / 1000} s.`
          : `The backend is not ready yet (${message.slice(0, 120)}); retrying in ${wait / 1000} s.`,
      );
      await sleep(wait, signal);
    }
  }
}
