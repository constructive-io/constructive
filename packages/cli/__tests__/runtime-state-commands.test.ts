import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  bindArguments,
  createCommandRegistry,
  executeCommand,
  type ExecutionMode,
} from '@constructive-io/cli-runtime';

import {
  ConfigStore,
  createContext,
  setContextCredentials,
  setCurrentContext,
} from '../src/config';
import { createCncRegistry } from '../src/runtime/registry';
import {
  createStateCommands,
  type StateCommandDependencies,
} from '../src/runtime/state-commands';

const NOW = new Date('2026-07-20T00:00:00.000Z');
const SECRET = 'secret-token-material';
const REAL_TMP_DIR = fs.realpathSync(os.tmpdir());

describe('context and auth command definitions', () => {
  let cwd: string;
  let configDir: string;
  let store: ConfigStore;
  let commands: ReturnType<typeof createStateCommands>;
  let registry: ReturnType<typeof createCommandRegistry>;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-runtime-cwd-'));
    configDir = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-runtime-state-'));
    store = new ConfigStore({ configDir });
    const dependencies: StateCommandDependencies = { store };
    commands = createStateCommands(dependencies);
    registry = createCommandRegistry(commands);
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  const run = (
    commandId: string,
    input: unknown,
    options: {
      mode?: ExecutionMode;
      env?: Readonly<Record<string, string | undefined>>;
      yes?: boolean;
    } = {}
  ) =>
    executeCommand(registry, commandId, input, {
      cwd,
      mode: options.mode ?? 'agent',
      env: options.env ?? {},
      now: () => NOW,
      capabilities: { yes: options.yes ?? false },
    });

  it('registers every existing context and authentication subcommand', () => {
    expect(
      registry
        .catalog()
        .map(({ id }) => id)
        .sort()
    ).toEqual([
      'auth.logout',
      'auth.set-token',
      'auth.status',
      'context.create',
      'context.current',
      'context.delete',
      'context.list',
      'context.use',
    ]);
  });

  it('creates, selects, summarizes, and atomically deletes contexts', async () => {
    const created = await run('context.create', {
      name: 'production',
      endpoint: 'https://api.example.com/graphql',
    });
    expect(created).toMatchObject({
      status: 'completed',
      result: {
        data: {
          activated: true,
          context: { name: 'production' },
        },
      },
    });

    setContextCredentials('production', SECRET, undefined, store);
    const listed = await run('context.list', {});
    expect(listed).toMatchObject({
      status: 'completed',
      result: {
        data: {
          contexts: [
            {
              name: 'production',
              current: true,
              authentication: 'authenticated',
            },
          ],
        },
      },
    });

    const refused = await run('context.delete', { name: 'production' });
    expect(refused).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_CONFIRMATION_REQUIRED' },
    });

    const deleted = await run(
      'context.delete',
      { name: 'production' },
      { yes: true }
    );
    expect(deleted.status).toBe('completed');
    expect(store.read()).toMatchObject({
      settings: {},
      contexts: {},
      credentials: { tokens: {} },
    });
  });

  it('rejects secret-bearing endpoint queries without persisting or returning them', async () => {
    const endpointSecret = 'endpoint-secret-that-must-not-leak';
    const rejected = await run('context.create', {
      name: 'unsafe',
      endpoint: `https://api.example.com/graphql?api_key=${endpointSecret}`,
    });

    expect(rejected).toMatchObject({
      status: 'failed',
      error: {
        code: 'CONTEXT_ENDPOINT_INVALID',
        category: 'validation',
      },
    });
    expect(JSON.stringify(rejected)).not.toContain(endpointSecret);
    expect(store.read().contexts).toEqual({});
    expect(fs.existsSync(store.statePath)).toBe(false);
  });

  it('requires explicit agent targeting and never returns token representations', async () => {
    createContext('production', 'https://api.example.com/graphql', store, NOW);
    setCurrentContext('production', store);

    const command = registry.requireById('auth.set-token');
    const bound = bindArguments(
      command,
      {
        argv: ['--context', 'production'],
        env: { CNC_TOKEN: SECRET },
      },
      registry
    );
    const saved = await run('auth.set-token', bound.input, {
      env: { CNC_TOKEN: SECRET },
    });
    expect(saved).toMatchObject({
      status: 'completed',
      result: {
        data: { contextName: 'production', saved: true },
      },
    });

    const missingTarget = await run('auth.status', {});
    expect(missingTarget).toMatchObject({
      status: 'failed',
      error: { code: 'CONTEXT_REQUIRED' },
    });

    const status = await run(
      'auth.status',
      {},
      { env: { CNC_CONTEXT: 'production' } }
    );
    expect(status).toMatchObject({
      status: 'completed',
      result: {
        data: {
          contexts: [
            {
              contextName: 'production',
              status: 'authenticated',
            },
          ],
        },
      },
    });
    const machineTranscript = JSON.stringify({ saved, status });
    expect(machineTranscript).not.toContain(SECRET);
    expect(machineTranscript).not.toContain('****');
  });

  it('rejects positional agent tokens but retains a warned human compatibility path', async () => {
    createContext('production', 'https://api.example.com/graphql', store, NOW);
    setCurrentContext('production', store);

    const rejected = await run('auth.set-token', {
      contextName: 'production',
      legacyValue: SECRET,
    });
    expect(rejected).toMatchObject({
      status: 'failed',
      error: { code: 'AUTH_POSITIONAL_TOKEN_UNSUPPORTED' },
    });
    expect(JSON.stringify(rejected)).not.toContain(SECRET);

    const accepted = await run(
      'auth.set-token',
      { legacyValue: SECRET },
      { mode: 'human' }
    );
    expect(accepted).toMatchObject({
      status: 'completed',
      result: {
        warnings: [{ code: 'CLI_DEPRECATED' }],
        data: { contextName: 'production', saved: true },
      },
    });
    expect(JSON.stringify(accepted)).not.toContain(SECRET);
  });

  it('accepts adapter-injected stdin and requires confirmation for logout', async () => {
    createContext('production', 'https://api.example.com/graphql', store, NOW);
    const saved = await run('auth.set-token', {
      contextName: 'production',
      stdinValue: SECRET,
    });
    expect(saved.status).toBe('completed');

    const ambiguous = await run(
      'auth.set-token',
      {
        contextName: 'production',
        stdinValue: 'stdin-secret',
        environmentValue: 'environment-secret',
      },
      { env: { CNC_TOKEN: 'environment-secret' } }
    );
    expect(ambiguous).toMatchObject({
      status: 'failed',
      error: { code: 'TOKEN_SOURCE_AMBIGUOUS' },
    });
    expect(JSON.stringify(ambiguous)).not.toContain('stdin-secret');
    expect(JSON.stringify(ambiguous)).not.toContain('environment-secret');

    const refused = await run('auth.logout', { contextName: 'production' });
    expect(refused).toMatchObject({
      status: 'failed',
      error: { code: 'CLI_CONFIRMATION_REQUIRED' },
    });
    const removed = await run(
      'auth.logout',
      { contextName: 'production' },
      { yes: true }
    );
    expect(removed).toMatchObject({
      status: 'completed',
      result: { data: { contextName: 'production', removed: true } },
    });
    expect(JSON.stringify({ saved, removed })).not.toContain(SECRET);
  });

  it('restores human auth context selection without weakening explicit agent targeting', async () => {
    createContext('alpha', 'https://alpha.example.com/graphql', store, NOW);
    createContext('beta', 'https://beta.example.com/graphql', store, NOW);
    const prompt = jest.fn(
      async (
        input: Record<string, unknown>,
        questions: Array<{ name: string; options?: string[] }>
      ) => {
        const question = questions[0];
        if (question.name === 'contextName') {
          expect(question.options).toEqual(['alpha', 'beta']);
          return { ...input, contextName: 'beta' };
        }
        if (question.name === 'stdinValue') {
          return { ...input, stdinValue: SECRET };
        }
        throw new Error(`Unexpected prompt: ${question.name}`);
      }
    );
    const hooks = createCncRegistry({ version: 'test', store }).createHooks({
      prompt,
    } as never);
    const hookContext = {
      cwd,
      env: {},
      signal: new AbortController().signal,
      operationId: 'interactive-input',
    };

    const collected = await hooks['auth.set-token']?.collectInteractiveInput?.(
      {},
      hookContext
    );
    expect(collected).toMatchObject({
      contextName: 'beta',
      stdinValue: SECRET,
    });
    expect(prompt.mock.calls.map(([, questions]) => questions[0].name)).toEqual(
      ['contextName', 'stdinValue']
    );

    const saved = await run('auth.set-token', collected, { mode: 'human' });
    expect(saved).toMatchObject({
      status: 'completed',
      result: { data: { contextName: 'beta', saved: true } },
    });

    prompt.mockClear();
    const legacyCollected = await hooks[
      'auth.set-token'
    ]?.collectInteractiveInput?.({ legacyValue: SECRET }, hookContext);
    expect(legacyCollected).toEqual({
      contextName: 'beta',
      legacyValue: SECRET,
    });
    expect(prompt.mock.calls.map(([, questions]) => questions[0].name)).toEqual(
      ['contextName']
    );

    prompt.mockClear();
    const logoutInput = await hooks['auth.logout']?.collectInteractiveInput?.(
      {},
      hookContext
    );
    expect(logoutInput).toEqual({ contextName: 'beta' });
    expect(prompt.mock.calls[0]?.[1][0]).toMatchObject({
      type: 'autocomplete',
      name: 'contextName',
    });
  });

  it('fails human auth collection before requesting a token when no context exists', async () => {
    const prompt = jest.fn();
    const hooks = createCncRegistry({ version: 'test', store }).createHooks({
      prompt,
    } as never);

    await expect(
      hooks['auth.set-token']?.collectInteractiveInput?.(
        {},
        {
          cwd,
          env: {},
          signal: new AbortController().signal,
          operationId: 'interactive-input',
        }
      )
    ).rejects.toMatchObject({ code: 'CONTEXT_REQUIRED' });
    expect(prompt).not.toHaveBeenCalled();
  });
});
