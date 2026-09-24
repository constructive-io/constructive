// A bound session in `embedded` mode is an ordinary command on pipes: the
// runner spawns whatever the open frame names (an agent host, typically —
// `constructive-agent-host`), under the same allow-list and environment policy
// as any other command, and relays its stdio. What the runner adds is the
// binding, as arguments: `--run <run_id>` names the run the session executes,
// and `--cwd <dir>` the directory the client asked for, both for the command
// to interpret and enforce. The runner knows nothing about what runs inside —
// not the harness, not its log, not its credentials.
//
// The one thing the runner reads on the way through is the machine protocol's
// own vocabulary: a stdout line that is an `AgentEvent` is relayed as one, so
// the relay can ledger it structurally, and every other line is output.

import type { AgentEvent } from '@constructive-db/machine-protocol';
import { assertAgentEvent, isAgentEventLike } from '@constructive-db/machine-protocol';
import { spawn as spawnChild } from 'child_process';
import os from 'os';

import type { RunnerPolicy } from './policy';
import { resolveSpawn } from './policy';
import type { SessionProcess } from './runner';

export interface HeadlessProcessOptions {
  policy: RunnerPolicy;
  command: string;
  args: string[];
  /** The run the session is bound to; handed to the command as `--run`. */
  runId: string;
  /** The working directory the client asked for; handed on as `--cwd`. */
  cwd?: string;
}

/** The arguments the binding adds to the opener's own. */
export function bindingArgs(runId: string, cwd?: string): string[] {
  return ['--run', runId, ...(cwd !== undefined ? ['--cwd', cwd] : [])];
}

export function headlessProcess(options: HeadlessProcessOptions): SessionProcess {
  const spec = resolveSpawn(options.policy, options.command, [
    ...options.args,
    ...bindingArgs(options.runId, options.cwd)
  ]);

  let exited = false;
  let stdoutTail = '';
  const dataListeners: Array<(data: string) => void> = [];
  const eventListeners: Array<(event: AgentEvent) => void> = [];
  const exitListeners: Array<(event: { exitCode: number; signal?: number }) => void> = [];
  const errorListeners: Array<(err: Error) => void> = [];

  const emitData = (data: string): void => {
    for (const listener of dataListeners) listener(data);
  };
  const fail = (err: Error): void => {
    for (const listener of errorListeners) listener(err);
  };
  const signalNumber = (signal: NodeJS.Signals | string | undefined): number | undefined => {
    if (!signal) return undefined;
    return os.constants.signals[signal as NodeJS.Signals];
  };
  /**
   * A line is an event when it parses as one; anything else the process
   * prints is output. A line that names an event kind but is malformed is the
   * process breaking the protocol, and that fails the session rather than
   * passing as output — the relay would otherwise ledger a lie.
   */
  const parseLine = (line: string): void => {
    if (!line.startsWith('{')) {
      emitData(`${line}\n`);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Not JSON after all; the brace was the program's own output.
      emitData(`${line}\n`);
      return;
    }
    if (!isAgentEventLike(parsed)) {
      emitData(`${line}\n`);
      return;
    }
    const event = assertAgentEvent(parsed, `'${options.command}' stdout line`);
    for (const listener of eventListeners) listener(event);
  };
  const consumeStdout = (chunk: string): void => {
    stdoutTail += chunk;
    const lines = stdoutTail.split('\n');
    stdoutTail = lines.pop() ?? '';
    for (const line of lines) parseLine(line.endsWith('\r') ? line.slice(0, -1) : line);
  };
  const flushStdout = (): void => {
    if (!stdoutTail) return;
    const line = stdoutTail.endsWith('\r') ? stdoutTail.slice(0, -1) : stdoutTail;
    stdoutTail = '';
    parseLine(line);
  };

  const child = spawnChild(spec.command, spec.args, {
    cwd: spec.cwd,
    env: spec.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8').on('data', (data: string) => {
    try {
      consumeStdout(data);
    } catch (err) {
      // A protocol fault on stdout ends the session the way a spawn failure
      // does: visibly, with the process taken down rather than left talking to
      // nobody. The error is the session's one terminal report; the exit the
      // kill provokes must not follow it as a second.
      exited = true;
      fail(err instanceof Error ? err : new Error(String(err)));
      child.kill('SIGTERM');
    }
  });
  child.stderr.setEncoding('utf8').on('data', (data: string) => emitData(data));
  child.on('error', err => fail(err));
  child.on('exit', (code, signal) => {
    if (exited) return;
    exited = true;
    flushStdout();
    for (const listener of exitListeners) {
      listener({ exitCode: code ?? -1, ...(signal ? { signal: signalNumber(signal) } : {}) });
    }
  });

  return {
    write(data: string): void {
      // Input is line-oriented on a headless session: a prompt is a line.
      if (exited || child.stdin.destroyed) return;
      child.stdin.write(data.endsWith('\n') ? data : `${data}\n`);
    },
    kill(signal): void {
      child.kill(signal ?? 'SIGTERM');
    },
    onData(listener): void {
      dataListeners.push(listener);
    },
    onEvent(listener): void {
      eventListeners.push(listener);
    },
    onExit(listener): void {
      exitListeners.push(listener);
    },
    onError(listener): void {
      errorListeners.push(listener);
    }
  };
}
