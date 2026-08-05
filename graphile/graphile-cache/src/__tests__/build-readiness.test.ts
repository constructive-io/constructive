import { awaitGraphileBuildReadiness } from '../build-readiness';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('awaitGraphileBuildReadiness', () => {
  it('does not resolve before the schema build completes', async () => {
    const schemaResult = deferred<unknown>();
    const release = jest.fn().mockResolvedValue(undefined);
    let resolved = false;
    const buildPromise = awaitGraphileBuildReadiness({
      schemaResult: schemaResult.promise,
      addTo: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
      release
    }).then(() => {
      resolved = true;
    });

    await flushPromises();
    expect(resolved).toBe(false);

    schemaResult.resolve({});
    await buildPromise;
    expect(release).not.toHaveBeenCalled();
  });

  it('releases the failed generation before rejecting', async () => {
    const schemaResult = deferred<unknown>();
    const release = jest.fn().mockResolvedValue(undefined);
    const buildPromise = awaitGraphileBuildReadiness({
      schemaResult: schemaResult.promise,
      addTo: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
      release
    });
    const failure = new Error('schema build failed');
    schemaResult.reject(failure);

    await expect(buildPromise).rejects.toBe(failure);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('preserves the build failure if cleanup also fails', async () => {
    const failure = new Error('schema build failed');
    const cleanupFailure = new Error('release failed');
    const onReleaseError = jest.fn();

    await expect(awaitGraphileBuildReadiness({
      schemaResult: Promise.reject(failure),
      addTo: jest.fn().mockResolvedValue(undefined),
      ready: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockRejectedValue(cleanupFailure),
      onReleaseError
    })).rejects.toBe(failure);
    expect(onReleaseError).toHaveBeenCalledWith(cleanupFailure);
  });
});
