import http from 'node:http';

import { fetchSchema } from '../../core/introspect/fetch-schema';

describe('fetchSchema cancellation', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it('destroys an in-flight request and rejects with the caller abort reason', async () => {
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    let requestClosed!: () => void;
    const closed = new Promise<void>((resolve) => {
      requestClosed = resolve;
    });

    server = http.createServer((request) => {
      requestStarted();
      request.once('close', requestClosed);
      // Deliberately leave the response open. Cancellation must close it.
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Fixture server did not expose a TCP port.');
    }

    const controller = new AbortController();
    const reason = new Error('caller cancelled introspection');
    reason.name = 'AbortError';
    const pending = fetchSchema({
      endpoint: `http://127.0.0.1:${address.port}/graphql`,
      signal: controller.signal,
      timeout: 10_000,
    });

    await started;
    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
    await closed;
  });

  it('rejects a pre-aborted request without opening a connection', async () => {
    const controller = new AbortController();
    const reason = new Error('already cancelled');
    reason.name = 'AbortError';
    controller.abort(reason);

    await expect(
      fetchSchema({
        endpoint: 'http://127.0.0.1:1/graphql',
        signal: controller.signal,
      })
    ).rejects.toBe(reason);
  });
});
