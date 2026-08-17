import { type ApprovalOutcome, type ApprovalRequest, pollingApprovalChannel, staticApprovalChannel } from '../src';

const request: ApprovalRequest = {
  runId: 'run-1',
  toolCallId: 'call-1',
  toolName: 'bash',
  input: { command: 'rm -rf build' },
  reason: 'destructive command',
  requestedAt: '2026-01-01T00:00:00.000Z'
};

describe('pollingApprovalChannel', () => {
  it('submits once, then polls until a decision exists', async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    const outcome: ApprovalOutcome = { decision: 'allow', actorId: 'user-1' };
    const poll = jest
      .fn<Promise<ApprovalOutcome | undefined>, [ApprovalRequest]>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(outcome);

    const channel = pollingApprovalChannel({ submit, poll, sleep: () => Promise.resolve() });

    await expect(channel.request(request)).resolves.toEqual(outcome);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(request);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it('waits between polls at the configured interval', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const channel = pollingApprovalChannel({
      submit: () => Promise.resolve(),
      poll: jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({ decision: 'deny' }),
      intervalMs: 250,
      sleep
    });

    await channel.request(request);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it('denies on timeout, because an unattended run must not act unapproved', async () => {
    let clock = 0;
    const channel = pollingApprovalChannel({
      submit: () => Promise.resolve(),
      poll: () => Promise.resolve(undefined),
      timeoutMs: 500,
      intervalMs: 100,
      sleep: () => {
        clock += 100;
        return Promise.resolve();
      },
      now: () => clock
    });

    await expect(channel.request(request)).resolves.toEqual({
      decision: 'deny',
      reason: 'gate: no decision within 500ms'
    });
  });

  it('can be configured to allow on timeout instead', async () => {
    let clock = 0;
    const channel = pollingApprovalChannel({
      submit: () => Promise.resolve(),
      poll: () => Promise.resolve(undefined),
      timeoutMs: 100,
      onTimeout: 'allow',
      sleep: () => {
        clock += 100;
        return Promise.resolve();
      },
      now: () => clock
    });

    await expect(channel.request(request)).resolves.toMatchObject({ decision: 'allow' });
  });

  it('propagates a submit failure instead of silently waiting forever', async () => {
    const channel = pollingApprovalChannel({
      submit: () => Promise.reject(new Error('api down')),
      poll: jest.fn(),
      sleep: () => Promise.resolve()
    });

    await expect(channel.request(request)).rejects.toThrow('api down');
  });
});

describe('staticApprovalChannel', () => {
  it('decides every request the same way', async () => {
    const channel = staticApprovalChannel({ decision: 'allow', reason: 'auto-approved run' });
    await expect(channel.request(request)).resolves.toEqual({ decision: 'allow', reason: 'auto-approved run' });
  });
});
