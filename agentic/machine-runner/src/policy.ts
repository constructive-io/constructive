// Local policy: the runner, not the relay, decides what may run on the
// machine it guards. The policy is written by the machine's owner and never
// travels over the wire — a compromised relay can ask, but the answer is
// decided here.

import os from 'os';
import path from 'path';

export interface RunnerPolicy {
  /** Commands (argv[0], exact match) a session may start. */
  allowedCommands: string[];
  /**
   * The root every session runs under: where a session starts by default, and
   * the directory a requested `cwd` must stay inside.
   */
  cwd: string;
  /**
   * Environment the spawned process sees: `allow` names process.env vars to
   * pass through, `set` adds explicit values. Nothing else leaks — the
   * runner's own environment (tokens included) never reaches a session.
   */
  env?: {
    allow?: string[];
    set?: Record<string, string>;
  };
}

/** Pass-through vars a pty session cannot reasonably run without. */
export const DEFAULT_ENV_ALLOW = ['PATH', 'HOME', 'TERM', 'LANG', 'USER', 'SHELL'];

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export interface SpawnSpec {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

/**
 * The directory a session runs in: the policy root, or a requested directory
 * resolved against it — and refused when it would land outside. The request
 * is the client's; where the root is, is the machine owner's.
 */
export function resolveCwd(policy: RunnerPolicy, requested?: string): string {
  const root = path.resolve(policy.cwd || os.homedir());
  if (requested === undefined) return root;
  const resolved = path.resolve(root, requested);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new PolicyViolationError(`cwd '${requested}' is outside the policy root`);
  }
  return resolved;
}

export function resolveSpawn(
  policy: RunnerPolicy,
  command: string,
  args: string[] = [],
  cwd?: string
): SpawnSpec {
  if (!policy.allowedCommands.includes(command)) {
    throw new PolicyViolationError(`command '${command}' is not in the allowed command list`);
  }
  const allow = policy.env?.allow ?? DEFAULT_ENV_ALLOW;
  const env: Record<string, string> = {};
  for (const name of allow) {
    const value = process.env[name];
    if (value !== undefined) env[name] = value;
  }
  for (const [name, value] of Object.entries(policy.env?.set ?? {})) {
    env[name] = value;
  }
  return {
    command,
    args,
    cwd: resolveCwd(policy, cwd),
    env
  };
}
