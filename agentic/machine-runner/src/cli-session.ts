import type { AgentEvent, ApprovalDecision } from '@constructive-db/machine-protocol';
import type { Logger } from '@pgpmjs/logger';
import { spawn as spawnChild } from 'child_process';
import os from 'os';

import type { AgentCliAdapter } from './agent-cli';
import type { RunnerPolicy } from './policy';
import { resolveApprovalPolicy, resolveSpawn } from './policy';
import type { ApprovalRequest, SessionProcess } from './runner';

export const APPROVAL_AUTO_DENY_REASON =
  'approval round-trip is not available in this session; denied automatically';
export const APPROVAL_TIMEOUT_REASON = 'no decision arrived before the approval timeout';
export const APPROVAL_DISCONNECT_REASON =
  'the runner lost its relay while the approval was pending; denied';
export const APPROVAL_EXIT_REASON = 'the session ended while the approval was pending';

export interface CliProcessOptions {
  adapter: AgentCliAdapter;
  policy: RunnerPolicy;
  command: string;
  resume?: string;
  logger: Logger;
}

export function cliProcess(options: CliProcessOptions): SessionProcess {
  // Validate the opener's command before the session row reaches the runner.
  resolveSpawn(options.policy, options.command, []);

  let child: ReturnType<typeof spawnChild> | null = null;
  let firstWrite = true;
  let stdinEnded = false;
  let exited = false;
  let stdoutTail = '';
  const approvalPolicy = resolveApprovalPolicy(options.policy);
  const pendingApprovals = new Map<string, NodeJS.Timeout>();
  const dataListeners: Array<(data: string) => void> = [];
  const eventListeners: Array<(event: AgentEvent) => void> = [];
  const approvalListeners: Array<(request: ApprovalRequest) => void> = [];
  const warningListeners: Array<(message: string) => void> = [];
  const exitListeners: Array<(event: { exitCode: number; signal?: number }) => void> = [];
  const errorListeners: Array<(err: Error) => void> = [];

  const emitData = (data: string): void => {
    for (const listener of dataListeners) listener(data);
  };
  const emitWarning = (message: string): void => {
    for (const listener of warningListeners) listener(message);
  };
  /**
   * Answer the CLI. Returns false when nothing was pending under that id: an
   * answer that arrives twice, or after a timeout already spoke, is ignored
   * rather than written into the CLI's stdin as a second control response.
   */
  const answer = (requestId: string, decision: ApprovalDecision, reason?: string): boolean => {
    const timer = pendingApprovals.get(requestId);
    if (timer === undefined) return false;
    clearTimeout(timer);
    pendingApprovals.delete(requestId);
    if (!child || !options.adapter.encodeApproval) {
      throw new Error(
        `machine-runner: ${options.adapter.name} approval '${requestId}' cannot be answered without a process`
      );
    }
    if (stdinEnded || exited) {
      options.logger.warn(
        `machine-runner: ${options.adapter.name} approval '${requestId}' ${decision} arrived after stdin closed`
      );
      return true;
    }
    child.stdin.write(options.adapter.encodeApproval(requestId, decision, reason));
    options.logger.info(
      `machine-runner: ${options.adapter.name} approval '${requestId}' ${decision}` +
        (reason ? `: ${reason}` : '')
    );
    return true;
  };
  /**
   * Answer the CLI and report it as an `approval_resolved` event, whoever
   * decided: the event stream is the session's record, and a request in it
   * without its answer reads as still open.
   */
  const settle = (requestId: string, decision: ApprovalDecision, reason?: string): boolean => {
    if (!answer(requestId, decision, reason)) return false;
    for (const listener of eventListeners) {
      listener({
        kind: 'approval_resolved',
        requestId,
        decision,
        ...(reason === undefined ? {} : { reason })
      });
    }
    return true;
  };
  const emitEvent = (event: AgentEvent): void => {
    // The request itself is an event like any other: it is what the ledger
    // and a watching client see. Only its answer is routed differently.
    for (const listener of eventListeners) listener(event);
    if (event.kind !== 'approval_requested') return;
    if (!options.adapter.encodeApproval) {
      // The adapter can surface the question but has no way to answer it;
      // say so in the record rather than leaving a request open forever.
      options.logger.warn(
        `machine-runner: ${options.adapter.name} approval '${event.requestId}' cannot be answered: ${APPROVAL_AUTO_DENY_REASON}`
      );
      for (const listener of eventListeners) {
        listener({
          kind: 'approval_resolved',
          requestId: event.requestId,
          decision: 'deny',
          reason: APPROVAL_AUTO_DENY_REASON
        });
      }
      return;
    }
    if (pendingApprovals.has(event.requestId)) {
      throw new Error(
        `machine-runner: ${options.adapter.name} asked for approval '${event.requestId}' twice`
      );
    }
    const timer = setTimeout(() => {
      settle(event.requestId, approvalPolicy.onTimeout, APPROVAL_TIMEOUT_REASON);
    }, approvalPolicy.timeoutMs);
    pendingApprovals.set(event.requestId, timer);
    const request: ApprovalRequest = {
      requestId: event.requestId,
      tool: event.tool,
      input: event.input,
      ...(event.reason !== undefined ? { reason: event.reason } : {})
    };
    if (approvalListeners.length === 0) {
      // Nobody is carrying the question upstream, so nobody will ever answer
      // it: the old automatic denial, made explicit.
      settle(event.requestId, 'deny', APPROVAL_AUTO_DENY_REASON);
      return;
    }
    for (const listener of approvalListeners) listener(request);
  };
  const settleAll = (reason: string): void => {
    for (const requestId of [...pendingApprovals.keys()]) settle(requestId, 'deny', reason);
  };
  const parseLine = (line: string): void => {
    // Only the parse is guarded: a line that is not the adapter's protocol is
    // plain output. What a parsed event then does is not, so a fault there
    // (a duplicated approval id) is the process's error, not stray stdout.
    let events: AgentEvent[] | null;
    try {
      events = options.adapter.parseEvent(line);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      options.logger.warn(
        `machine-runner: ${options.adapter.name} emitted non-JSON stdout: ${message}`
      );
      emitData(`${line}\n`);
      return;
    }
    if (events) for (const event of events) emitEvent(event);
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
  const signalNumber = (signal: NodeJS.Signals | string | undefined): number | undefined => {
    if (!signal) return undefined;
    const value = os.constants.signals[signal as NodeJS.Signals];
    return value;
  };
  const start = (prompt: string): void => {
    const spawn = options.adapter.spawnArgs(prompt, options.resume);
    const spec = resolveSpawn(options.policy, spawn.command, spawn.args);
    child = spawnChild(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    child.stdout.setEncoding('utf8').on('data', (data: string) => {
      try {
        consumeStdout(data);
      } catch (err) {
        // The same door a spawn failure comes through: the session fails
        // visibly rather than the stream handler taking the runner down.
        for (const listener of errorListeners) listener(err instanceof Error ? err : new Error(String(err)));
      }
    });
    child.stderr.setEncoding('utf8').on('data', (data: string) => emitData(data));
    child.on('error', err => {
      for (const listener of errorListeners) listener(err);
    });
    child.on('exit', (code, signal) => {
      if (exited) return;
      exited = true;
      flushStdout();
      settleAll(APPROVAL_EXIT_REASON);
      for (const listener of exitListeners) {
        listener({ exitCode: code ?? -1, ...(signal ? { signal: signalNumber(signal) } : {}) });
      }
    });
    if (spawn.stdinPrompt !== undefined) child.stdin.write(spawn.stdinPrompt);
    if (!options.adapter.encodeTurn) {
      child.stdin.end();
      stdinEnded = true;
    }
  };

  return {
    write(data: string): void {
      const prompt = data.endsWith('\n') ? data.slice(0, -1) : data;
      if (firstWrite) {
        firstWrite = false;
        start(prompt);
        return;
      }
      if (options.adapter.encodeTurn && child && !stdinEnded) {
        child.stdin.write(options.adapter.encodeTurn(prompt));
        return;
      }
      if (!options.adapter.encodeTurn) {
        emitWarning(
          `${options.adapter.name} takes a single prompt; open a new session with cliSessionId to continue`
        );
      }
    },
    resolveApproval(requestId, decision, reason): boolean {
      return settle(requestId, decision, reason);
    },
    denyPendingApprovals(reason = APPROVAL_DISCONNECT_REASON): void {
      settleAll(reason);
    },
    onApprovalRequest(listener): void {
      approvalListeners.push(listener);
    },
    kill(signal): void {
      if (!child) {
        if (exited) return;
        exited = true;
        const number = signalNumber(signal ?? 'SIGTERM');
        for (const listener of exitListeners) {
          listener({ exitCode: -1, ...(number !== undefined ? { signal: number } : {}) });
        }
        return;
      }
      child.kill(signal);
    },
    onData(listener): void {
      dataListeners.push(listener);
    },
    onEvent(listener): void {
      eventListeners.push(listener);
    },
    onWarning(listener): void {
      warningListeners.push(listener);
    },
    onExit(listener): void {
      exitListeners.push(listener);
    },
    onError(listener): void {
      errorListeners.push(listener);
    }
  };
}
