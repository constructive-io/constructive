// The runner's own command surface: `enroll`, `start`, `status`.
//
// It is deliberately its own binary rather than a subcommand of the
// control-plane CLI: the runner is a daemon that needs a native `node-pty`
// build on the box it serves, and the box is usually not the machine the
// operator's credentials live on.
//
// The one rule that shapes `enroll`: the enrollment token is read from stdin or
// an environment variable and NEVER from argv. Shell history is a log, and a
// token in `~/.bash_history` outlives the exchange it was meant for. Passing
// `--token` is refused rather than accepted quietly.

import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadRunnerConfig, parseRunnerConfig, RunnerConfig } from './config';
import { RunnerPolicy } from './policy';

/** Env var carrying the enrollment token, for non-interactive installs. */
export const TOKEN_ENV = 'MACHINE_ENROLLMENT_TOKEN';

/** Where the runner keeps its config when nothing says otherwise. */
export function defaultConfigPath(): string {
  return process.env.MACHINE_RUNNER_CONFIG || path.join(os.homedir(), '.machine-runner/config.json');
}

export interface CliIo {
  /** Everything the CLI says. Never a secret. */
  out: (line: string) => void;
  /** Reads the enrollment token from stdin; only called when the env var is absent. */
  readStdin: () => Promise<string>;
  env: NodeJS.ProcessEnv;
}

export function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[name] = true;
    } else {
      flags[name] = next;
      i += 1;
    }
  }
  return flags;
}

function requireFlag(flags: Record<string, string | true>, name: string): string {
  const value = flags[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`machine-runner: --${name} is required`);
  }
  return value;
}

function readTokenFromEnv(env: NodeJS.ProcessEnv): string | null {
  const value = env[TOKEN_ENV];
  return value && value.length > 0 ? value : null;
}

/**
 * The token, from the environment or stdin. A token on the command line is a
 * refusal, not a fallback — accepting it would put it in shell history, which
 * is exactly the leak the paste-once flow exists to avoid.
 */
export async function resolveEnrollmentToken(
  flags: Record<string, string | true>,
  io: CliIo
): Promise<string> {
  if ('token' in flags) {
    throw new Error(
      `machine-runner: refusing a token on the command line — shell history is a log. ` +
        `Pipe it on stdin or set ${TOKEN_ENV}.`
    );
  }
  const fromEnv = readTokenFromEnv(io.env);
  if (fromEnv) return fromEnv;
  const fromStdin = (await io.readStdin()).trim();
  if (!fromStdin) {
    throw new Error(
      `machine-runner: no enrollment token — paste it on stdin or set ${TOKEN_ENV}`
    );
  }
  return fromStdin;
}

function defaultPolicy(flags: Record<string, string | true>): RunnerPolicy {
  const allowed = typeof flags.allow === 'string' ? flags.allow.split(',').map(c => c.trim()) : null;
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : os.homedir();
  return {
    allowedCommands: allowed && allowed.length > 0 ? allowed : ['bash', 'sh', 'zsh'],
    cwd
  };
}

function readExistingConfig(configPath: string): RunnerConfig | null {
  if (!fs.existsSync(configPath)) return null;
  // A config that exists but does not parse is a fault to surface, not to
  // overwrite: overwriting would silently drop the machine's other enrollments.
  return loadRunnerConfig(configPath);
}

/**
 * Write (or extend) the runner config for one relay + machine. A machine can be
 * enrolled in several databases, so an existing config is merged: the entry for
 * the same machine at the same relay is replaced, everything else is kept.
 */
export function writeEnrollment(
  configPath: string,
  enrollment: { machineId: string; relayUrl: string; token: string; database: string },
  policy: RunnerPolicy
): RunnerConfig {
  const existing = readExistingConfig(configPath);
  const others = (existing?.enrollments ?? []).filter(
    e => !(e.machineId === enrollment.machineId && e.relayUrl === enrollment.relayUrl)
  );
  const next = parseRunnerConfig({
    enrollments: [...others, enrollment],
    policy: existing?.policy ?? policy
  });
  fs.mkdirSync(path.dirname(configPath), { recursive: true, mode: 0o700 });
  // 0600 on the file: it holds the enrollment token until the first exchange
  // replaces it with a short-lived credential.
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(configPath, 0o600);
  return next;
}

async function enroll(flags: Record<string, string | true>, io: CliIo): Promise<void> {
  const relayUrl = requireFlag(flags, 'relay');
  const machineId = requireFlag(flags, 'machine');
  const database = requireFlag(flags, 'database');
  const configPath = typeof flags.config === 'string' ? flags.config : defaultConfigPath();
  const token = await resolveEnrollmentToken(flags, io);
  const config = writeEnrollment(
    configPath,
    { machineId, relayUrl, token, database },
    defaultPolicy(flags)
  );
  // Facts only. The token was written to a 0600 file and is never echoed.
  io.out(`enrolled machine ${machineId} at ${relayUrl}`);
  io.out(`config ${configPath} (${config.enrollments.length} enrollment(s), mode 0600)`);
  io.out(`allowed commands: ${config.policy.allowedCommands.join(', ')}`);
  io.out('next: machine-runner start');
}

function status(flags: Record<string, string | true>, io: CliIo): void {
  const configPath = typeof flags.config === 'string' ? flags.config : defaultConfigPath();
  if (!fs.existsSync(configPath)) {
    io.out(`no config at ${configPath} — run: machine-runner enroll --relay <wss://…> --machine <id> --database <id>`);
    return;
  }
  const config = loadRunnerConfig(configPath);
  const mode = (fs.statSync(configPath).mode & 0o777).toString(8);
  io.out(`config ${configPath} (mode ${mode})`);
  io.out(`cwd ${config.policy.cwd}`);
  io.out(`allowed commands: ${config.policy.allowedCommands.join(', ')}`);
  for (const enrollment of config.enrollments) {
    // `secret stored` is the only thing said about the secret, ever.
    io.out(
      `machine ${enrollment.machineId} relay ${enrollment.relayUrl} database ${enrollment.database} secret stored`
    );
  }
}

export const RUNNER_USAGE = `machine-runner <command>

  enroll --relay <wss://host> --machine <uuid> --database <uuid> [--config <path>]
         [--allow bash,sh] [--cwd <dir>]
         reads the enrollment token from stdin or ${TOKEN_ENV} — never from argv

  start  [--config <path>]   dial the relay and serve sessions
  status [--config <path>]   what this runner is enrolled in (never secrets)`;

/**
 * Run everything except `start`, which the entrypoint owns because it takes over
 * the process. Returns false when the command was `start`, so the caller boots
 * the daemon.
 */
export async function runRunnerCli(argv: string[], io: CliIo): Promise<boolean> {
  const [command, ...rest] = argv;
  const flags = parseFlags(rest);
  switch (command) {
  case 'enroll':
    await enroll(flags, io);
    return true;
  case 'status':
    status(flags, io);
    return true;
  case 'help':
  case '--help':
  case '-h':
    io.out(RUNNER_USAGE);
    return true;
  default:
    return false;
  }
}
