// The two ways a session's process runs: in a pty, when the session is a
// terminal, or on pipes, when it is a command. Both are driven through the
// same small interface; the runner does not care which it holds beyond
// whether it can be resized.

import type { SignalName } from '@constructive-db/machine-protocol';
import { spawn as spawnChild } from 'child_process';
import * as pty from 'node-pty';
import os from 'os';

import type { SpawnSpec } from './policy';

export interface ProcessExit {
  exitCode: number;
  signal?: number;
}

/** What the runner drives, whether it is a pty or a pair of pipes. */
export interface SessionProcess {
  write(data: string): void;
  /** Absent where there is no terminal to resize. */
  resize?(cols: number, rows: number): void;
  kill(signal?: SignalName): void;
  /**
   * Bytes the process wrote. A pty has one stream; a process on pipes says
   * which of its two a chunk came from.
   */
  onData(listener: (data: string, stream?: 'stdout' | 'stderr') => void): void;
  onExit(listener: (event: ProcessExit) => void): void;
  /** The process failed to run at all (a pty reports that by throwing from spawn). */
  onError(listener: (err: Error) => void): void;
}

export function ptyProcess(spec: SpawnSpec, cols: number, rows: number): SessionProcess {
  const proc = pty.spawn(spec.command, spec.args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: spec.cwd,
    env: spec.env
  });
  return {
    write: data => proc.write(data),
    resize: (c, r) => proc.resize(c, r),
    kill: signal => proc.kill(signal),
    onData: listener => proc.onData(data => listener(data)),
    onExit: listener => proc.onExit(listener),
    // A pty has no asynchronous failure: `pty.spawn` throws, and everything
    // after that is an exit.
    onError: () => {}
  };
}

function signalNumber(signal: NodeJS.Signals | string | null | undefined): number | undefined {
  if (!signal) return undefined;
  return os.constants.signals[signal as NodeJS.Signals];
}

export function pipeProcess(spec: SpawnSpec): SessionProcess {
  const dataListeners: Array<(data: string, stream: 'stdout' | 'stderr') => void> = [];
  const exitListeners: Array<(event: ProcessExit) => void> = [];
  const errorListeners: Array<(err: Error) => void> = [];
  let exited = false;

  const child = spawnChild(spec.command, spec.args, {
    cwd: spec.cwd,
    env: spec.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8').on('data', (data: string) => {
    for (const listener of dataListeners) listener(data, 'stdout');
  });
  child.stderr.setEncoding('utf8').on('data', (data: string) => {
    for (const listener of dataListeners) listener(data, 'stderr');
  });
  child.on('error', err => {
    for (const listener of errorListeners) listener(err);
  });
  child.on('exit', (code, signal) => {
    if (exited) return;
    exited = true;
    const number = signalNumber(signal);
    // A signal death has no code of its own; report it as a shell would.
    const exitCode = code ?? (number !== undefined ? 128 + number : -1);
    for (const listener of exitListeners) {
      listener({ exitCode, ...(number !== undefined ? { signal: number } : {}) });
    }
  });
  // A child that closed its stdin early makes the next write EPIPE. While it
  // runs that is the session's failure; once it has exited, the exit already
  // said everything and there is nobody left to tell.
  child.stdin.on('error', err => {
    if (exited) return;
    for (const listener of errorListeners) listener(err);
  });

  return {
    write(data) {
      if (!exited && child.stdin.writable) child.stdin.write(data);
    },
    kill(signal) {
      if (exited) return;
      child.kill(signal);
    },
    onData(listener) {
      dataListeners.push(listener);
    },
    onExit(listener) {
      exitListeners.push(listener);
    },
    onError(listener) {
      errorListeners.push(listener);
    }
  };
}
