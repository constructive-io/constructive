import { createPresetServicesReleaser } from '../preset-services';

describe('preset service ownership', () => {
  it('releases services in reverse order exactly once under concurrent teardown', async () => {
    const events: string[] = [];
    const first = { release: jest.fn(async () => { events.push('first'); }) };
    const second = { release: jest.fn(async () => { events.push('second'); }) };
    const release = createPresetServicesReleaser({
      pgServices: [first, second, first]
    });

    await Promise.all([release(), release(), release()]);

    expect(events).toEqual(['second', 'first']);
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(second.release).toHaveBeenCalledTimes(1);
  });

  it('continues releasing services and preserves the first cleanup error', async () => {
    const firstFailure = new Error('second failed');
    const first = { release: jest.fn(async (): Promise<void> => undefined) };
    const second = { release: jest.fn(async () => { throw firstFailure; }) };
    const release = createPresetServicesReleaser({ pgServices: [first, second] });

    await expect(release()).rejects.toBe(firstFailure);
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(second.release).toHaveBeenCalledTimes(1);
  });
});
