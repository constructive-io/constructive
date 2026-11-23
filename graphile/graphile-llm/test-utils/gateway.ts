/**
 * The metered gateway graphile-llm's model calls go through, for this
 * package's tests: the real `agentic-server` with an in-memory sink in front
 * of a local Ollama. Starting it points `AGENTIC_SERVER_URL` at it; closing
 * it restores the variable.
 */

import type { InferenceEntry } from 'agentic-server';
import { createAgenticServer } from 'agentic-server';
import http from 'http';
import type { AddressInfo } from 'net';

import { llmConfigStore } from '../src/embedder';

export const OLLAMA_URL = 'http://localhost:11434';
export const EMBED_MODEL = 'nomic-embed-text';

/** The database the tests' requests belong to; what `identityFromClaims` reads. */
export const TEST_DATABASE_ID = '00000000-0000-4000-8000-0000000000d0';
export const TEST_CLAIMS = { 'jwt.claims.database_id': TEST_DATABASE_ID };

export interface TestGateway {
  url: string;
  recorded: InferenceEntry[];
  close: () => Promise<void>;
}

export function startGateway(upstreamUrl: string = OLLAMA_URL): Promise<TestGateway> {
  const recorded: InferenceEntry[] = [];
  const app = createAgenticServer({
    providerType: 'ollama',
    providerBaseUrl: upstreamUrl,
    inferenceSink: { logInference: (entry) => { recorded.push(entry); } }
  });
  const server = http.createServer(app);
  const previous = process.env.AGENTIC_SERVER_URL;
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${port}`;
      process.env.AGENTIC_SERVER_URL = url;
      resolve({
        url,
        recorded,
        close: () =>
          new Promise((done) =>
            server.close(() => {
              if (previous === undefined) delete process.env.AGENTIC_SERVER_URL;
              else process.env.AGENTIC_SERVER_URL = previous;
              done();
            })
          )
      });
    });
  });
}

/** A model call made outside a GraphQL request, under the test database's identity. */
export const asTestRequest = <T>(fn: () => Promise<T>): Promise<T> =>
  llmConfigStore.run({ identity: { databaseId: TEST_DATABASE_ID } }, fn);

export async function ensureModel(name: string = EMBED_MODEL): Promise<void> {
  const tags = (await (await fetch(`${OLLAMA_URL}/api/tags`)).json()) as { models?: Array<{ name: string }> };
  if (tags.models?.some((m) => m.name.includes(name))) return;
  console.log(`Pulling ${name} model...`);
  const res = await fetch(`${OLLAMA_URL}/api/pull`, {
    method: 'POST',
    body: JSON.stringify({ name, stream: false })
  });
  if (!res.ok) throw new Error(`ollama pull ${name} failed: ${res.status}`);
}
