export const DB_TOOL_TIMEOUT_MS = 2 * 60 * 1000;
export const PROVISION_TIMEOUT_MS = 5 * 60 * 1000;

// The blueprint tools wait for a queued build, which db-tools gives up on
// after 4 minutes.
const LONG_DB_TOOLS = new Set([
  'provision_database',
  'provision_blueprint',
  'add_relation',
  'apply_template',
  'run_codegen',
]);

export const ABORT_MESSAGE =
  'The user stopped this call. Its outcome is unknown: the request can still finish on the server.';

export function timeoutFor(toolName: string): number {
  return LONG_DB_TOOLS.has(toolName) ? PROVISION_TIMEOUT_MS : DB_TOOL_TIMEOUT_MS;
}

export function timeoutMessage(timeoutMs: number): string {
  return `The backend did not answer in ${Math.round(timeoutMs / 60_000)} minutes. The request can still finish on the server. Examine the current state before you try again.`;
}

export async function executeWithLimits<T>(
  execute: () => Promise<T>,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
): Promise<T> {
  if (signal?.aborted) throw new Error(ABORT_MESSAGE);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage(timeoutMs))), timeoutMs);
    onAbort = () => reject(new Error(ABORT_MESSAGE));
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([execute(), limit]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}
