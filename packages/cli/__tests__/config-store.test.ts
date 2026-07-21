import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'node:child_process';
import {
  ConfigStore,
  ConfigStoreError,
  createContext,
  createContextAndMaybeActivate,
  deleteContext,
  getConfigDirForEnvironment,
  resolveContext,
  resolveToken,
  setContextCredentials,
  setCurrentContext,
  redactSecrets,
  validateContextName,
  validateEndpoint,
} from '../src/config';

const NOW = new Date('2026-07-20T00:00:00.000Z');
const REAL_TMP_DIR = fs.realpathSync(os.tmpdir());

describe('ConfigStore', () => {
  let root: string;
  let store: ConfigStore;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-config-test-'));
    store = new ConfigStore({ configDir: root, lockTimeoutMs: 50 });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('validates context names and endpoints before touching disk', () => {
    expect(validateContextName('production.us-1')).toBe('production.us-1');
    expect(() => validateContextName('../production')).toThrow(
      expect.objectContaining({ code: 'CONTEXT_NAME_INVALID' })
    );
    expect(validateEndpoint('https://api.example.com/graphql?tenant=1')).toBe(
      'https://api.example.com/graphql?tenant=1'
    );
    expect(() => validateEndpoint('file:///tmp/graphql')).toThrow(
      expect.objectContaining({ code: 'CONTEXT_ENDPOINT_INVALID' })
    );
    expect(() =>
      validateEndpoint('https://secret@example.com/graphql')
    ).toThrow(expect.objectContaining({ code: 'CONTEXT_ENDPOINT_INVALID' }));
    expect(() => validateEndpoint(' https://api.example.com/graphql')).toThrow(
      expect.objectContaining({ code: 'CONTEXT_ENDPOINT_INVALID' })
    );
  });

  it('resolves state only from an explicit environment snapshot', () => {
    expect(() => getConfigDirForEnvironment({})).toThrow(
      expect.objectContaining({ code: 'CONFIG_BASE_DIRECTORY_REQUIRED' })
    );
    expect(getConfigDirForEnvironment({ HOME: root })).toBe(
      path.join(root, '.cnc', 'config')
    );
  });

  it('rejects secret-bearing endpoint query keys without echoing their values', () => {
    const secret = 'must-never-appear';
    const sensitiveKeys = [
      'token',
      'access_token',
      'refreshToken',
      'api_key',
      'api%5Fkey',
      'x-api-key',
      'client-secret',
      'password',
      'authorization',
      'credential',
      'X-Amz-Signature',
    ];

    for (const key of sensitiveKeys) {
      const endpoint = `https://api.example.com/graphql?${key}=${secret}`;
      let failure: unknown;
      try {
        validateEndpoint(endpoint);
      } catch (error) {
        failure = error;
      }
      expect(failure).toEqual(
        expect.objectContaining({ code: 'CONTEXT_ENDPOINT_INVALID' })
      );
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect((failure as Error).message).not.toContain(endpoint);
    }

    expect(
      validateEndpoint(
        'https://api.example.com/graphql?tenant=acme&region=us-east-1'
      )
    ).toBe('https://api.example.com/graphql?tenant=acme&region=us-east-1');
  });

  it('writes versioned state with restrictive permissions', () => {
    createContext('production', 'https://api.example.com/graphql', store, NOW);
    const state = store.read();

    expect(state).toMatchObject({
      stateVersion: 1,
      contexts: {
        production: {
          name: 'production',
          endpoint: 'https://api.example.com/graphql',
          createdAt: NOW.toISOString(),
        },
      },
    });
    expect(fs.statSync(store.statePath).mode & 0o777).toBe(0o600);
    expect(fs.statSync(root).mode & 0o777).toBe(0o700);
  });

  it('migrates legacy files on first mutation and keeps a backup', () => {
    fs.mkdirSync(path.join(root, 'contexts'));
    fs.writeFileSync(
      path.join(root, 'settings.json'),
      JSON.stringify({ currentContext: 'legacy' })
    );
    fs.writeFileSync(
      path.join(root, 'credentials.json'),
      JSON.stringify({ tokens: { legacy: { token: 'secret-token' } } })
    );
    fs.writeFileSync(
      path.join(root, 'contexts', 'legacy.json'),
      JSON.stringify({
        name: 'legacy',
        endpoint: 'http://localhost:3000/graphql',
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      })
    );

    expect(store.read().settings.currentContext).toBe('legacy');
    createContext('next', 'https://next.example.com/graphql', store, NOW);

    expect(fs.existsSync(store.statePath)).toBe(true);
    const backups = fs
      .readdirSync(root)
      .filter((entry) => entry.startsWith('legacy-backup-'));
    expect(backups).toHaveLength(1);
    expect(
      fs.existsSync(path.join(root, backups[0], 'contexts', 'legacy.json'))
    ).toBe(true);
  });

  it('atomically removes context credentials and active selection', () => {
    createContext('production', 'https://api.example.com/graphql', store, NOW);
    setCurrentContext('production', store);
    setContextCredentials('production', 'secret-token', undefined, store);

    expect(deleteContext('production', store)).toBe(true);
    expect(store.read()).toEqual({
      stateVersion: 1,
      settings: {},
      contexts: {},
      credentials: { tokens: {} },
    });
  });

  it('creates and activates the first context in one state commit', () => {
    expect(
      createContextAndMaybeActivate(
        'first',
        'https://first.example.com/graphql',
        store,
        NOW
      )
    ).toMatchObject({ context: { name: 'first' }, activated: true });
    expect(
      createContextAndMaybeActivate(
        'second',
        'https://second.example.com/graphql',
        store,
        NOW
      )
    ).toMatchObject({ context: { name: 'second' }, activated: false });
    expect(store.read().settings.currentContext).toBe('first');
  });

  it('refuses corrupt and newer state instead of silently resetting it', () => {
    fs.writeFileSync(store.statePath, '{bad json');
    expect(() => store.read()).toThrow(
      expect.objectContaining({ code: 'CONFIG_INVALID' })
    );

    fs.writeFileSync(store.statePath, JSON.stringify({ stateVersion: 99 }));
    expect(() => store.read()).toThrow(
      expect.objectContaining({ code: 'CONFIG_VERSION_UNSUPPORTED' })
    );

    fs.writeFileSync(
      store.statePath,
      JSON.stringify({
        stateVersion: 1,
        settings: {},
        contexts: {},
        credentials: { tokens: { missing: { token: 'orphaned' } } },
      })
    );
    expect(() => store.read()).toThrow(
      expect.objectContaining({ code: 'CONFIG_INVALID' })
    );
  });

  it('refuses symlinked state and bounded lock contention', () => {
    const target = path.join(root, 'target.json');
    fs.writeFileSync(target, JSON.stringify({}));
    fs.symlinkSync(target, store.statePath);
    expect(() => store.read()).toThrow(
      expect.objectContaining({ code: 'CONFIG_SYMLINK_REJECTED' })
    );
    fs.unlinkSync(store.statePath);

    fs.writeFileSync(path.join(root, 'state.lock'), 'locked');
    expect(() =>
      store.mutate((state) => {
        state.settings = {};
      })
    ).toThrow(expect.objectContaining({ code: 'CONFIG_LOCK_TIMEOUT' }));
  });

  it('reclaims only stale locks whose owning process is dead', () => {
    const staleStore = new ConfigStore({
      configDir: root,
      lockTimeoutMs: 50,
      staleLockMs: 10,
    });
    const lock = path.join(root, 'state.lock');
    const writeOwner = (pid: number, token: string) => {
      fs.mkdirSync(lock);
      fs.writeFileSync(
        path.join(lock, 'owner.json'),
        JSON.stringify({
          token,
          pid,
          hostname: os.hostname(),
          createdAt: Date.now() - 1_000,
        })
      );
    };

    writeOwner(process.pid, 'live-owner');
    expect(() =>
      createContext(
        'blocked',
        'https://api.example.com/graphql',
        staleStore,
        NOW
      )
    ).toThrow(expect.objectContaining({ code: 'CONFIG_LOCK_TIMEOUT' }));
    fs.rmSync(lock, { recursive: true });

    writeOwner(2_147_483_647, 'dead-owner');
    createContext(
      'recovered',
      'https://api.example.com/graphql',
      staleStore,
      NOW
    );
    expect(staleStore.read().contexts.recovered).toBeDefined();
  });

  it('refuses a symlink in an existing config directory ancestor', () => {
    const boundary = fs.mkdtempSync(
      path.join(REAL_TMP_DIR, 'cnc-config-ancestor-')
    );
    const target = path.join(boundary, 'real-parent');
    const linkedParent = path.join(boundary, 'linked-parent');
    fs.mkdirSync(target);
    fs.symlinkSync(target, linkedParent, 'dir');

    try {
      expect(() => new ConfigStore({ configDir: linkedParent }).read()).toThrow(
        expect.objectContaining({ code: 'CONFIG_SYMLINK_REJECTED' })
      );
      const nestedStore = new ConfigStore({
        configDir: path.join(linkedParent, 'nested', 'config'),
      });
      expect(() => nestedStore.read()).toThrow(
        expect.objectContaining({ code: 'CONFIG_SYMLINK_REJECTED' })
      );
      expect(fs.existsSync(path.join(target, 'nested'))).toBe(false);
    } finally {
      fs.rmSync(boundary, { recursive: true, force: true });
    }
  });

  it('supports ordinary nested config directory ancestors', () => {
    const boundary = fs.mkdtempSync(
      path.join(REAL_TMP_DIR, 'cnc-config-nested-')
    );
    const nestedConfigDir = path.join(boundary, 'one', 'two', 'config');
    const nestedStore = new ConfigStore({ configDir: nestedConfigDir });

    try {
      expect(nestedStore.read()).toEqual({
        stateVersion: 1,
        settings: {},
        contexts: {},
        credentials: { tokens: {} },
      });
      createContext(
        'nested',
        'https://api.example.com/graphql?tenant=acme',
        nestedStore,
        NOW
      );
      expect(nestedStore.read().contexts.nested.endpoint).toBe(
        'https://api.example.com/graphql?tenant=acme'
      );
    } finally {
      fs.rmSync(boundary, { recursive: true, force: true });
    }
  });

  it('serializes context and credential writes across processes', async () => {
    const configModule = require.resolve('../dist/config');
    const workers = Array.from({ length: 6 }, (_, index) => {
      const contextName = `worker-${index}`;
      const script = `
        const {
          ConfigStore,
          createContext,
          setContextCredentials,
        } = require(${JSON.stringify(configModule)});
        const store = new ConfigStore({
          configDir: ${JSON.stringify(root)},
          lockTimeoutMs: 5000,
        });
        createContext(
          ${JSON.stringify(contextName)},
          ${JSON.stringify(`https://api.example.com/graphql?worker=${index}`)},
          store,
          new Date(${JSON.stringify(NOW.toISOString())}),
        );
        setContextCredentials(
          ${JSON.stringify(contextName)},
          ${JSON.stringify(`secret-${index}`)},
          undefined,
          store,
        );
      `;

      return new Promise<void>((resolveWorker, rejectWorker) => {
        const child = spawn(process.execPath, ['-e', script], {
          cwd: path.resolve(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
        });
        child.once('error', rejectWorker);
        child.once('exit', (code, signal) => {
          if (code === 0) {
            resolveWorker();
            return;
          }
          rejectWorker(
            new Error(
              `State worker exited with ${code ?? signal}: ${stderr.trim()}`
            )
          );
        });
      });
    });

    await Promise.all(workers);
    const state = store.read();
    expect(Object.keys(state.contexts).sort()).toEqual(
      Array.from({ length: 6 }, (_, index) => `worker-${index}`)
    );
    expect(Object.keys(state.credentials.tokens).sort()).toEqual(
      Array.from({ length: 6 }, (_, index) => `worker-${index}`)
    );
  });
});

describe('configuration resolution and redaction', () => {
  let root: string;
  let store: ConfigStore;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(REAL_TMP_DIR, 'cnc-resolution-test-'));
    store = new ConfigStore({ configDir: root });
    createContext('current', 'https://current.example.com/graphql', store, NOW);
    createContext('environment', 'https://env.example.com/graphql', store, NOW);
    createContext('argument', 'https://arg.example.com/graphql', store, NOW);
    setCurrentContext('current', store);
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('resolves argument before CNC_CONTEXT and disables global fallback for agents', () => {
    expect(
      resolveContext({
        contextName: 'argument',
        env: { CNC_CONTEXT: 'environment' },
        allowCurrentContext: false,
        store,
      })
    ).toMatchObject({ source: 'argument', context: { name: 'argument' } });
    expect(
      resolveContext({ env: { CNC_CONTEXT: 'environment' }, store })
    ).toMatchObject({
      source: 'environment',
      context: { name: 'environment' },
    });
    expect(() => resolveContext({ allowCurrentContext: false, store })).toThrow(
      expect.objectContaining({ code: 'CONTEXT_REQUIRED' })
    );
  });

  it('rejects ambiguous token sources and recursively redacts secret fields', () => {
    expect(resolveToken({ env: { CNC_TOKEN: 'from-env' } })).toEqual({
      token: 'from-env',
      source: 'environment',
    });
    expect(() =>
      resolveToken({ stdinToken: 'stdin', env: { CNC_TOKEN: 'env' } })
    ).toThrow(expect.objectContaining({ code: 'TOKEN_SOURCE_AMBIGUOUS' }));
    expect(
      redactSecrets({
        token: 'one',
        nested: { Authorization: 'Bearer two', safe: 'visible' },
      })
    ).toEqual({
      token: '[REDACTED]',
      nested: { Authorization: '[REDACTED]', safe: 'visible' },
    });
  });
});
