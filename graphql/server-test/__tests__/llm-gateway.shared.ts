/**
 * The metered gateway a server-side model call goes through, for the
 * server-test suites: the real `agentic-server` with an in-memory sink in
 * place of its metering backend, in front of a local model server.
 */

import type { InferenceEntry } from 'agentic-server';
import { createAgenticServer } from 'agentic-server';
import http from 'http';
import type { AddressInfo } from 'net';

export type Listening = { url: string; close: () => Promise<void> };

export const listen = (server: http.Server): Promise<Listening> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });

export function startGateway(modelUrl: string, recorded: InferenceEntry[] = []): Promise<Listening> {
  const app = createAgenticServer({
    providerType: 'ollama',
    providerBaseUrl: modelUrl,
    inferenceSink: { logInference: (entry) => { recorded.push(entry); } }
  });
  return listen(http.createServer(app));
}
