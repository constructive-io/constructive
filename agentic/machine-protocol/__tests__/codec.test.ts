import { agentBinding, assertAgentEvent, decodeFrame, encodeFrame, Frame, isAgentEventLike, OpenFrame } from '../src';

describe('machine-protocol codec', () => {
  it('round-trips every frame type', () => {
    const frames: Frame[] = [
      { type: 'open', sessionId: 's1', command: 'echo', args: ['hello'], cols: 80, rows: 24 },
      {
        type: 'open',
        sessionId: 's1',
        command: 'claude',
        runId: 'run-1',
        agentMode: 'cli',
        cliSessionId: 'claude-abc'
      },
      { type: 'open', sessionId: 's1', command: 'agent', runId: 'run-1', agentMode: 'embedded' },
      { type: 'error', sessionId: 's1', message: 'refused', code: 'SESSION_REFUSED' },
      { type: 'input', sessionId: 's1', data: 'ls\n' },
      { type: 'resize', sessionId: 's1', cols: 120, rows: 40 },
      { type: 'signal', sessionId: 's1', signal: 'SIGINT' },
      { type: 'detach', sessionId: 's1' },
      { type: 'reattach', sessionId: 's1', cols: 100, rows: 30 },
      { type: 'reattach', sessionId: 's1' },
      { type: 'close', sessionId: 's1' },
      { type: 'scrollback', sessionId: 's1', data: '\u001b[2J$ ', truncated: true },
      { type: 'detached', sessionId: 's1' },
      {
        type: 'reattached',
        sessionId: 's1',
        state: 'running',
        cols: 100,
        rows: 30,
        lastSeq: '7',
        interactive: true
      },
      { type: 'output', sessionId: 's1', data: 'hello\r\n' },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: { kind: 'session', cliSessionId: 'cli-1' }
      },
      { type: 'agent_event', sessionId: 's1', event: { kind: 'text', text: 'hello' } },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: { kind: 'tool_call', id: 'call-1', name: 'Bash', input: { command: 'pwd' } }
      },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: { kind: 'tool_result', id: 'call-1', output: 'ok', isError: false }
      },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: {
          kind: 'approval_requested',
          requestId: 'request-1',
          tool: 'Bash',
          input: { command: 'pwd' },
          reason: 'needs approval'
        }
      },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: {
          kind: 'approval_resolved',
          requestId: 'request-1',
          decision: 'deny',
          reason: 'denied'
        }
      },
      {
        type: 'agent_event',
        sessionId: 's1',
        event: { kind: 'result', ok: true, summary: 'done', usage: { input: 1 }, costUsd: 0.1 }
      },
      {
        type: 'approval_request',
        sessionId: 's1',
        requestId: 'request-1',
        tool: 'Bash',
        input: { command: 'rm -rf build' },
        reason: 'destructive'
      },
      { type: 'approval_request', sessionId: 's1', requestId: 'request-2', tool: 'Edit', input: null },
      { type: 'approval_decision', sessionId: 's1', requestId: 'request-1', decision: 'allow' },
      {
        type: 'approval_decision',
        sessionId: 's1',
        requestId: 'request-2',
        decision: 'deny',
        reason: 'not now'
      },
      {
        type: 'open',
        sessionId: 's1',
        command: 'constructive-agent-host',
        args: ['--harness', 'pi'],
        runId: 'run-1',
        agentMode: 'embedded',
        cwd: 'repo'
      },
      { type: 'exit', sessionId: 's1', exitCode: 0 },
      { type: 'error', sessionId: 's1', message: 'boom' },
      { type: 'error', message: 'runner disconnected' },
      { type: 'attached', machineId: 'm1' }
    ];
    for (const frame of frames) {
      expect(decodeFrame(encodeFrame(frame))).toEqual(frame);
    }
  });

  it('throws on non-JSON input', () => {
    expect(() => decodeFrame('not json')).toThrow(/not JSON/);
  });

  it('throws on non-object frames', () => {
    expect(() => decodeFrame('[1,2]')).toThrow(/not an object/);
    expect(() => decodeFrame('"open"')).toThrow(/not an object/);
  });

  it('throws on unknown frame types', () => {
    expect(() => decodeFrame(JSON.stringify({ type: 'nope' }))).toThrow(/unknown frame type/);
  });

  it('throws on session frames without a sessionId', () => {
    expect(() => decodeFrame(JSON.stringify({ type: 'input', data: 'x' }))).toThrow(
      /missing sessionId/
    );
  });

  it('throws on frames missing required fields', () => {
    expect(() => decodeFrame(JSON.stringify({ type: 'open', sessionId: 's' }))).toThrow(
      /missing command/
    );
    expect(() => decodeFrame(JSON.stringify({ type: 'exit', sessionId: 's' }))).toThrow(
      /missing exitCode/
    );
    expect(() => decodeFrame(JSON.stringify({ type: 'resize', sessionId: 's' }))).toThrow(
      /needs integer cols\/rows/
    );
    expect(() => decodeFrame(JSON.stringify({ type: 'error' }))).toThrow(/missing message/);
    expect(() => decodeFrame(JSON.stringify({ type: 'attached' }))).toThrow(/missing machineId/);
    expect(() => decodeFrame(JSON.stringify({ type: 'scrollback', sessionId: 's' }))).toThrow(
      /missing data\/truncated/
    );
    expect(() =>
      decodeFrame(JSON.stringify({ type: 'reattached', sessionId: 's', state: 'running' }))
    ).toThrow(/missing state\/lastSeq/);
  });

  it('validates agent event frames', () => {
    expect(() =>
      decodeFrame(JSON.stringify({ type: 'agent_event', sessionId: 's' }))
    ).toThrow(/missing event/);
    expect(() =>
      decodeFrame(
        JSON.stringify({ type: 'agent_event', sessionId: 's', event: { kind: 'unknown' } })
      )
    ).toThrow(/unknown event kind/);
    expect(() =>
      decodeFrame(
        JSON.stringify({
          type: 'agent_event',
          sessionId: 's',
          event: { kind: 'tool_call', id: 1, name: 'Bash', input: {} }
        })
      )
    ).toThrow(/missing id/);
    expect(() =>
      decodeFrame(
        JSON.stringify({
          type: 'agent_event',
          sessionId: 's',
          event: { kind: 'approval_resolved', requestId: 'r', decision: 'maybe' }
        })
      )
    ).toThrow(/invalid decision/);
    expect(() =>
      decodeFrame(
        JSON.stringify({
          type: 'agent_event',
          sessionId: 's',
          event: { kind: 'result', ok: 'true' }
        })
      )
    ).toThrow(/missing ok/);
  });

  it('validates approval frames', () => {
    const request = { type: 'approval_request', sessionId: 's', requestId: 'r', tool: 'Bash', input: {} };
    expect(() => decodeFrame(JSON.stringify({ ...request, requestId: undefined }))).toThrow(
      /missing requestId/
    );
    expect(() => decodeFrame(JSON.stringify({ ...request, requestId: '' }))).toThrow(/missing requestId/);
    expect(() => decodeFrame(JSON.stringify({ ...request, tool: undefined }))).toThrow(/missing tool/);
    expect(() => decodeFrame(JSON.stringify({ ...request, reason: 7 }))).toThrow(
      /reason must be a string/
    );
    expect(() => decodeFrame(JSON.stringify({ ...request, sessionId: undefined }))).toThrow(
      /missing sessionId/
    );

    const decision = { type: 'approval_decision', sessionId: 's', requestId: 'r', decision: 'allow' };
    expect(() => decodeFrame(JSON.stringify({ ...decision, requestId: undefined }))).toThrow(
      /missing requestId/
    );
    expect(() => decodeFrame(JSON.stringify({ ...decision, decision: 'maybe' }))).toThrow(
      /invalid decision/
    );
    expect(() => decodeFrame(JSON.stringify({ ...decision, decision: undefined }))).toThrow(
      /invalid decision/
    );
    expect(() => decodeFrame(JSON.stringify({ ...decision, reason: {} }))).toThrow(
      /reason must be a string/
    );
  });

  // A headless agent process prints events one per line; the runner relaying
  // it tells an event line from any other by the same rule the codec applies
  // to an `agent_event` frame, and a line that claims to be one but is not is
  // a protocol fault, not output.
  it('tells an agent event line from output and checks its shape', () => {
    expect(isAgentEventLike({ kind: 'text', text: 'hi' })).toBe(true);
    expect(isAgentEventLike({ kind: 'nope' })).toBe(false);
    expect(isAgentEventLike({ type: 'message' })).toBe(false);
    expect(isAgentEventLike('text')).toBe(false);
    expect(assertAgentEvent({ kind: 'result', ok: true }, 'stdout line')).toEqual({ kind: 'result', ok: true });
    expect(() => assertAgentEvent({ kind: 'tool_call', id: 'x' }, 'stdout line')).toThrow(
      /stdout line tool_call event is missing name/
    );
    expect(() => assertAgentEvent(null)).toThrow(/'agent_event' frame is missing event/);
  });

  it('validates the open frame cwd', () => {
    const open = { type: 'open', sessionId: 's', command: 'constructive-agent-host' };
    expect(() => decodeFrame(JSON.stringify({ ...open, cwd: '' }))).toThrow(/cwd/);
    expect(() => decodeFrame(JSON.stringify({ ...open, cwd: 3 }))).toThrow(/cwd/);
  });

  // Geometry ends up in ioctl(TIOCSWINSZ) on the user's machine, so a client is
  // not trusted to send something a pty would choke on — and it is refused
  // rather than clamped, because a clamped resize is a lie about what the
  // program is being drawn at.
  it('refuses terminal geometry a pty would not accept', () => {
    const bad = [
      { cols: 0, rows: 24 },
      { cols: 80, rows: -1 },
      { cols: 80.5, rows: 24 },
      { cols: 80, rows: 100_000 },
      { cols: '80', rows: '24' }
    ];
    for (const geometry of bad) {
      expect(() =>
        decodeFrame(JSON.stringify({ type: 'resize', sessionId: 's', ...geometry }))
      ).toThrow(/needs integer cols\/rows/);
      expect(() =>
        decodeFrame(JSON.stringify({ type: 'reattach', sessionId: 's', ...geometry }))
      ).toThrow(/needs integer cols\/rows/);
    }
  });

  // The binding is checked the way the tenant's own constraint checks it, so a
  // frame SQL would refuse never gets as far as being asked.
  describe('agent-run binding on open', () => {
    const open = (extra: Record<string, unknown>): OpenFrame =>
      decodeFrame(
        JSON.stringify({ type: 'open', sessionId: 's', command: 'agent', ...extra })
      ) as OpenFrame;

    it('accepts a plain open with no binding at all', () => {
      const frame = open({});
      expect(agentBinding(frame)).toBeNull();
      expect(agentBinding(open({ interactive: true }))).toBeNull();
    });

    it('accepts cli and embedded bindings, with a cli session id only for cli', () => {
      expect(agentBinding(open({ runId: 'r', agentMode: 'cli' }))).toEqual({
        runId: 'r',
        agentMode: 'cli'
      });
      expect(agentBinding(open({ runId: 'r', agentMode: 'cli', cliSessionId: 'c' }))).toEqual({
        runId: 'r',
        agentMode: 'cli',
        cliSessionId: 'c'
      });
      expect(agentBinding(open({ runId: 'r', agentMode: 'embedded' }))).toEqual({
        runId: 'r',
        agentMode: 'embedded'
      });
      expect(agentBinding(open({ runId: 'r', agentMode: 'embedded', interactive: false }))).toEqual(
        { runId: 'r', agentMode: 'embedded' }
      );
    });

    it('refuses agentMode without runId, and runId without agentMode', () => {
      expect(() => open({ agentMode: 'cli' })).toThrow(/both runId and agentMode/);
      expect(() => open({ runId: 'r' })).toThrow(/both runId and agentMode/);
    });

    it('refuses a mode the constraint does not know', () => {
      expect(() => open({ runId: 'r', agentMode: 'tui' })).toThrow(/agentMode must be one of/);
      expect(() => open({ runId: 'r', agentMode: 1 })).toThrow(/agentMode must be one of/);
    });

    it('refuses a cli session id outside cli mode', () => {
      expect(() => open({ runId: 'r', agentMode: 'embedded', cliSessionId: 'c' })).toThrow(
        /cliSessionId requires agentMode 'cli'/
      );
      expect(() => open({ cliSessionId: 'c' })).toThrow(/cliSessionId requires agentMode 'cli'/);
    });

    it('refuses an interactive bound session: bound sessions are headless', () => {
      expect(() => open({ runId: 'r', agentMode: 'cli', interactive: true })).toThrow(
        /bound to a run cannot be interactive/
      );
    });

    it('refuses malformed binding values', () => {
      expect(() => open({ runId: '', agentMode: 'cli' })).toThrow(/runId must be a non-empty/);
      expect(() => open({ runId: 7, agentMode: 'cli' })).toThrow(/runId must be a non-empty/);
      expect(() => open({ runId: 'r', agentMode: 'cli', cliSessionId: '' })).toThrow(
        /cliSessionId must be a non-empty/
      );
    });
  });

  it('refuses a signal it does not know', () => {
    expect(() =>
      decodeFrame(JSON.stringify({ type: 'signal', sessionId: 's', signal: 'SIGSTEAL' }))
    ).toThrow(/unknown signal/);
  });
});
