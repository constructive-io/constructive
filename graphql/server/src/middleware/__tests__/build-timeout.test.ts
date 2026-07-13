import { BuildRefusedError, raceBuildAgainstTimeout } from '../graphile';

describe('BuildRefusedError', () => {
  it('carries the 503 mapping contract (code + name) and the pressure ratio', () => {
    const err = new BuildRefusedError(0.934);
    expect(err.code).toBe('SERVICE_OVERLOADED');
    expect(err.name).toBe('BuildRefusedError');
    expect(err.message).toContain('0.93');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('raceBuildAgainstTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the built value and disarms the timer when the build wins', async () => {
    const instance = { handler: 'built' };
    const result = await raceBuildAgainstTimeout(Promise.resolve(instance), 180_000);
    expect(result).toBe(instance);
    // The load-bearing assertion: an armed timer here retains the built instance
    // through the race reaction chain for the full timeout (the evict-churn OOM).
    expect(jest.getTimerCount()).toBe(0);
  });

  it('returns null when the wait expires, leaving no armed timer', async () => {
    const never = new Promise<never>(() => {});
    const race = raceBuildAgainstTimeout(never, 180_000);
    jest.advanceTimersByTime(180_000);
    await expect(race).resolves.toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('disarms the timer when the build rejects', async () => {
    const boom = new Error('build failed');
    await expect(raceBuildAgainstTimeout(Promise.reject(boom), 180_000)).rejects.toBe(boom);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('propagates a late build failure to no one after a timeout (no unhandled timer state)', async () => {
    let rejectBuild: (err: Error) => void;
    const build = new Promise<never>((_resolve, reject) => {
      rejectBuild = reject;
    });
    build.catch(() => { /* the dispatcher attaches its own handler; mirror that */ });
    const race = raceBuildAgainstTimeout(build, 1_000);
    jest.advanceTimersByTime(1_000);
    await expect(race).resolves.toBeNull();
    expect(jest.getTimerCount()).toBe(0);
    rejectBuild!(new Error('late failure'));
  });
});
