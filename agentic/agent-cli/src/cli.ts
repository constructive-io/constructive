// The command line: `constructive-agent-cli <claude|codex> [--resume <id>]
// [--approval-timeout-ms <n>] [--on-timeout deny|allow] [-- <cli args...>]`.
// Which CLI is the one thing the caller must say; everything after `--` is
// handed to that CLI untouched. The approval flags default from the
// environment (`CONSTRUCTIVE_AGENT_CLI_APPROVAL_TIMEOUT_MS`,
// `CONSTRUCTIVE_AGENT_CLI_ON_TIMEOUT`): how long a machine waits on a question
// is the machine owner's setting, projected into the command by their policy.

import type { ApprovalDecision } from '@constructive-db/machine-protocol';

export interface AgentCliArgs {
  cli: 'claude' | 'codex';
  resume?: string;
  approvalTimeoutMs?: number;
  onTimeout?: ApprovalDecision;
  extraArgs: string[];
}

export const USAGE =
  'usage: constructive-agent-cli <claude|codex> [--resume <session-id>] ' +
  '[--approval-timeout-ms <n>] [--on-timeout deny|allow] [-- <cli args...>]';

export class UsageError extends Error {
  constructor(message: string) {
    super(`${message}\n${USAGE}`);
    this.name = 'UsageError';
  }
}

export const APPROVAL_TIMEOUT_ENV = 'CONSTRUCTIVE_AGENT_CLI_APPROVAL_TIMEOUT_MS';
export const ON_TIMEOUT_ENV = 'CONSTRUCTIVE_AGENT_CLI_ON_TIMEOUT';

export function parseArgs(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>> = {}
): AgentCliArgs {
  const cli = argv[0];
  if (cli !== 'claude' && cli !== 'codex') {
    throw new UsageError(cli === undefined ? 'a CLI name is required' : `unknown CLI '${cli}'`);
  }
  const values: Partial<Record<'resume' | 'approval-timeout-ms' | 'on-timeout', string>> = {};
  let extraArgs: string[] = [];
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      extraArgs = argv.slice(i + 1);
      break;
    }
    const eq = arg.indexOf('=');
    const flag = arg.startsWith('--') ? arg.slice(2, eq === -1 ? undefined : eq) : undefined;
    if (flag !== 'resume' && flag !== 'approval-timeout-ms' && flag !== 'on-timeout') {
      throw new UsageError(`unexpected argument '${arg}'`);
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined || value.length === 0 || (eq === -1 && value.startsWith('--'))) {
      throw new UsageError(`--${flag} needs a value`);
    }
    if (values[flag] !== undefined) throw new UsageError(`--${flag} given twice`);
    values[flag] = value;
  }
  const args: AgentCliArgs = { cli, extraArgs };
  if (values.resume !== undefined) args.resume = values.resume;
  const timeout = values['approval-timeout-ms'] ?? env[APPROVAL_TIMEOUT_ENV];
  if (timeout !== undefined) {
    const ms = Number(timeout);
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new UsageError(
        `--approval-timeout-ms (or ${APPROVAL_TIMEOUT_ENV}) must be a positive number of milliseconds`
      );
    }
    args.approvalTimeoutMs = ms;
  }
  const onTimeout = values['on-timeout'] ?? env[ON_TIMEOUT_ENV];
  if (onTimeout !== undefined) {
    if (onTimeout !== 'deny' && onTimeout !== 'allow') {
      throw new UsageError(`--on-timeout (or ${ON_TIMEOUT_ENV}) must be 'deny' or 'allow'`);
    }
    args.onTimeout = onTimeout;
  }
  return args;
}
