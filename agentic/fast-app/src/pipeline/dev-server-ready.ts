// Reads a dev server's output as it streams and says when it is ready, on
// which URL, or why it failed to start. Line-based and stateful across chunks,
// because a chunk can end in the middle of a line.

export type DevOutputState = {
  ready: boolean;
  url: string | null;
  error: string | null;
  /** The unterminated tail of the last chunk. */
  partial: string;
};

export const INITIAL_DEV_OUTPUT: DevOutputState = {
  ready: false,
  url: null,
  error: null,
  partial: '',
};

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const LOCAL_URL = /\bLocal:\s+(https?:\/\/[^\s]+)/i;
const READY = /(?:^|\s)(?:✓\s*)?Ready in\b|\bready - started server\b/i;
const FATAL = [
  /\bEADDRINUSE\b.*/,
  /Failed to start server.*/i,
  /Error: Cannot find module.*/,
  /ERR_PNPM_[A-Z_]+.*/,
  /command not found.*/i,
];

export function stripAnsi(text: string): string {
  return text.replace(ANSI, '');
}

export function parseDevOutput(state: DevOutputState, chunk: string): DevOutputState {
  const text = state.partial + stripAnsi(chunk);
  const lines = text.split(/\r?\n/);
  const partial = lines.pop() ?? '';
  let { ready, url, error } = state;
  for (const line of lines) {
    const local = line.match(LOCAL_URL);
    if (local) url = local[1].replace(/\/$/, '');
    if (READY.test(line)) ready = true;
    if (!error && !ready) {
      for (const pattern of FATAL) {
        const match = line.match(pattern);
        if (match) {
          error = match[0].trim();
          break;
        }
      }
    }
  }
  return { ready, url, error, partial };
}

/** The URL to probe once ready: the one the server printed, else localhost on the port asked for. */
export function devServerUrl(state: DevOutputState, port: number): string {
  return state.url ?? `http://localhost:${port}`;
}
