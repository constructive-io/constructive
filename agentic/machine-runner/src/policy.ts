// Local policy: the runner, not the relay, decides what may run on the
// machine it guards. The policy is written by the machine's owner and never
// travels over the wire — a compromised relay can ask, but the answer is
// decided here.

import os from 'os';

export interface RunnerPolicy {
  /** Commands (argv[0], exact match) a session may start. */
  allowedCommands: string[];
  /** Working directory every session starts in. */
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
  /**
   * How long a bound CLI agent's tool approval may wait for an answer from
   * the relay before the runner settles it itself. The CLI is never left
   * hanging: past `timeoutMs` the runner answers with `onTimeout`, which is a
   * denial unless the machine's owner says otherwise.
   */
  approvals?: {
    timeoutMs?: number;
    onTimeout?: 'deny' | 'allow';
  };
}

/** Five minutes: long enough for a human to look, short enough to notice. */
export const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;

export interface ApprovalPolicy {
  timeoutMs: number;
  onTimeout: 'deny' | 'allow';
}

export function resolveApprovalPolicy(policy: RunnerPolicy): ApprovalPolicy {
  const timeoutMs = policy.approvals?.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new PolicyViolationError(
      `policy.approvals.timeoutMs must be a positive number of milliseconds, got ${timeoutMs}`
    );
  }
  const onTimeout = policy.approvals?.onTimeout ?? 'deny';
  if (onTimeout !== 'deny' && onTimeout !== 'allow') {
    throw new PolicyViolationError(
      `policy.approvals.onTimeout must be 'deny' or 'allow', got ${String(onTimeout)}`
    );
  }
  return { timeoutMs, onTimeout };
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

export function resolveSpawn(
  policy: RunnerPolicy,
  command: string,
  args: string[] = []
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
    cwd: policy.cwd || os.homedir(),
    env
  };
}
