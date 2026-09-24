// Runner configuration: a list of enrollments (one per relay/database this
// machine is enrolled in) plus the local policy. Loaded from a JSON file the
// machine's owner writes; malformed config is a deployment fault and throws.

import fs from 'fs';

import { RunnerPolicy } from './policy';

export interface Enrollment {
  /** The machine's identity at this relay. */
  machineId: string;
  /** Where to dial out to, e.g. wss://relay.example.com. */
  relayUrl: string;
  /** The static machine token for this enrollment. Never logged. */
  token: string;
  /** The database this enrollment belongs to. */
  database: string;
}

export interface RunnerConfig {
  enrollments: Enrollment[];
  policy: RunnerPolicy;
}

function requireString(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`machine-runner config: ${where} is missing '${key}'`);
  }
  return value;
}

export function parseRunnerConfig(raw: unknown): RunnerConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('machine-runner config: root must be an object');
  }
  const root = raw as Record<string, unknown>;
  if (!Array.isArray(root.enrollments) || root.enrollments.length === 0) {
    throw new Error("machine-runner config: 'enrollments' must be a non-empty array");
  }
  const enrollments = root.enrollments.map((entry, i): Enrollment => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`machine-runner config: enrollments[${i}] must be an object`);
    }
    const obj = entry as Record<string, unknown>;
    const where = `enrollments[${i}]`;
    return {
      machineId: requireString(obj, 'machineId', where),
      relayUrl: requireString(obj, 'relayUrl', where),
      token: requireString(obj, 'token', where),
      database: requireString(obj, 'database', where)
    };
  });
  const policy = root.policy;
  if (typeof policy !== 'object' || policy === null) {
    throw new Error("machine-runner config: 'policy' must be an object");
  }
  const policyObj = policy as Record<string, unknown>;
  if (
    !Array.isArray(policyObj.allowedCommands) ||
    policyObj.allowedCommands.some(c => typeof c !== 'string')
  ) {
    throw new Error("machine-runner config: 'policy.allowedCommands' must be a string array");
  }
  if (typeof policyObj.cwd !== 'string' || policyObj.cwd.length === 0) {
    throw new Error("machine-runner config: 'policy.cwd' is required");
  }
  if (policyObj.approvals !== undefined) {
    if (typeof policyObj.approvals !== 'object' || policyObj.approvals === null) {
      throw new Error("machine-runner config: 'policy.approvals' must be an object");
    }
    const approvals = policyObj.approvals as Record<string, unknown>;
    if (
      approvals.timeoutMs !== undefined &&
      (typeof approvals.timeoutMs !== 'number' || !(approvals.timeoutMs > 0))
    ) {
      throw new Error("machine-runner config: 'policy.approvals.timeoutMs' must be a positive number");
    }
    if (
      approvals.onTimeout !== undefined &&
      approvals.onTimeout !== 'deny' &&
      approvals.onTimeout !== 'allow'
    ) {
      throw new Error("machine-runner config: 'policy.approvals.onTimeout' must be 'deny' or 'allow'");
    }
  }
  return {
    enrollments,
    policy: policyObj as unknown as RunnerPolicy
  };
}

export function loadRunnerConfig(path: string): RunnerConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(
      `machine-runner config: cannot read '${path}': ${err instanceof Error ? err.message : err}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `machine-runner config: '${path}' is not JSON: ${err instanceof Error ? err.message : err}`
    );
  }
  return parseRunnerConfig(parsed);
}
