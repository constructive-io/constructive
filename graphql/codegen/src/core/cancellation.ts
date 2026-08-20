/** Return the caller-supplied abort reason, with a stable fallback for runtimes
 * that do not populate AbortSignal.reason. */
export function getAbortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error('Operation cancelled.');
  error.name = 'AbortError';
  return error;
}

/** Throw at explicit cancellation boundaries. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw getAbortReason(signal);
}

/** Cancellation must cross result-oriented APIs instead of becoming a
 * GenerateResult failure. */
export function rethrowIfCancelled(error: unknown, signal?: AbortSignal): void {
  if (signal?.aborted) throw getAbortReason(signal);
  if (error instanceof Error && error.name === 'AbortError') {
    throw error;
  }
}
