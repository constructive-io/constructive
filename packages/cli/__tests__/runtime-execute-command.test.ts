import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  bindArguments,
  createCommandRegistry,
  executeCommand,
} from '@constructive-io/cli-runtime';

import {
  ConfigStore,
  createContext,
  setContextCredentials,
  setCurrentContext,
} from '../src/config';
import { createExecuteCommandDefinition } from '../src/runtime/execute-command';

const NOW = new Date('2026-07-20T00:00:00.000Z');
const STORED_TOKEN = 'stored-secret-token';
const REAL_TMP_DIR = fs.realpathSync(os.tmpdir());

const response = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('raw GraphQL execute command definition', () => {
  let cwd: string;
  let configDir: string;
  let store: ConfigStore;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-execute-cwd-'));
    configDir = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-execute-state-'));
    store = new ConfigStore({ configDir });
    createContext('api', 'https://api.example.com/graphql', store, NOW);
    setCurrentContext('api', store);
    setContextCredentials('api', STORED_TOKEN, undefined, store);
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  it('resolves files and JSON variables from the operation cwd', async () => {
    fs.mkdirSync(path.join(cwd, 'queries'));
    fs.writeFileSync(
      path.join(cwd, 'queries', 'viewer.graphql'),
      'query Viewer($id: ID!) { viewer(id: $id) { id } }'
    );
    const fetchMock = jest.fn(async () =>
      response({ data: { viewer: { id: 'viewer-1' } } })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);
    const bound = bindArguments(
      command,
      {
        argv: [
          '--file',
          'queries/viewer.graphql',
          '--variables',
          '{"id":"viewer-1"}',
          '--context',
          'api',
          '--timeout-ms',
          '1000',
        ],
      },
      registry
    );

    const outcome = await executeCommand(registry, command, bound.input, {
      cwd,
      mode: 'agent',
      env: {},
      now: () => NOW,
    });
    expect(outcome).toMatchObject({
      status: 'completed',
      result: {
        data: {
          contextName: 'api',
          operation: { type: 'query', name: 'Viewer' },
          data: { viewer: { id: 'viewer-1' } },
        },
      },
    });
    const request = (fetchMock as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(request.headers).toHaveProperty(
      'Authorization',
      `Bearer ${STORED_TOKEN}`
    );
    expect(JSON.parse(request.body as string)).toMatchObject({
      operationName: 'Viewer',
      variables: { id: 'viewer-1' },
    });
    expect(JSON.stringify(outcome)).not.toContain(STORED_TOKEN);
  });

  it('does not fall back to global current context outside human mode', async () => {
    const fetchMock = jest.fn(async () =>
      response({ data: { ok: true } })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);

    const agent = await executeCommand(
      registry,
      command,
      { query: 'query Check { ok }' },
      { cwd, mode: 'agent', env: {}, now: () => NOW }
    );
    expect(agent).toMatchObject({
      status: 'failed',
      error: { code: 'CONTEXT_REQUIRED' },
    });

    const human = await executeCommand(
      registry,
      command,
      { query: 'query Check { ok }' },
      { cwd, mode: 'human', env: {}, now: () => NOW }
    );
    expect(human.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires allow-mutation and confirmation before agent or CI mutations', async () => {
    const fetchMock = jest.fn(async () =>
      response({ data: { change: true } })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);
    const input = {
      query: 'mutation Change { change }',
      contextName: 'api',
    };

    const noFlag = await executeCommand(registry, command, input, {
      cwd,
      mode: 'agent',
      env: {},
      now: () => NOW,
      capabilities: { yes: true },
    });
    expect(noFlag).toMatchObject({
      status: 'failed',
      error: { code: 'GRAPHQL_MUTATION_REQUIRES_APPROVAL' },
    });

    const noConfirmation = await executeCommand(
      registry,
      command,
      { ...input, allowMutation: true },
      { cwd, mode: 'ci', env: {}, now: () => NOW }
    );
    expect(noConfirmation).toMatchObject({
      status: 'failed',
      error: { code: 'GRAPHQL_MUTATION_REQUIRES_APPROVAL' },
    });

    const allowed = await executeCommand(
      registry,
      command,
      { ...input, allowMutation: true },
      {
        cwd,
        mode: 'agent',
        env: {},
        now: () => NOW,
        capabilities: { yes: true },
      }
    );
    expect(allowed.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('supports explicit anonymous execution without sending credentials', async () => {
    const fetchMock = jest.fn(async () =>
      response({ data: { health: true } })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);
    const outcome = await executeCommand(
      registry,
      command,
      { query: 'query Health { health }', anonymous: true },
      {
        cwd,
        mode: 'agent',
        env: { CNC_CONTEXT: 'api' },
        now: () => NOW,
      }
    );
    expect(outcome).toMatchObject({
      status: 'completed',
      result: { data: { anonymous: true } },
    });
    const request = (fetchMock as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(request.headers).not.toHaveProperty('Authorization');
  });

  it('returns typed failures with redacted partial data and safe GraphQL errors', async () => {
    const responseSecret = 'response-secret-token';
    const extensionSecret = 'extension-secret-token';
    const fetchMock = jest.fn(async () =>
      response({
        data: { viewer: { id: 'viewer-1', token: responseSecret } },
        errors: [
          {
            message: 'Viewer name is unavailable.',
            path: ['viewer', 'name'],
            extensions: { token: extensionSecret },
          },
        ],
      })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);

    const outcome = await executeCommand(
      registry,
      command,
      { query: 'query Viewer { viewer { id token } }', contextName: 'api' },
      { cwd, mode: 'agent', env: {}, now: () => NOW }
    );
    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'GRAPHQL_RESPONSE_ERROR',
        details: {
          partialData: {
            viewer: { id: 'viewer-1', token: '[REDACTED]' },
          },
          graphqlErrors: [
            {
              message: 'Viewer name is unavailable.',
              path: ['viewer', 'name'],
            },
          ],
        },
      },
    });
    const serialized = JSON.stringify(outcome);
    expect(serialized).not.toContain(STORED_TOKEN);
    expect(serialized).not.toContain(responseSecret);
    expect(serialized).not.toContain(extensionSecret);
  });

  it('redacts stored credentials echoed by an upstream GraphQL error', async () => {
    const fetchMock = jest.fn(async () =>
      response({
        data: { echoed: `Bearer ${STORED_TOKEN}` },
        errors: [{ message: `Rejected Bearer ${STORED_TOKEN}` }],
      })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);

    const outcome = await executeCommand(
      registry,
      command,
      { query: 'query Echo { echoed }', contextName: 'api' },
      { cwd, mode: 'agent', env: {}, now: () => NOW }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'GRAPHQL_RESPONSE_ERROR',
        details: {
          partialData: { echoed: 'Bearer [REDACTED]' },
          graphqlErrors: [{ message: 'Rejected Bearer [REDACTED]' }],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toContain(STORED_TOKEN);
  });

  it('redacts nested sensitive GraphQL variable values echoed by an upstream error', async () => {
    const password = 'nested-password-that-must-not-leak';
    const apiKey = 'nested-api-key-that-must-not-leak';
    const fetchMock = jest.fn(async () =>
      response({
        data: { echoed: `Rejected ${password} and ${apiKey}` },
        errors: [
          {
            message: `Password ${password} and API key ${apiKey} were rejected.`,
          },
        ],
      })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);
    const variables = {
      input: {
        account: { password },
        integrations: [{ apiKey }],
      },
    };

    const outcome = await executeCommand(
      registry,
      command,
      {
        query: 'query Probe($input: JSON) { probe(input: $input) }',
        variables,
        contextName: 'api',
        anonymous: true,
      },
      { cwd, mode: 'agent', env: {}, now: () => NOW }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'GRAPHQL_RESPONSE_ERROR',
        details: {
          partialData: {
            echoed: 'Rejected [REDACTED] and [REDACTED]',
          },
          graphqlErrors: [
            {
              message:
                'Password [REDACTED] and API key [REDACTED] were rejected.',
            },
          ],
        },
      },
    });
    expect(JSON.stringify(outcome)).not.toContain(password);
    expect(JSON.stringify(outcome)).not.toContain(apiKey);
    expect(
      JSON.parse((fetchMock as jest.Mock).mock.calls[0][1].body)
    ).toMatchObject({ variables });
  });

  it('maps an aborted request to protocol cancellation', async () => {
    const fetchMock = jest.fn(
      async (_input: URL | RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(init.signal.reason);
            return;
          }
          init?.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    ) as unknown as typeof fetch;
    const command = createExecuteCommandDefinition({ store, fetch: fetchMock });
    const registry = createCommandRegistry([command]);
    const controller = new AbortController();
    const pending = executeCommand(
      registry,
      command,
      { query: 'query Viewer { viewer { id } }', contextName: 'api' },
      {
        cwd,
        mode: 'agent',
        env: {},
        signal: controller.signal,
        now: () => NOW,
      }
    );

    await Promise.resolve();
    controller.abort(new DOMException('Test cancellation.', 'AbortError'));

    await expect(pending).resolves.toMatchObject({
      status: 'cancelled',
      error: { code: 'OPERATION_CANCELLED' },
    });
  });

  it('rejects traversal and symlink escapes from the operation cwd', async () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cnc-execute-outside-')
    );
    const outsideFile = path.join(outside, 'outside.graphql');
    fs.writeFileSync(outsideFile, 'query Outside { outside }');
    fs.symlinkSync(outsideFile, path.join(cwd, 'linked.graphql'));
    const command = createExecuteCommandDefinition({ store });
    const registry = createCommandRegistry([command]);

    for (const file of ['../outside.graphql', 'linked.graphql']) {
      const outcome = await executeCommand(
        registry,
        command,
        { file, contextName: 'api' },
        { cwd, mode: 'agent', env: {}, now: () => NOW }
      );
      expect(outcome).toMatchObject({
        status: 'failed',
        error: { code: 'GRAPHQL_FILE_OUTSIDE_CWD' },
      });
    }
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
