#!/usr/bin/env node
// `constructive-agent-cli`: a coding-agent CLI on the agent stdio contract.
// SIGTERM/SIGINT stop the CLI; its own exit status is this program's.

import { adapterForCommand } from './adapters';
import { parseArgs, UsageError } from './cli';
import { runAgentCliSession } from './session';

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2), process.env);
  const stop = new AbortController();
  process.once('SIGTERM', () => stop.abort());
  process.once('SIGINT', () => stop.abort());
  const exit = await runAgentCliSession({
    adapter: adapterForCommand(args.cli, args.extraArgs),
    resume: args.resume,
    approvalTimeoutMs: args.approvalTimeoutMs,
    onTimeout: args.onTimeout,
    io: { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr },
    abort: stop.signal
  });
  if (exit.signal) {
    process.kill(process.pid, exit.signal);
    return 128;
  }
  return exit.exitCode;
}

// The CLI's exit ends this program even while the caller still holds its
// stdin open (a one-shot `codex exec` under a session that has not been
// closed); stdout is flushed before the exit takes effect.
const exit = (code: number): void => {
  process.stdout.write('', () => process.exit(code));
};

main().then(exit, (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const prefixed = err instanceof UsageError || message.startsWith('agent-cli: ');
  process.stderr.write(`${prefixed ? '' : 'agent-cli: '}${message}\n`, () => {
    exit(err instanceof UsageError ? 2 : 1);
  });
});
