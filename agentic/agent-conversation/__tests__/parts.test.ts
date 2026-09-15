import {
  advanceToolPart,
  completeToolPart,
  denyToolPart,
  failToolPart,
  InvalidToolPartTransitionError,
  requestApproval,
  respondToApproval,
  toolPart
} from '../src/parts';

const call = () =>
  toolPart({ toolName: 'apply_migration', toolCallId: 'call-1', input: { sql: 'select 1' } });

describe('ToolPart state machine', () => {
  it('walks the approval path', () => {
    const requested = requestApproval(call(), 'approval-1');
    expect(requested).toMatchObject({
      type: 'tool-apply_migration',
      state: 'approval-requested',
      approval: { id: 'approval-1' },
    });

    const responded = respondToApproval(requested, { approved: true, reason: 'looks right' });
    expect(responded).toMatchObject({
      state: 'approval-responded',
      approval: { id: 'approval-1', approved: true, reason: 'looks right' },
    });

    expect(completeToolPart(responded, 'ok').state).toBe('output-available');
  });

  it('denies and fails from the states that allow it', () => {
    expect(denyToolPart(requestApproval(call(), 'a'), 'no').state).toBe('output-denied');
    expect(failToolPart(call(), 'boom')).toMatchObject({ state: 'output-error', output: 'boom' });
  });

  it('refuses an illegal transition rather than writing an uninterpretable row', () => {
    expect(() => completeToolPart(requestApproval(call(), 'a'), 'ok')).toThrow(
      InvalidToolPartTransitionError
    );
    expect(() => advanceToolPart(completeToolPart(call(), 'ok'), { state: 'output-error' })).toThrow(
      /terminal/
    );
  });

  it('refuses to respond to an approval that was never requested', () => {
    expect(() => respondToApproval(call(), { approved: true })).toThrow(/no approval was requested/);
  });

  it('streams input before it is available', () => {
    const streaming = toolPart({
      toolName: 'write',
      toolCallId: 'c',
      input: {},
      state: 'input-streaming',
    });
    expect(advanceToolPart(streaming, { state: 'input-available' }).state).toBe('input-available');
    expect(() => advanceToolPart(streaming, { state: 'approval-requested' })).toThrow(
      InvalidToolPartTransitionError
    );
  });
});
