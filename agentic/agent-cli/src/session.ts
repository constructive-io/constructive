// One coding-agent CLI session, adapted to the machine protocol's agent stdio
// contract. This is the program the relay opens — on pipes, through a machine
// runner that treats it as any other command — when a session is bound to a
// run in `cli` mode:
//
//   stdin   the prompt, one line; then further prompts (turns) or
//           `approval_decision` JSON lines
//   stdout  `AgentEvent` JSON lines, nothing else
//   stderr  everything the CLI says that is not its protocol
//   exit    the CLI's own status
//
// The CLI itself (`claude`, `codex`) is spawned from PATH: this program runs on
// the user's own machine, next to the CLI they installed, and is itself the
// command the machine's policy allows.

import type { AgentEvent, ApprovalDecision } from '@constructive-db/machine-protocol';
import { LineSplitter, parseApprovalDecisionLine } from '@constructive-db/machine-protocol';
import { spawn as spawnChild } from 'child_process';
import type { Readable, Writable } from 'stream';

import type { AgentCliAdapter } from './adapters';

export const APPROVAL_AUTO_DENY_REASON =
  'approval round-trip is not available in this session; denied automatically';
export const APPROVAL_TIMEOUT_REASON = 'no decision arrived before the approval timeout';
export const APPROVAL_EXIT_REASON = 'the session ended while the approval was pending';

/** Five minutes: long enough for a human to look, short enough to notice. */
export const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60_000;

export interface AgentCliIo {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
}

export interface AgentCliSessionOptions {
  adapter: AgentCliAdapter;
  /** The CLI's own session to continue, if any. */
  resume?: string;
  io: AgentCliIo;
  /** How long a tool approval waits for a decision line before it is settled here. */
  approvalTimeoutMs?: number;
  /** What a timed-out approval is settled as. */
  onTimeout?: ApprovalDecision;
  /** Where the CLI runs; defaults to this process's directory. */
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Stop: the CLI is sent SIGTERM and the session resolves with its exit. */
  abort?: AbortSignal;
}

export interface AgentCliExit {
  exitCode: number;
  signal?: NodeJS.Signals;
}

/**
 * Run the session to the CLI's exit. Resolves with the CLI's exit, rejects when
 * the CLI could not be started or broke its own protocol.
 */
export function runAgentCliSession(options: AgentCliSessionOptions): Promise<AgentCliExit> {
  const { adapter, io } = options;
  const timeoutMs = options.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
  const onTimeout = options.onTimeout ?? 'deny';

  return new Promise<AgentCliExit>((resolve, reject) => {
    let child: ReturnType<typeof spawnChild> | null = null;
    let cliStdinEnded = false;
    let exited = false;
    const pending = new Map<string, NodeJS.Timeout>();
    const cliLines = new LineSplitter();
    const inputLines = new LineSplitter();

    const event = (value: AgentEvent): void => {
      io.stdout.write(`${JSON.stringify(value)}\n`);
    };
    const note = (message: string): void => {
      io.stderr.write(`agent-cli: ${message}\n`);
    };
    const fail = (err: Error): void => {
      if (exited) return;
      exited = true;
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      child?.kill();
      reject(err);
    };

    /**
     * Answer the CLI and record the answer as an `approval_resolved` event,
     * whoever decided. False when nothing was pending under that id: a second
     * answer, or one arriving after the timeout spoke, is not written into the
     * CLI as a second control response.
     */
    const settle = (requestId: string, decision: ApprovalDecision, reason?: string): boolean => {
      const timer = pending.get(requestId);
      if (timer === undefined) return false;
      clearTimeout(timer);
      pending.delete(requestId);
      if (!child || !adapter.encodeApproval) {
        throw new Error(`agent-cli: ${adapter.name} approval '${requestId}' cannot be answered`);
      }
      if (cliStdinEnded || exited) {
        note(`${adapter.name} approval '${requestId}' ${decision} arrived after the CLI's stdin closed`);
      } else {
        child.stdin.write(adapter.encodeApproval(requestId, decision, reason));
      }
      event({
        kind: 'approval_resolved',
        requestId,
        decision,
        ...(reason === undefined ? {} : { reason })
      });
      return true;
    };
    const settleAll = (reason: string): void => {
      for (const requestId of [...pending.keys()]) settle(requestId, 'deny', reason);
    };

    const onEvent = (value: AgentEvent): void => {
      // The request is an event like any other — it is what the ledger and a
      // watching client see. Only its answer travels the other way.
      event(value);
      if (value.kind !== 'approval_requested') return;
      if (!adapter.encodeApproval) {
        // The adapter can surface the question but has no way to answer it;
        // say so in the record rather than leaving a request open forever.
        event({
          kind: 'approval_resolved',
          requestId: value.requestId,
          decision: 'deny',
          reason: APPROVAL_AUTO_DENY_REASON
        });
        return;
      }
      if (pending.has(value.requestId)) {
        throw new Error(`agent-cli: ${adapter.name} asked for approval '${value.requestId}' twice`);
      }
      const timer = setTimeout(() => {
        settle(value.requestId, onTimeout, APPROVAL_TIMEOUT_REASON);
      }, timeoutMs);
      pending.set(value.requestId, timer);
    };

    const onCliLine = (line: string): void => {
      // Only the parse is guarded: a line that is not the adapter's protocol is
      // the CLI talking, and goes to stderr. What a parsed event then does is
      // not guarded, so a fault there (a duplicated approval id) fails the run.
      let events: AgentEvent[] | null;
      try {
        events = adapter.parseEvent(line);
      } catch {
        io.stderr.write(`${line}\n`);
        return;
      }
      if (events) for (const value of events) onEvent(value);
    };

    const start = (prompt: string): void => {
      const spawn = adapter.spawnArgs(prompt, options.resume);
      child = spawnChild(spawn.command, spawn.args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      child.stdout.setEncoding('utf8').on('data', (data: string) => {
        try {
          for (const line of cliLines.push(data)) onCliLine(line);
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      });
      child.stderr.setEncoding('utf8').on('data', (data: string) => io.stderr.write(data));
      child.on('error', err => fail(new Error(`agent-cli: ${spawn.command} failed: ${err.message}`, { cause: err })));
      child.on('exit', (code, signal) => {
        if (exited) return;
        try {
          for (const line of cliLines.flush()) onCliLine(line);
          settleAll(APPROVAL_EXIT_REASON);
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        exited = true;
        resolve({ exitCode: code ?? -1, ...(signal ? { signal } : {}) });
      });
      // The CLI closing its stdin early (a one-shot `codex exec`) makes the
      // next write EPIPE. Its exit is the report; the write that missed is noted.
      child.stdin.on('error', err => {
        if (!exited) note(`${spawn.command} stdin: ${err.message}`);
      });
      if (spawn.stdinPrompt !== undefined) child.stdin.write(spawn.stdinPrompt);
      if (!adapter.encodeTurn) {
        child.stdin.end();
        cliStdinEnded = true;
      }
    };

    const onInputLine = (line: string): void => {
      if (line.length === 0) return;
      const decision = parseApprovalDecisionLine(line);
      if (decision) {
        if (!settle(decision.requestId, decision.decision, decision.reason)) {
          note(`no pending approval '${decision.requestId}'; the decision arrived after it was settled`);
        }
        return;
      }
      if (!child) {
        start(line);
        return;
      }
      if (adapter.encodeTurn && !cliStdinEnded) {
        child.stdin.write(adapter.encodeTurn(line));
        return;
      }
      note(`${adapter.name} takes a single prompt; open a new session with cliSessionId to continue`);
    };

    options.abort?.addEventListener('abort', () => {
      if (exited) return;
      if (child) {
        child.kill('SIGTERM');
        return;
      }
      exited = true;
      resolve({ exitCode: -1, signal: 'SIGTERM' });
    });

    io.stdin.setEncoding('utf8');
    io.stdin.on('data', (data: string) => {
      try {
        for (const line of inputLines.push(data)) onInputLine(line);
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    });
    io.stdin.on('end', () => {
      try {
        for (const line of inputLines.flush()) onInputLine(line);
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      // No prompt ever came: there is nothing to run.
      if (!child) {
        exited = true;
        resolve({ exitCode: 0 });
      }
    });
    io.stdin.on('error', err => fail(new Error(`agent-cli: stdin failed: ${err.message}`, { cause: err })));
  });
}
