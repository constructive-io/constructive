// TEMPORARY partial copy for the headless host, until the pipeline port lands
// on feat/agentic-fast-app. It holds only `childEnv` and `killTree`, as the
// desktop's src/main/fast-app/command.ts has them. The port's full file
// replaces it.

import { scrubEnv } from '@agentic-kit/permissions';

/**
 * The environment of a build command (install, gen, tsc, the dev server, the
 * CRUD smoke): the desktop's own without anything secret, which keeps the
 * provider keys and tokens from the user's shell away from the app's code and
 * its dependencies, plus `extra`. An `undefined` in `extra` unsets a variable.
 */
export function childEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = { ...scrubEnv(process.env), ...extra };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  return env;
}

export function killTree(pid: number | undefined, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') process.kill(pid, signal);
    else process.kill(-pid, signal);
  } catch {
    // Already gone.
  }
}
